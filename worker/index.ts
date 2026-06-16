/// <reference types="@cloudflare/workers-types" />
import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { createDb } from "./db";
import { products, inventory, orders } from "./db/schema";
import type { VerifyResult } from "../src/types";

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

type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  SLIPOK_API_KEY: string;
  SLIPOK_BRANCH_ID: string;
  SLIPOK_BYPASS?: string;
};

type CredRow = { username: string; password: string; notes: string | null };

const api = new Hono<{ Bindings: Env }>();

api.get("/api/products", async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db
    .selectDistinct({
      id: products.id,
      name: products.name,
      description: products.description,
      imageUrl: products.imageUrl,
      price: products.price,
      active: products.active,
    })
    .from(products)
    .innerJoin(
      inventory,
      and(eq(inventory.productId, products.id), eq(inventory.status, "available")),
    )
    .where(eq(products.active, 1));
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
  const email = form.get("email") as string | null;

  if (!orderId || !slip) {
    return c.json<VerifyResult>(
      { ok: false, reason: "invalid_slip", message: "กรุณาระบุ orderId และแนบสลิป" },
      400,
    );
  }

  const db = createDb(c.env.DB);
  const orderRows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (orderRows.length === 0) {
    return c.json<VerifyResult>(
      { ok: false, reason: "invalid_slip", message: "ไม่พบออเดอร์นี้" },
      404,
    );
  }
  const order = orderRows[0];
  if (order.status !== "pending") {
    return c.json<VerifyResult>({
      ok: false,
      reason: "duplicate_slip",
      message: "ออเดอร์นี้ชำระเงินแล้ว",
    });
  }

  // Determine transRef — bypass mode skips real SlipOK call
  let transRef: string;
  if (c.env.SLIPOK_BYPASS === "true") {
    transRef = `bypass-${crypto.randomUUID()}`;
  } else {
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
        return c.json<VerifyResult>({ ok: false, reason: "duplicate_slip", message: "สลิปนี้ถูกใช้ไปแล้ว" });
      }
      if (code === 1013) {
        return c.json<VerifyResult>({ ok: false, reason: "wrong_amount", message: "ยอดเงินในสลิปไม่ตรงกับที่ต้องชำระ" });
      }
      if (code === 1014) {
        return c.json<VerifyResult>({ ok: false, reason: "wrong_receiver", message: "ปลายทางการโอนไม่ถูกต้อง" });
      }
      return c.json<VerifyResult>({ ok: false, reason: "invalid_slip", message: result.message ?? "สลิปไม่ถูกต้อง" });
    }

    transRef = result.data?.transRef ?? `slipok-${crypto.randomUUID()}`;
  }

  // Atomic: mark order paid + claim one available inventory row
  const batchResults = await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE orders SET status = 'paid', slip_trans_ref = ?, email = ? WHERE id = ?",
    ).bind(transRef, email ?? null, orderId),
    c.env.DB.prepare(`
      UPDATE inventory
      SET status = 'sold', order_id = ?
      WHERE id = (
        SELECT id FROM inventory
        WHERE product_id = ? AND status = 'available'
        LIMIT 1
      )
      RETURNING username, password, notes
    `).bind(orderId, order.productId),
  ]);

  const credRows = batchResults[1].results as CredRow[];
  if (credRows.length === 0) {
    return c.json<VerifyResult>({ ok: false, reason: "sold_out", message: "สินค้าหมดแล้ว" });
  }

  return c.json<VerifyResult>({ ok: true, credential: credRows[0] });
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
