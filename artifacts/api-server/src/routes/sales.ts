import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { productsTable, salesTable, saleItemsTable } from "@workspace/db";
import {
  CreateSaleBody,
  GetSaleParams,
  GetSaleResponse,
  ListSalesResponse,
  ListSalesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const toSaleOut = (sale: typeof salesTable.$inferSelect) => ({
  ...sale,
  total: Number(sale.total),
  pdukaEarned: Number(sale.pdukaEarned),
  customerName: sale.customerName ?? null,
  txHash: sale.txHash ?? null,
});

const toItemOut = (item: typeof saleItemsTable.$inferSelect) => ({
  ...item,
  unitPrice: Number(item.unitPrice),
  subtotal: Number(item.subtotal),
});

router.get("/sales", async (req, res): Promise<void> => {
  const query = ListSalesQueryParams.safeParse(req.query);
  const limit = query.success && query.data.limit ? query.data.limit : 100;
  const rows = await db.select().from(salesTable).orderBy(sql`${salesTable.createdAt} desc`).limit(limit);
  res.json(ListSalesResponse.parse(rows.map(toSaleOut)));
});

router.post("/sales", async (req, res): Promise<void> => {
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { items, paymentMethod, customerName, txHash } = parsed.data;

  // Load products for pricing
  const productIds = items.map(i => i.productId);
  const products = await db.select().from(productsTable).where(sql`${productsTable.id} = ANY(${productIds})`);
  const productMap = new Map(products.map(p => [p.id, p]));

  let total = 0;
  const itemsToInsert: { productId: number; productName: string; quantity: number; unitPrice: number; subtotal: number }[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
    if (product.stock < item.quantity) {
      res.status(400).json({ error: `Insufficient stock for "${product.name}"` });
      return;
    }
    const unitPrice = Number(product.price);
    const subtotal = unitPrice * item.quantity;
    total += subtotal;
    itemsToInsert.push({ productId: item.productId, productName: product.name, quantity: item.quantity, unitPrice, subtotal });
  }

  // PDuka earned: 1 PDUKA per $1 spent (as loyalty reward)
  const pdukaEarned = total;

  const [sale] = await db.insert(salesTable).values({
    total: String(total),
    paymentMethod,
    customerName: customerName ?? null,
    pdukaEarned: String(pdukaEarned),
    txHash: txHash ?? null,
  }).returning();

  // Insert sale items and deduct stock
  const saleItemRows = await db.insert(saleItemsTable).values(
    itemsToInsert.map(i => ({
      saleId: sale.id,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: String(i.unitPrice),
      subtotal: String(i.subtotal),
    }))
  ).returning();

  // Deduct stock
  for (const item of items) {
    await db.update(productsTable)
      .set({ stock: sql`${productsTable.stock} - ${item.quantity}` })
      .where(eq(productsTable.id, item.productId));
  }

  res.status(201).json(GetSaleResponse.parse({
    ...toSaleOut(sale),
    items: saleItemRows.map(toItemOut),
  }));
});

router.get("/sales/:id", async (req, res): Promise<void> => {
  const params = GetSaleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, params.data.id));
  if (!sale) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }
  const saleItems = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, sale.id));
  res.json(GetSaleResponse.parse({ ...toSaleOut(sale), items: saleItems.map(toItemOut) }));
});

export default router;
