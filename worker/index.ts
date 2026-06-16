/// <reference types="@cloudflare/workers-types" />
import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { createDb } from "./db";
import { products } from "./db/schema";

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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return api.fetch(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
};
