-- 002_indexes_and_constraints.sql
-- Drop redundant duplicate SKU index if present
DROP INDEX IF EXISTS idx_products_sku_unique;

-- Add missing performance & foreign-key lookup indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(channel);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref ON stock_movements(reference_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_apps_status ON wholesale_applications(status);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  response_status INTEGER NOT NULL,
  response_body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
