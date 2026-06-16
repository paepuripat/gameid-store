/// <reference types="@cloudflare/workers-types" />
import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { createDb } from "./db";
import { products, orders } from "./db/schema";

interface SlipOKResponse {
  success: boolean;
  code?: number;
  message?: string;
  data?: {
    success?: boolean;
    transRef?: string;
    amount?: number;
  };
}

// CP3 response — credential field added in CP4
type VerifySlipResponse =
  | { ok: true }
  | { ok: false; reason: string; message: string };

type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  SLIPOK_API_KEY: string;
  SLIPOK_BRANCH_ID: string;
};

const api = new Hono<{ Bindings: Env }>();

api.get("/api/products", async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db.select().from(products).where(eq(products.active, 1));
  return c.json(rows);
});

api.get("/api/products/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.active, 1)))
    .limit(1);
  if (rows.length === 0) {
    return c.json({ error: "not_found" }, 404);
  }
  return c.json(rows[0]);
});

api.post("/api/orders", async (c) => {
  const body = await c.req.json<{ productId: string }>();
  const { productId } = body;
  if (!productId) {
    return c.json({ error: "productId required" }, 400);
  }

  const db = createDb(c.env.DB);
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.active, 1)))
    .limit(1);
  if (rows.length === 0) {
    return c.json({ error: "not_found" }, 404);
  }

  const product = rows[0];
  const orderId = crypto.randomUUID();
  await db.insert(orders).values({
    id: orderId,
    productId: product.id,
    amount: product.price,
    status: "pending",
    createdAt: Date.now(),
  });

  return c.json({ orderId, amount: product.price, productId: product.id }, 201);
});

api.post("/api/verify-slip", async (c) => {
  const form = await c.req.formData();
  const orderId = form.get("orderId") as string | null;
  const slip = form.get("slip") as File | null;

  if (!orderId || !slip) {
    return c.json<VerifySlipResponse>(
      { ok: false, reason: "invalid_slip", message: "กรุณาระบุ orderId และแนบสลิป" },
      400,
    );
  }

  const db = createDb(c.env.DB);
  const orderRows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (orderRows.length === 0) {
    return c.json<VerifySlipResponse>(
      { ok: false, reason: "invalid_slip", message: "ไม่พบออเดอร์นี้" },
      404,
    );
  }
  const order = orderRows[0];
  if (order.status !== "pending") {
    return c.json<VerifySlipResponse>({
      ok: false,
      reason: "duplicate_slip",
      message: "ออเดอร์นี้ชำระเงินแล้ว",
    });
  }

  const slipForm = new FormData();
  slipForm.append("files", slip);
  slipForm.append("amount", String(order.amount));
  slipForm.append("log", "true");

  const slipRes = await fetch(
    `https://api.slipok.com/api/line/apikey/${c.env.SLIPOK_BRANCH_ID}`,
    {
      method: "POST",
      headers: { "x-authorization": c.env.SLIPOK_API_KEY },
      body: slipForm,
    },
  );

  const result = (await slipRes.json()) as SlipOKResponse;

  if (!result.success) {
    const code = result.code;
    if (code === 1012) {
      return c.json<VerifySlipResponse>({
        ok: false,
        reason: "duplicate_slip",
        message: "สลิปนี้ถูกใช้ไปแล้ว",
      });
    }
    if (code === 1013) {
      return c.json<VerifySlipResponse>({
        ok: false,
        reason: "wrong_amount",
        message: "ยอดเงินในสลิปไม่ตรงกับที่ต้องชำระ",
      });
    }
    if (code === 1014) {
      return c.json<VerifySlipResponse>({
        ok: false,
        reason: "wrong_receiver",
        message: "ปลายทางการโอนไม่ถูกต้อง",
      });
    }
    return c.json<VerifySlipResponse>({
      ok: false,
      reason: "invalid_slip",
      message: result.message ?? "สลิปไม่ถูกต้อง",
    });
  }

  // Slip verified — credential claiming added in CP4
  return c.json<VerifySlipResponse>({ ok: true });
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return api.fetch(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
};
