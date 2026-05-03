import { Router, type IRouter } from "express";
import { sql, lte } from "drizzle-orm";
import { db } from "@workspace/db";
import { productsTable, salesTable, saleItemsTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetDailySalesResponse,
  GetMonthlyComparisonResponse,
  GetTopProductsResponse,
  GetStockAlertsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const todayResult = await db.execute(sql`
    SELECT COALESCE(SUM(total::numeric), 0)::float8 as revenue,
           COUNT(*)::int as count,
           COALESCE(SUM(pduka_earned::numeric), 0)::float8 as pduka
    FROM sales WHERE created_at >= ${todayStart.toISOString()}::timestamptz
  `);
  const yesterdayResult = await db.execute(sql`
    SELECT COALESCE(SUM(total::numeric), 0)::float8 as revenue,
           COUNT(*)::int as count
    FROM sales
    WHERE created_at >= ${yesterdayStart.toISOString()}::timestamptz
      AND created_at < ${todayStart.toISOString()}::timestamptz
  `);
  const productResult = await db.execute(sql`
    SELECT COUNT(*)::int as total,
           COUNT(*) FILTER (WHERE stock <= low_stock_threshold AND stock > 0)::int as low,
           COUNT(*) FILTER (WHERE stock = 0)::int as out_of_stock
    FROM products
  `);

  const todayRow = (todayResult.rows ?? (todayResult as unknown as unknown[]))[0] as Record<string, unknown>;
  const yestRow = (yesterdayResult.rows ?? (yesterdayResult as unknown as unknown[]))[0] as Record<string, unknown>;
  const prodRow = (productResult.rows ?? (productResult as unknown as unknown[]))[0] as Record<string, unknown>;

  const todayRevenue = Number(todayRow?.revenue ?? 0);
  const todaySalesCount = Number(todayRow?.count ?? 0);
  const todayPdukaEarned = Number(todayRow?.pduka ?? 0);
  const yesterdayRevenue = Number(yestRow?.revenue ?? 0);
  const yesterdaySalesCount = Number(yestRow?.count ?? 0);

  const revenueChangePercent = yesterdayRevenue === 0
    ? (todayRevenue > 0 ? 100 : 0)
    : ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
  const salesCountChangePercent = yesterdaySalesCount === 0
    ? (todaySalesCount > 0 ? 100 : 0)
    : ((todaySalesCount - yesterdaySalesCount) / yesterdaySalesCount) * 100;

  res.json(GetDashboardSummaryResponse.parse({
    todayRevenue,
    todaySalesCount,
    todayPdukaEarned,
    yesterdayRevenue,
    yesterdaySalesCount,
    revenueChangePercent,
    salesCountChangePercent,
    totalProducts: Number(prodRow?.total ?? 0),
    lowStockCount: Number(prodRow?.low ?? 0),
    outOfStockCount: Number(prodRow?.out_of_stock ?? 0),
  }));
});

router.get("/dashboard/daily-sales", async (_req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      DATE(created_at AT TIME ZONE 'UTC')::text as date,
      COALESCE(SUM(total::numeric), 0)::float8 as revenue,
      COUNT(*)::int as sales_count
    FROM sales
    WHERE created_at >= DATE_TRUNC('month', NOW())
    GROUP BY DATE(created_at AT TIME ZONE 'UTC')
    ORDER BY date
  `);

  const rows = (result.rows ?? (result as unknown as unknown[])) as Array<Record<string, unknown>>;

  res.json(GetDailySalesResponse.parse(
    rows.map(r => ({
      date: String(r.date),
      revenue: Number(r.revenue),
      salesCount: Number(r.sales_count),
    }))
  ));
});

router.get("/dashboard/monthly-comparison", async (_req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('month', NOW()), 'YYYY-MM') as current_month,
      COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN total::numeric ELSE 0 END), 0)::float8 as current_revenue,
      COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END)::int as current_count,
      TO_CHAR(DATE_TRUNC('month', NOW()) - INTERVAL '1 month', 'YYYY-MM') as previous_month,
      COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' AND created_at < DATE_TRUNC('month', NOW()) THEN total::numeric ELSE 0 END), 0)::float8 as previous_revenue,
      COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' AND created_at < DATE_TRUNC('month', NOW()) THEN 1 END)::int as previous_count
    FROM sales
  `);

  const rows = (result.rows ?? (result as unknown as unknown[])) as Array<Record<string, unknown>>;
  const r = rows[0] ?? {};

  const currentRevenue = Number(r.current_revenue ?? 0);
  const previousRevenue = Number(r.previous_revenue ?? 0);
  const currentSalesCount = Number(r.current_count ?? 0);
  const previousSalesCount = Number(r.previous_count ?? 0);
  const revenueChangePercent = previousRevenue === 0
    ? (currentRevenue > 0 ? 100 : 0)
    : ((currentRevenue - previousRevenue) / previousRevenue) * 100;
  const salesCountChangePercent = previousSalesCount === 0
    ? (currentSalesCount > 0 ? 100 : 0)
    : ((currentSalesCount - previousSalesCount) / previousSalesCount) * 100;

  res.json(GetMonthlyComparisonResponse.parse({
    currentMonth: String(r.current_month ?? ''),
    currentRevenue,
    currentSalesCount,
    previousMonth: String(r.previous_month ?? ''),
    previousRevenue,
    previousSalesCount,
    revenueChangePercent,
    salesCountChangePercent,
  }));
});

router.get("/dashboard/top-products", async (_req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      si.product_id::int as product_id,
      si.product_name as name,
      SUM(si.subtotal::numeric)::float8 as total_revenue,
      SUM(si.quantity)::int as total_quantity
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.created_at >= DATE_TRUNC('month', NOW())
    GROUP BY si.product_id, si.product_name
    ORDER BY total_revenue DESC
    LIMIT 10
  `);

  const rows = (result.rows ?? (result as unknown as unknown[])) as Array<Record<string, unknown>>;

  res.json(GetTopProductsResponse.parse(
    rows.map(r => ({
      productId: Number(r.product_id),
      name: String(r.name),
      totalRevenue: Number(r.total_revenue),
      totalQuantity: Number(r.total_quantity),
    }))
  ));
});

router.get("/dashboard/stock-alerts", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      sku: productsTable.sku,
      stock: productsTable.stock,
      lowStockThreshold: productsTable.lowStockThreshold,
    })
    .from(productsTable)
    .where(lte(productsTable.stock, productsTable.lowStockThreshold))
    .orderBy(productsTable.stock);

  res.json(GetStockAlertsResponse.parse(
    rows.map(r => ({
      ...r,
      status: r.stock === 0 ? "out_of_stock" : "low",
    }))
  ));
});

export default router;
