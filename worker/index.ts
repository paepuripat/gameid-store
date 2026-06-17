/// <reference types="@cloudflare/workers-types" />
import { Hono } from "hono";
import { eq, and, sql, desc } from "drizzle-orm";
import { createDb } from "./db";
import { products, inventory, orders } from "./db/schema";
import type { VerifyResult } from "../src/types";
import { sendCredentialEmail } from "./email";
import { createAuth, type Auth } from "./auth";

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
  RESEND_API_KEY: string;
  RESEND_FROM: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

type Variables = { auth: Auth };

type CredRow = { username: string; password: string; notes: string | null };

const api = new Hono<{ Bindings: Env; Variables: Variables }>();

// Per-request middleware: create auth instance (never a singleton)
api.use("*", async (c, next) => {
  const db = createDb(c.env.DB);
  c.set("auth", createAuth(c.env, db));
  await next();
});

// Better Auth handles all /api/auth/* routes
api.on(["GET", "POST"], "/api/auth/*", (c) => c.get("auth").handler(c.req.raw));

// Protect all /api/admin/* routes — return 401 if no valid session
api.use("/api/admin/*", async (c, next) => {
  const session = await c.get("auth").api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  await next();
});

api.get("/api/products", async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      imageUrl: products.imageUrl,
      price: products.price,
      active: products.active,
      stockCount: sql<number>`count(${inventory.id})`,
    })
    .from(products)
    .innerJoin(
      inventory,
      and(eq(inventory.productId, products.id), eq(inventory.status, "available")),
    )
    .where(eq(products.active, 1))
    .groupBy(products.id);
  return c.json(rows);
});

api.get("/api/products/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      imageUrl: products.imageUrl,
      price: products.price,
      active: products.active,
      stockCount: sql<number>`count(${inventory.id})`,
    })
    .from(products)
    .leftJoin(
      inventory,
      and(eq(inventory.productId, products.id), eq(inventory.status, "available")),
    )
    .where(and(eq(products.id, id), eq(products.active, 1)))
    .groupBy(products.id)
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

  const cred = credRows[0];
  let emailDelivered = false;

  if (email) {
    // Look up product name for the email subject/body
    const productRows = await db
      .select({ name: products.name })
      .from(products)
      .where(eq(products.id, order.productId))
      .limit(1);
    const productName = productRows[0]?.name ?? order.productId;

    try {
      await sendCredentialEmail(c.env, { to: email, productName, credential: cred });
      await c.env.DB.prepare(
        "UPDATE orders SET status = 'delivered', delivered_at = ? WHERE id = ?",
      )
        .bind(Date.now(), orderId)
        .run();
      emailDelivered = true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await c.env.DB.prepare("UPDATE orders SET delivery_error = ? WHERE id = ?")
        .bind(errMsg, orderId)
        .run();
    }
  }

  return c.json<VerifyResult>({ ok: true, credential: cred, emailDelivered });
});


api.post("/api/orders/:id/resend", async (c) => {
  const orderId = c.req.param("id");
  const body = (await c.req.json<{ email?: string }>().catch(() => ({}))) as { email?: string };

  const db = createDb(c.env.DB);

  const orderRows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (orderRows.length === 0) {
    return c.json({ ok: false, message: "ไม่พบออเดอร์นี้" }, 404);
  }
  const order = orderRows[0];

  if (order.status !== "paid" && order.status !== "delivered") {
    return c.json({ ok: false, message: "ออเดอร์นี้ยังไม่ได้ชำระเงิน" }, 400);
  }

  const to = body.email ?? order.email;
  if (!to) {
    return c.json({ ok: false, message: "ไม่พบอีเมลสำหรับส่ง กรุณาระบุอีเมล" }, 400);
  }

  // Load the already-claimed credential — must NOT claim a new one
  const credRows = await db
    .select({ username: inventory.username, password: inventory.password, notes: inventory.notes })
    .from(inventory)
    .where(eq(inventory.orderId, orderId))
    .limit(1);

  if (credRows.length === 0) {
    return c.json({ ok: false, message: "ไม่พบข้อมูลบัญชีที่ถูกจองไว้" }, 404);
  }

  const productRows = await db
    .select({ name: products.name })
    .from(products)
    .where(eq(products.id, order.productId))
    .limit(1);
  const productName = productRows[0]?.name ?? order.productId;

  try {
    await sendCredentialEmail(c.env, { to, productName, credential: credRows[0] });
    await c.env.DB.prepare(
      "UPDATE orders SET status = 'delivered', delivered_at = ? WHERE id = ?",
    )
      .bind(Date.now(), orderId)
      .run();
    return c.json({ ok: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await c.env.DB.prepare("UPDATE orders SET delivery_error = ? WHERE id = ?")
      .bind(errMsg, orderId)
      .run();
    return c.json({ ok: false, message: "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่" }, 500);
  }
});

// ── Admin: Products (CP3) ────────────────────────────────────────────────────

api.get("/api/admin/products", async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      imageUrl: products.imageUrl,
      price: products.price,
      active: products.active,
      stockCount: sql<number>`count(case when ${inventory.status} = 'available' then 1 end)`,
    })
    .from(products)
    .leftJoin(inventory, eq(inventory.productId, products.id))
    .groupBy(products.id);
  return c.json(rows);
});

api.post("/api/admin/products", async (c) => {
  const body = await c.req.json<{ name: string; description?: string; imageUrl?: string; price: number }>();
  if (!body.name || body.price == null) return c.json({ error: "name and price required" }, 400);
  const db = createDb(c.env.DB);
  const id = crypto.randomUUID();
  await db.insert(products).values({
    id,
    name: body.name,
    description: body.description ?? null,
    imageUrl: body.imageUrl ?? null,
    price: body.price,
    active: 1,
  });
  return c.json({ id }, 201);
});

api.patch("/api/admin/products/:id", async (c) => {
  const productId = c.req.param("id");
  const body = await c.req.json<Partial<{ name: string; description: string | null; imageUrl: string | null; price: number; active: number }>>();
  const db = createDb(c.env.DB);
  await db.update(products).set(body).where(eq(products.id, productId));
  return c.json({ ok: true });
});

// ── Admin: Inventory / Stock (CP4) ───────────────────────────────────────────

api.get("/api/admin/products/:id/stock", async (c) => {
  const productId = c.req.param("id");
  const db = createDb(c.env.DB);
  const productRows = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (productRows.length === 0) return c.json({ error: "not_found" }, 404);
  const items = await db
    .select({ id: inventory.id, username: inventory.username, status: inventory.status })
    .from(inventory)
    .where(eq(inventory.productId, productId));
  const available = items.filter((i) => i.status === "available").length;
  const sold = items.filter((i) => i.status === "sold").length;
  return c.json({ product: productRows[0], available, sold, items });
});

api.post("/api/admin/products/:id/stock", async (c) => {
  const productId = c.req.param("id");
  const body = await c.req.json<{ lines: string }>();
  const parsed = (body.lines ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [u, p, ...rest] = line.split(",");
      return { username: u?.trim() ?? "", password: p?.trim() ?? "", notes: rest.join(",").trim() || null };
    })
    .filter((r) => r.username && r.password);
  if (parsed.length === 0) return c.json({ error: "no valid rows" }, 400);
  const db = createDb(c.env.DB);
  await db.insert(inventory).values(
    parsed.map((r) => ({ id: crypto.randomUUID(), productId, ...r, status: "available" as const })),
  );
  return c.json({ added: parsed.length }, 201);
});

// ── Admin: Orders (CP5) ──────────────────────────────────────────────────────

api.get("/api/admin/orders", async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db
    .select({
      id: orders.id,
      productName: products.name,
      amount: orders.amount,
      email: orders.email,
      status: orders.status,
      slipTransRef: orders.slipTransRef,
      createdAt: orders.createdAt,
      deliveredAt: orders.deliveredAt,
      deliveryError: orders.deliveryError,
      claimedUsername: inventory.username,
    })
    .from(orders)
    .leftJoin(products, eq(products.id, orders.productId))
    .leftJoin(inventory, eq(inventory.orderId, orders.id))
    .orderBy(desc(orders.createdAt));
  return c.json(rows);
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
