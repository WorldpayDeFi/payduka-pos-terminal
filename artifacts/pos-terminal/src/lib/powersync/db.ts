import {
  PowerSyncDatabase,
  Column,
  ColumnType,
  Table,
  Schema,
} from "@powersync/web";
import { SupabaseConnector } from "./SupabaseConnector";

const products = new Table({
  name:               new Column({ type: ColumnType.TEXT }),
  sku:                new Column({ type: ColumnType.TEXT }),
  barcode:            new Column({ type: ColumnType.TEXT }),
  price:              new Column({ type: ColumnType.REAL }),
  category:           new Column({ type: ColumnType.TEXT }),
  stock:              new Column({ type: ColumnType.INTEGER }),
  low_stock_threshold:new Column({ type: ColumnType.INTEGER }),
  image_url:          new Column({ type: ColumnType.TEXT }),
  created_at:         new Column({ type: ColumnType.TEXT }),
});

const sales = new Table({
  total:          new Column({ type: ColumnType.REAL }),
  payment_method: new Column({ type: ColumnType.TEXT }),
  customer_name:  new Column({ type: ColumnType.TEXT }),
  pduka_earned:   new Column({ type: ColumnType.REAL }),
  tx_hash:        new Column({ type: ColumnType.TEXT }),
  status:         new Column({ type: ColumnType.TEXT }),
  created_at:     new Column({ type: ColumnType.TEXT }),
});

const sale_items = new Table({
  sale_id:      new Column({ type: ColumnType.TEXT }),
  product_id:   new Column({ type: ColumnType.TEXT }),
  product_name: new Column({ type: ColumnType.TEXT }),
  quantity:     new Column({ type: ColumnType.INTEGER }),
  unit_price:   new Column({ type: ColumnType.REAL }),
  subtotal:     new Column({ type: ColumnType.REAL }),
});

const inventory_deltas = new Table(
  {
    product_id: new Column({ type: ColumnType.TEXT }),
    delta:      new Column({ type: ColumnType.INTEGER }),
    reason:     new Column({ type: ColumnType.TEXT }),
    sale_id:    new Column({ type: ColumnType.TEXT }),
    created_at: new Column({ type: ColumnType.TEXT }),
  },
  { insertOnly: true }
);

export const AppSchema = new Schema({
  products,
  sales,
  sale_items,
  inventory_deltas,
});

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: "payduka_terminal.db" },
});

let _initialized = false;

export async function initPowerSync(): Promise<void> {
  if (_initialized) return;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const powersyncUrl = import.meta.env.VITE_POWERSYNC_URL;

  if (!supabaseUrl || !supabaseAnonKey || !powersyncUrl) {
    console.info("[PayDuka] PowerSync credentials not set — offline sync disabled.");
    return;
  }

  try {
    await db.init();
    const connector = new SupabaseConnector();
    await db.connect(connector);
    _initialized = true;
    console.info("[PayDuka] PowerSync connected — offline sync active.");
  } catch (err) {
    console.error("[PayDuka] PowerSync init failed:", err);
  }
}
