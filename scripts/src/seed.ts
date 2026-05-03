import { db } from "@workspace/db";
import { productsTable, salesTable, saleItemsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  await db.execute(sql`TRUNCATE sale_items, sales, products RESTART IDENTITY CASCADE`);

  // Seed products
  const products = await db.insert(productsTable).values([
    { name: "Maize Flour 2kg", sku: "MFL-001", category: "Groceries", price: "1.80", stock: 120, lowStockThreshold: 20, unit: "bag" },
    { name: "Sugar 1kg", sku: "SUG-001", category: "Groceries", price: "1.20", stock: 85, lowStockThreshold: 15, unit: "pack" },
    { name: "Cooking Oil 1L", sku: "OIL-001", category: "Groceries", price: "2.50", stock: 60, lowStockThreshold: 10, unit: "bottle" },
    { name: "Rice 5kg", sku: "RIC-001", category: "Groceries", price: "4.00", stock: 45, lowStockThreshold: 10, unit: "bag" },
    { name: "Milk 500ml", sku: "MLK-001", category: "Dairy", price: "0.75", stock: 30, lowStockThreshold: 10, unit: "carton" },
    { name: "Bread Loaf", sku: "BRD-001", category: "Bakery", price: "1.10", stock: 18, lowStockThreshold: 5, unit: "loaf" },
    { name: "Eggs (30 pack)", sku: "EGG-001", category: "Dairy", price: "3.50", stock: 25, lowStockThreshold: 8, unit: "pack" },
    { name: "Tomato Sauce 400g", sku: "TOM-001", category: "Condiments", price: "0.90", stock: 40, lowStockThreshold: 10, unit: "can" },
    { name: "Soap Bar", sku: "SAP-001", category: "Household", price: "0.60", stock: 90, lowStockThreshold: 20, unit: "bar" },
    { name: "Washing Powder 1kg", sku: "WSH-001", category: "Household", price: "2.20", stock: 35, lowStockThreshold: 8, unit: "pack" },
    { name: "Bottled Water 1.5L", sku: "WAT-001", category: "Beverages", price: "0.50", stock: 144, lowStockThreshold: 30, unit: "bottle" },
    { name: "Soft Drink 330ml", sku: "SFT-001", category: "Beverages", price: "0.70", stock: 72, lowStockThreshold: 20, unit: "can" },
    { name: "Tea Bags (50pk)", sku: "TEA-001", category: "Beverages", price: "1.50", stock: 3, lowStockThreshold: 5, unit: "box" },
    { name: "Coffee 200g", sku: "COF-001", category: "Beverages", price: "3.80", stock: 0, lowStockThreshold: 5, unit: "jar" },
    { name: "Biscuits 200g", sku: "BSC-001", category: "Snacks", price: "0.80", stock: 55, lowStockThreshold: 15, unit: "pack" },
    { name: "Chips 100g", sku: "CHP-001", category: "Snacks", price: "0.60", stock: 48, lowStockThreshold: 15, unit: "pack" },
    { name: "Canned Beans 400g", sku: "BNS-001", category: "Groceries", price: "1.00", stock: 28, lowStockThreshold: 10, unit: "can" },
    { name: "Salt 1kg", sku: "SLT-001", category: "Groceries", price: "0.40", stock: 65, lowStockThreshold: 10, unit: "pack" },
    { name: "Matches (box)", sku: "MAT-001", category: "Household", price: "0.20", stock: 200, lowStockThreshold: 30, unit: "box" },
    { name: "Toothpaste 75ml", sku: "TPT-001", category: "Personal Care", price: "1.30", stock: 22, lowStockThreshold: 8, unit: "tube" },
  ]).returning();

  const pMap = new Map(products.map(p => [p.sku, p]));

  // Generate 45 days of sales history (15 this month, 30 previous month)
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const salesData: { daysAgo: number; paymentMethod: string; items: Array<{ sku: string; qty: number }> }[] = [
    // Previous month
    { daysAgo: 45, paymentMethod: "cash", items: [{ sku: "MFL-001", qty: 5 }, { sku: "SUG-001", qty: 3 }, { sku: "OIL-001", qty: 2 }] },
    { daysAgo: 44, paymentMethod: "usdc", items: [{ sku: "RIC-001", qty: 2 }, { sku: "EGG-001", qty: 3 }] },
    { daysAgo: 43, paymentMethod: "cash", items: [{ sku: "BRD-001", qty: 4 }, { sku: "MLK-001", qty: 6 }, { sku: "BSC-001", qty: 5 }] },
    { daysAgo: 42, paymentMethod: "pol", items: [{ sku: "SAP-001", qty: 10 }, { sku: "WSH-001", qty: 4 }] },
    { daysAgo: 41, paymentMethod: "cash", items: [{ sku: "WAT-001", qty: 12 }, { sku: "SFT-001", qty: 8 }, { sku: "CHP-001", qty: 6 }] },
    { daysAgo: 40, paymentMethod: "pduka", items: [{ sku: "MFL-001", qty: 8 }, { sku: "OIL-001", qty: 3 }, { sku: "SLT-001", qty: 5 }] },
    { daysAgo: 39, paymentMethod: "cash", items: [{ sku: "EGG-001", qty: 2 }, { sku: "BRD-001", qty: 3 }, { sku: "MLK-001", qty: 4 }] },
    { daysAgo: 38, paymentMethod: "usdc", items: [{ sku: "RIC-001", qty: 3 }, { sku: "TOM-001", qty: 6 }, { sku: "BNS-001", qty: 4 }] },
    { daysAgo: 37, paymentMethod: "cash", items: [{ sku: "SUG-001", qty: 4 }, { sku: "TEA-001", qty: 2 }, { sku: "COF-001", qty: 1 }] },
    { daysAgo: 36, paymentMethod: "cash", items: [{ sku: "WAT-001", qty: 24 }, { sku: "SFT-001", qty: 12 }] },
    { daysAgo: 35, paymentMethod: "pol", items: [{ sku: "TPT-001", qty: 3 }, { sku: "SAP-001", qty: 8 }, { sku: "MAT-001", qty: 10 }] },
    { daysAgo: 34, paymentMethod: "cash", items: [{ sku: "MFL-001", qty: 6 }, { sku: "RIC-001", qty: 2 }, { sku: "OIL-001", qty: 2 }] },
    { daysAgo: 33, paymentMethod: "usdc", items: [{ sku: "EGG-001", qty: 4 }, { sku: "MLK-001", qty: 8 }, { sku: "BRD-001", qty: 5 }] },
    { daysAgo: 32, paymentMethod: "cash", items: [{ sku: "BSC-001", qty: 8 }, { sku: "CHP-001", qty: 6 }, { sku: "SFT-001", qty: 10 }] },
    { daysAgo: 31, paymentMethod: "pduka", items: [{ sku: "WSH-001", qty: 3 }, { sku: "SAP-001", qty: 12 }, { sku: "MAT-001", qty: 20 }] },
    { daysAgo: 30, paymentMethod: "cash", items: [{ sku: "SUG-001", qty: 5 }, { sku: "TOM-001", qty: 8 }, { sku: "BNS-001", qty: 6 }] },
    { daysAgo: 29, paymentMethod: "usdc", items: [{ sku: "MFL-001", qty: 10 }, { sku: "OIL-001", qty: 4 }, { sku: "RIC-001", qty: 3 }] },
    { daysAgo: 28, paymentMethod: "cash", items: [{ sku: "WAT-001", qty: 18 }, { sku: "SFT-001", qty: 6 }, { sku: "CHP-001", qty: 8 }] },
    // This month
    { daysAgo: 14, paymentMethod: "cash", items: [{ sku: "MFL-001", qty: 4 }, { sku: "SUG-001", qty: 3 }, { sku: "OIL-001", qty: 2 }] },
    { daysAgo: 13, paymentMethod: "usdc", items: [{ sku: "RIC-001", qty: 2 }, { sku: "EGG-001", qty: 2 }, { sku: "MLK-001", qty: 5 }] },
    { daysAgo: 12, paymentMethod: "cash", items: [{ sku: "BRD-001", qty: 3 }, { sku: "BSC-001", qty: 4 }, { sku: "CHP-001", qty: 5 }] },
    { daysAgo: 11, paymentMethod: "pol", items: [{ sku: "WAT-001", qty: 12 }, { sku: "SFT-001", qty: 8 }] },
    { daysAgo: 10, paymentMethod: "cash", items: [{ sku: "SAP-001", qty: 6 }, { sku: "WSH-001", qty: 2 }, { sku: "TPT-001", qty: 3 }] },
    { daysAgo: 9, paymentMethod: "pduka", items: [{ sku: "TOM-001", qty: 5 }, { sku: "BNS-001", qty: 4 }, { sku: "SLT-001", qty: 3 }] },
    { daysAgo: 8, paymentMethod: "cash", items: [{ sku: "MFL-001", qty: 6 }, { sku: "SUG-001", qty: 4 }, { sku: "OIL-001", qty: 3 }] },
    { daysAgo: 7, paymentMethod: "usdc", items: [{ sku: "EGG-001", qty: 3 }, { sku: "MLK-001", qty: 6 }, { sku: "BRD-001", qty: 4 }] },
    { daysAgo: 6, paymentMethod: "cash", items: [{ sku: "WAT-001", qty: 24 }, { sku: "SFT-001", qty: 12 }, { sku: "BSC-001", qty: 6 }] },
    { daysAgo: 5, paymentMethod: "cash", items: [{ sku: "RIC-001", qty: 3 }, { sku: "MFL-001", qty: 5 }, { sku: "TOM-001", qty: 6 }] },
    { daysAgo: 4, paymentMethod: "pol", items: [{ sku: "SAP-001", qty: 8 }, { sku: "MAT-001", qty: 15 }, { sku: "WSH-001", qty: 2 }] },
    { daysAgo: 3, paymentMethod: "cash", items: [{ sku: "OIL-001", qty: 4 }, { sku: "SUG-001", qty: 5 }, { sku: "BNS-001", qty: 5 }] },
    { daysAgo: 2, paymentMethod: "usdc", items: [{ sku: "EGG-001", qty: 4 }, { sku: "MLK-001", qty: 8 }, { sku: "BSC-001", qty: 8 }] },
    // Yesterday
    { daysAgo: 1, paymentMethod: "cash", items: [{ sku: "MFL-001", qty: 3 }, { sku: "SUG-001", qty: 2 }, { sku: "OIL-001", qty: 1 }] },
    { daysAgo: 1, paymentMethod: "pol", items: [{ sku: "WAT-001", qty: 10 }, { sku: "SFT-001", qty: 5 }] },
    { daysAgo: 1, paymentMethod: "cash", items: [{ sku: "BRD-001", qty: 4 }, { sku: "MLK-001", qty: 6 }] },
    // Today
    { daysAgo: 0, paymentMethod: "cash", items: [{ sku: "MFL-001", qty: 4 }, { sku: "OIL-001", qty: 2 }, { sku: "TOM-001", qty: 3 }] },
    { daysAgo: 0, paymentMethod: "usdc", items: [{ sku: "WAT-001", qty: 6 }, { sku: "SFT-001", qty: 4 }, { sku: "CHP-001", qty: 3 }] },
    { daysAgo: 0, paymentMethod: "pduka", items: [{ sku: "EGG-001", qty: 2 }, { sku: "MLK-001", qty: 4 }, { sku: "BRD-001", qty: 3 }] },
  ];

  for (const saleData of salesData) {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - saleData.daysAgo);
    createdAt.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));

    let total = 0;
    const items: { productId: number; productName: string; quantity: number; unitPrice: number; subtotal: number }[] = [];

    for (const item of saleData.items) {
      const product = pMap.get(item.sku);
      if (!product) continue;
      const unitPrice = Number(product.price);
      const subtotal = unitPrice * item.qty;
      total += subtotal;
      items.push({ productId: product.id, productName: product.name, quantity: item.qty, unitPrice, subtotal });
    }

    const [sale] = await db.insert(salesTable).values({
      total: String(total),
      paymentMethod: saleData.paymentMethod,
      pdukaEarned: String(total),
      createdAt,
    }).returning();

    if (items.length > 0) {
      await db.insert(saleItemsTable).values(
        items.map(i => ({
          saleId: sale.id,
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: String(i.unitPrice),
          subtotal: String(i.subtotal),
        }))
      );
    }
  }

  console.log(`Seeded ${products.length} products and ${salesData.length} sales.`);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
