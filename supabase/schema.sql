-- PayDuka PoS Terminal — Supabase Schema + Seed Data
-- SAFE RESET: drops everything first, then rebuilds cleanly from scratch

-- ── Clean slate (order matters — children before parents) ────────────────────
DROP TABLE IF EXISTS openai_messages      CASCADE;
DROP TABLE IF EXISTS openai_conversations CASCADE;
DROP TABLE IF EXISTS sale_items           CASCADE;
DROP TABLE IF EXISTS sales                CASCADE;
DROP TABLE IF EXISTS products             CASCADE;
DROP PUBLICATION IF EXISTS powersync;

-- ── Tables ───────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id                  SERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  sku                 TEXT NOT NULL UNIQUE,
  category            TEXT NOT NULL,
  price               NUMERIC(12,2) NOT NULL,
  stock               INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  unit                TEXT NOT NULL DEFAULT 'item',
  image_url           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales (
  id             SERIAL PRIMARY KEY,
  total          NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  customer_name  TEXT,
  pduka_earned   NUMERIC(18,6) NOT NULL DEFAULT 0,
  tx_hash        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sale_items (
  id           SERIAL PRIMARY KEY,
  sale_id      INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity     INTEGER NOT NULL,
  unit_price   NUMERIC(12,2) NOT NULL,
  subtotal     NUMERIC(12,2) NOT NULL
);

CREATE TABLE openai_conversations (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE openai_messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES openai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PowerSync Publication ────────────────────────────────────────────────────
CREATE PUBLICATION powersync FOR TABLE products, sales, sale_items;

-- ── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales                ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE openai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE openai_messages      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "terminal_access" ON products             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "terminal_access" ON sales                FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "terminal_access" ON sale_items           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "terminal_access" ON openai_conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "terminal_access" ON openai_messages      FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_access" ON products             FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_access" ON sales                FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_access" ON sale_items           FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_access" ON openai_conversations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_access" ON openai_messages      FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── Seed: 20 Products ────────────────────────────────────────────────────────
INSERT INTO products (id,name,sku,category,price,stock,low_stock_threshold,unit,created_at,updated_at) VALUES
(1,'Maize Flour 2kg','MFL-001','Groceries',1.80,120,20,'bag','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(2,'Sugar 1kg','SUG-001','Groceries',1.20,85,15,'pack','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(3,'Cooking Oil 1L','OIL-001','Groceries',2.50,60,10,'bottle','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(4,'Rice 5kg','RIC-001','Groceries',4.00,45,10,'bag','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(5,'Milk 500ml','MLK-001','Dairy',0.75,30,10,'carton','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(6,'Bread Loaf','BRD-001','Bakery',1.10,18,5,'loaf','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(7,'Eggs (30 pack)','EGG-001','Dairy',3.50,25,8,'pack','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(8,'Tomato Sauce 400g','TOM-001','Condiments',0.90,40,10,'can','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(9,'Soap Bar','SAP-001','Household',0.60,90,20,'bar','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(10,'Washing Powder 1kg','WSH-001','Household',2.20,35,8,'pack','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(11,'Bottled Water 1.5L','WAT-001','Beverages',0.50,144,30,'bottle','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(12,'Soft Drink 330ml','SFT-001','Beverages',0.70,72,20,'can','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(13,'Tea Bags (50pk)','TEA-001','Beverages',1.50,3,5,'box','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(14,'Coffee 200g','COF-001','Beverages',3.80,0,5,'jar','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(15,'Biscuits 200g','BSC-001','Snacks',0.80,55,15,'pack','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(16,'Chips 100g','CHP-001','Snacks',0.60,48,15,'pack','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(17,'Canned Beans 400g','BNS-001','Groceries',1.00,28,10,'can','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(18,'Salt 1kg','SLT-001','Groceries',0.40,65,10,'pack','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(19,'Matches (box)','MAT-001','Household',0.20,200,30,'box','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00'),
(20,'Toothpaste 75ml','TPT-001','Personal Care',1.30,22,8,'tube','2026-05-02 12:39:27+00','2026-05-02 12:39:27+00');

SELECT setval('products_id_seq', 20);

-- ── Seed: 37 Sales ───────────────────────────────────────────────────────────
INSERT INTO sales (id,total,payment_method,customer_name,pduka_earned,tx_hash,created_at) VALUES
(1,17.60,'cash',NULL,17.6,NULL,'2026-03-18 12:28:27+00'),
(2,18.50,'usdc',NULL,18.5,NULL,'2026-03-19 09:39:27+00'),
(3,12.90,'cash',NULL,12.9,NULL,'2026-03-20 14:18:27+00'),
(4,14.80,'pol',NULL,14.8,NULL,'2026-03-21 17:16:27+00'),
(5,15.20,'cash',NULL,15.2,NULL,'2026-03-22 14:35:27+00'),
(6,23.90,'pduka',NULL,23.9,NULL,'2026-03-23 14:05:27+00'),
(7,13.30,'cash',NULL,13.3,NULL,'2026-03-24 12:25:27+00'),
(8,21.40,'usdc',NULL,21.4,NULL,'2026-03-25 14:56:27+00'),
(9,11.60,'cash',NULL,11.6,NULL,'2026-03-26 16:18:27+00'),
(10,20.40,'cash',NULL,20.4,NULL,'2026-03-27 09:58:27+00'),
(11,10.70,'pol',NULL,10.7,NULL,'2026-03-28 18:42:27+00'),
(12,23.80,'cash',NULL,23.8,NULL,'2026-03-29 18:47:27+00'),
(13,25.50,'usdc',NULL,25.5,NULL,'2026-03-30 14:22:27+00'),
(14,17.00,'cash',NULL,17.0,NULL,'2026-03-31 09:29:27+00'),
(15,17.80,'pduka',NULL,17.8,NULL,'2026-04-01 10:43:27+00'),
(16,19.20,'cash',NULL,19.2,NULL,'2026-04-02 09:46:27+00'),
(17,40.00,'usdc',NULL,40.0,NULL,'2026-04-03 14:21:27+00'),
(18,18.00,'cash',NULL,18.0,NULL,'2026-04-04 15:01:27+00'),
(19,15.80,'cash',NULL,15.8,NULL,'2026-04-18 14:20:27+00'),
(20,18.75,'usdc',NULL,18.75,NULL,'2026-04-19 19:59:27+00'),
(21,9.50,'cash',NULL,9.5,NULL,'2026-04-20 08:57:27+00'),
(22,11.60,'pol',NULL,11.6,NULL,'2026-04-21 18:23:27+00'),
(23,11.90,'cash',NULL,11.9,NULL,'2026-04-22 18:40:27+00'),
(24,9.70,'pduka',NULL,9.7,NULL,'2026-04-23 18:44:27+00'),
(25,23.10,'cash',NULL,23.1,NULL,'2026-04-24 18:09:27+00'),
(26,19.40,'usdc',NULL,19.4,NULL,'2026-04-25 08:42:27+00'),
(27,25.20,'cash',NULL,25.2,NULL,'2026-04-26 18:08:27+00'),
(28,26.40,'cash',NULL,26.4,NULL,'2026-04-27 18:16:27+00'),
(29,12.20,'pol',NULL,12.2,NULL,'2026-04-28 09:18:27+00'),
(30,21.00,'cash',NULL,21.0,NULL,'2026-04-29 12:28:27+00'),
(31,26.40,'usdc',NULL,26.4,NULL,'2026-04-30 17:47:27+00'),
(32,10.30,'cash',NULL,10.3,NULL,'2026-05-01 16:16:27+00'),
(33,8.50,'pol',NULL,8.5,NULL,'2026-05-01 12:01:27+00'),
(34,8.90,'cash',NULL,8.9,NULL,'2026-05-01 16:13:27+00'),
(35,14.90,'cash',NULL,14.9,NULL,'2026-05-02 15:57:27+00'),
(36,7.60,'usdc',NULL,7.6,NULL,'2026-05-02 14:29:27+00'),
(37,13.30,'pduka',NULL,13.3,NULL,'2026-05-02 19:48:27+00');

SELECT setval('sales_id_seq', 37);

-- ── Seed: 105 Sale Items ─────────────────────────────────────────────────────
INSERT INTO sale_items (id,sale_id,product_id,product_name,quantity,unit_price,subtotal) VALUES
(1,1,1,'Maize Flour 2kg',5,1.80,9.00),(2,1,2,'Sugar 1kg',3,1.20,3.60),(3,1,3,'Cooking Oil 1L',2,2.50,5.00),
(4,2,4,'Rice 5kg',2,4.00,8.00),(5,2,7,'Eggs (30 pack)',3,3.50,10.50),
(6,3,6,'Bread Loaf',4,1.10,4.40),(7,3,5,'Milk 500ml',6,0.75,4.50),(8,3,15,'Biscuits 200g',5,0.80,4.00),
(9,4,9,'Soap Bar',10,0.60,6.00),(10,4,10,'Washing Powder 1kg',4,2.20,8.80),
(11,5,11,'Bottled Water 1.5L',12,0.50,6.00),(12,5,12,'Soft Drink 330ml',8,0.70,5.60),(13,5,16,'Chips 100g',6,0.60,3.60),
(14,6,1,'Maize Flour 2kg',8,1.80,14.40),(15,6,3,'Cooking Oil 1L',3,2.50,7.50),(16,6,18,'Salt 1kg',5,0.40,2.00),
(17,7,7,'Eggs (30 pack)',2,3.50,7.00),(18,7,6,'Bread Loaf',3,1.10,3.30),(19,7,5,'Milk 500ml',4,0.75,3.00),
(20,8,4,'Rice 5kg',3,4.00,12.00),(21,8,8,'Tomato Sauce 400g',6,0.90,5.40),(22,8,17,'Canned Beans 400g',4,1.00,4.00),
(23,9,2,'Sugar 1kg',4,1.20,4.80),(24,9,13,'Tea Bags (50pk)',2,1.50,3.00),(25,9,14,'Coffee 200g',1,3.80,3.80),
(26,10,11,'Bottled Water 1.5L',24,0.50,12.00),(27,10,12,'Soft Drink 330ml',12,0.70,8.40),
(28,11,20,'Toothpaste 75ml',3,1.30,3.90),(29,11,9,'Soap Bar',8,0.60,4.80),(30,11,19,'Matches (box)',10,0.20,2.00),
(31,12,1,'Maize Flour 2kg',6,1.80,10.80),(32,12,4,'Rice 5kg',2,4.00,8.00),(33,12,3,'Cooking Oil 1L',2,2.50,5.00),
(34,13,7,'Eggs (30 pack)',4,3.50,14.00),(35,13,5,'Milk 500ml',8,0.75,6.00),(36,13,6,'Bread Loaf',5,1.10,5.50),
(37,14,15,'Biscuits 200g',8,0.80,6.40),(38,14,16,'Chips 100g',6,0.60,3.60),(39,14,12,'Soft Drink 330ml',10,0.70,7.00),
(40,15,10,'Washing Powder 1kg',3,2.20,6.60),(41,15,9,'Soap Bar',12,0.60,7.20),(42,15,19,'Matches (box)',20,0.20,4.00),
(43,16,2,'Sugar 1kg',5,1.20,6.00),(44,16,8,'Tomato Sauce 400g',8,0.90,7.20),(45,16,17,'Canned Beans 400g',6,1.00,6.00),
(46,17,1,'Maize Flour 2kg',10,1.80,18.00),(47,17,3,'Cooking Oil 1L',4,2.50,10.00),(48,17,4,'Rice 5kg',3,4.00,12.00),
(49,18,11,'Bottled Water 1.5L',18,0.50,9.00),(50,18,12,'Soft Drink 330ml',6,0.70,4.20),(51,18,16,'Chips 100g',8,0.60,4.80),
(52,19,1,'Maize Flour 2kg',4,1.80,7.20),(53,19,2,'Sugar 1kg',3,1.20,3.60),(54,19,3,'Cooking Oil 1L',2,2.50,5.00),
(55,20,4,'Rice 5kg',2,4.00,8.00),(56,20,7,'Eggs (30 pack)',2,3.50,7.00),(57,20,5,'Milk 500ml',5,0.75,3.75),
(58,21,6,'Bread Loaf',3,1.10,3.30),(59,21,15,'Biscuits 200g',4,0.80,3.20),(60,21,16,'Chips 100g',5,0.60,3.00),
(61,22,11,'Bottled Water 1.5L',12,0.50,6.00),(62,22,12,'Soft Drink 330ml',8,0.70,5.60),
(63,23,9,'Soap Bar',6,0.60,3.60),(64,23,10,'Washing Powder 1kg',2,2.20,4.40),(65,23,20,'Toothpaste 75ml',3,1.30,3.90),
(66,24,8,'Tomato Sauce 400g',5,0.90,4.50),(67,24,17,'Canned Beans 400g',4,1.00,4.00),(68,24,18,'Salt 1kg',3,0.40,1.20),
(69,25,1,'Maize Flour 2kg',6,1.80,10.80),(70,25,2,'Sugar 1kg',4,1.20,4.80),(71,25,3,'Cooking Oil 1L',3,2.50,7.50),
(72,26,7,'Eggs (30 pack)',3,3.50,10.50),(73,26,5,'Milk 500ml',6,0.75,4.50),(74,26,6,'Bread Loaf',4,1.10,4.40),
(75,27,11,'Bottled Water 1.5L',24,0.50,12.00),(76,27,12,'Soft Drink 330ml',12,0.70,8.40),(77,27,15,'Biscuits 200g',6,0.80,4.80),
(78,28,4,'Rice 5kg',3,4.00,12.00),(79,28,1,'Maize Flour 2kg',5,1.80,9.00),(80,28,8,'Tomato Sauce 400g',6,0.90,5.40),
(81,29,9,'Soap Bar',8,0.60,4.80),(82,29,19,'Matches (box)',15,0.20,3.00),(83,29,10,'Washing Powder 1kg',2,2.20,4.40),
(84,30,3,'Cooking Oil 1L',4,2.50,10.00),(85,30,2,'Sugar 1kg',5,1.20,6.00),(86,30,17,'Canned Beans 400g',5,1.00,5.00),
(87,31,7,'Eggs (30 pack)',4,3.50,14.00),(88,31,5,'Milk 500ml',8,0.75,6.00),(89,31,15,'Biscuits 200g',8,0.80,6.40),
(90,32,1,'Maize Flour 2kg',3,1.80,5.40),(91,32,2,'Sugar 1kg',2,1.20,2.40),(92,32,3,'Cooking Oil 1L',1,2.50,2.50),
(93,33,11,'Bottled Water 1.5L',10,0.50,5.00),(94,33,12,'Soft Drink 330ml',5,0.70,3.50),
(95,34,6,'Bread Loaf',4,1.10,4.40),(96,34,5,'Milk 500ml',6,0.75,4.50),
(97,35,1,'Maize Flour 2kg',4,1.80,7.20),(98,35,3,'Cooking Oil 1L',2,2.50,5.00),(99,35,8,'Tomato Sauce 400g',3,0.90,2.70),
(100,36,11,'Bottled Water 1.5L',6,0.50,3.00),(101,36,12,'Soft Drink 330ml',4,0.70,2.80),(102,36,16,'Chips 100g',3,0.60,1.80),
(103,37,7,'Eggs (30 pack)',2,3.50,7.00),(104,37,5,'Milk 500ml',4,0.75,3.00),(105,37,6,'Bread Loaf',3,1.10,3.30);

SELECT setval('sale_items_id_seq', 105);
