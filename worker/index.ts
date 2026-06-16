/// <reference types="@cloudflare/workers-types" />
import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { createDb } from "./db";
import { products, orders } from "./db/schema";

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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return api.fetch(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
};
