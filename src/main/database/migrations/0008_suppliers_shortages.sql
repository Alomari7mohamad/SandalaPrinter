CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  whatsapp_phone TEXT NOT NULL,
  product_types TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE inventory_items ADD COLUMN supplier_id TEXT REFERENCES suppliers(id);
ALTER TABLE inventory_items ADD COLUMN reorder_point REAL NOT NULL DEFAULT 1;
ALTER TABLE inventory_items ADD COLUMN minimum_order_quantity REAL NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS purchase_requests (
  id TEXT PRIMARY KEY,
  inventory_item_id TEXT NOT NULL UNIQUE REFERENCES inventory_items(id),
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  requested_quantity REAL NOT NULL,
  unit_price REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'AUTO',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS inventory_supplier_idx ON inventory_items(supplier_id);
CREATE INDEX IF NOT EXISTS purchase_requests_supplier_idx ON purchase_requests(supplier_id);

INSERT INTO app_settings (key, value, updated_at)
VALUES ('database.schemaVersion', '9', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = '9', updated_at = CURRENT_TIMESTAMP;
