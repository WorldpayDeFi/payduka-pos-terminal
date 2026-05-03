import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // cash | card | usdc | pol | pduka
  customerName: text("customer_name"),
  pdukaEarned: numeric("pduka_earned", { precision: 18, scale: 6 }).notNull().default("0"),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const saleItemsTable = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull().references(() => salesTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
});

export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, createdAt: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;

export const insertSaleItemSchema = createInsertSchema(saleItemsTable).omit({ id: true });
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type SaleItem = typeof saleItemsTable.$inferSelect;
