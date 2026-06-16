import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  price: real("price").notNull(),
  active: integer("active").notNull().default(1),
});

export const inventory = sqliteTable("inventory", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  username: text("username").notNull(),
  password: text("password").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("available"),
  orderId: text("order_id"),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  amount: real("amount").notNull(),
  email: text("email"),
  status: text("status").notNull().default("pending"),
  slipTransRef: text("slip_trans_ref").unique(),
  createdAt: integer("created_at").notNull(),
});
