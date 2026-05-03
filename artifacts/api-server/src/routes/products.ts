import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import {
  CreateProductBody,
  GetProductParams,
  GetProductResponse,
  UpdateProductParams,
  UpdateProductBody,
  UpdateProductResponse,
  DeleteProductParams,
  ListProductsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", async (_req, res): Promise<void> => {
  const rows = await db.select().from(productsTable).orderBy(productsTable.name);
  res.json(ListProductsResponse.parse(rows.map(r => ({ ...r, price: Number(r.price), imageUrl: r.imageUrl ?? null }))));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(productsTable).values({ ...parsed.data, price: String(parsed.data.price) }).returning();
  res.status(201).json(GetProductResponse.parse({ ...row, price: Number(row.price), imageUrl: row.imageUrl ?? null }));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(GetProductResponse.parse({ ...row, price: Number(row.price), imageUrl: row.imageUrl ?? null }));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.price !== undefined) {
    updateData.price = String(parsed.data.price);
  }
  const [row] = await db.update(productsTable).set(updateData).where(eq(productsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(UpdateProductResponse.parse({ ...row, price: Number(row.price), imageUrl: row.imageUrl ?? null }));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
