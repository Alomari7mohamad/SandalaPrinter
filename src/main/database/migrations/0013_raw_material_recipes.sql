ALTER TABLE inventory_items ADD COLUMN barcode TEXT;
ALTER TABLE inventory_items ADD COLUMN item_kind TEXT NOT NULL DEFAULT 'STOCK_ITEM'
  CHECK (item_kind IN ('STOCK_ITEM', 'RAW_MATERIAL'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_barcode
  ON inventory_items(barcode) WHERE barcode IS NOT NULL AND trim(barcode) <> '';

CREATE TABLE IF NOT EXISTS inventory_item_suppliers (
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  PRIMARY KEY (inventory_item_id, supplier_id)
);

INSERT OR IGNORE INTO inventory_item_suppliers (inventory_item_id, supplier_id)
SELECT id, supplier_id FROM inventory_items WHERE supplier_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS service_material_requirements (
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity_per_unit REAL NOT NULL CHECK (quantity_per_unit > 0),
  PRIMARY KEY (service_id, inventory_item_id)
);

-- المنتجات المستوردة الجاهزة تبقى بضائع بيع؛ بقية عناصر المخزون الحالية مواد تشغيلية.
UPDATE inventory_items SET item_kind = 'RAW_MATERIAL'
WHERE id NOT LIKE 'inv-ghassan-product-%';

INSERT INTO app_settings (key, value, updated_at)
VALUES ('database.schemaVersion', '14', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value='14', updated_at=CURRENT_TIMESTAMP;
