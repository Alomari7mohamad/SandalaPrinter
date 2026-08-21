ALTER TABLE services ADD COLUMN item_type TEXT NOT NULL DEFAULT 'SERVICE';
ALTER TABLE services ADD COLUMN supplier_id TEXT REFERENCES suppliers(id);
ALTER TABLE services ADD COLUMN reorder_point REAL NOT NULL DEFAULT 1;
ALTER TABLE services ADD COLUMN minimum_order_quantity REAL NOT NULL DEFAULT 1;
ALTER TABLE inventory_items ADD COLUMN catalog_service_id TEXT REFERENCES services(id);

UPDATE services SET item_type = 'PRODUCT'
WHERE id IN (
  'product-black-binder', 'product-nylon-folder', 'product-bag-folder',
  'product-nylon-bag', 'product-large-staples', 'product-small-staples', 'product-red-glue'
);

UPDATE inventory_items SET catalog_service_id = 'product-black-binder' WHERE id = 'inv-black-binders' AND EXISTS (SELECT 1 FROM services WHERE id='product-black-binder');
UPDATE inventory_items SET catalog_service_id = 'product-nylon-folder' WHERE id = 'inv-nylon-folders' AND EXISTS (SELECT 1 FROM services WHERE id='product-nylon-folder');
UPDATE inventory_items SET catalog_service_id = 'product-nylon-bag' WHERE id = 'inv-nylon-bags' AND EXISTS (SELECT 1 FROM services WHERE id='product-nylon-bag');
UPDATE inventory_items SET catalog_service_id = 'product-large-staples' WHERE id = 'inv-staples-large' AND EXISTS (SELECT 1 FROM services WHERE id='product-large-staples');
UPDATE inventory_items SET catalog_service_id = 'product-small-staples' WHERE id = 'inv-staples-small' AND EXISTS (SELECT 1 FROM services WHERE id='product-small-staples');
UPDATE inventory_items SET catalog_service_id = 'product-red-glue' WHERE id = 'inv-red-glue' AND EXISTS (SELECT 1 FROM services WHERE id='product-red-glue');

INSERT OR IGNORE INTO inventory_items (
  id, name, sku, unit, quantity, low_stock_threshold, purchase_cost,
  supplier_id, reorder_point, minimum_order_quantity, catalog_service_id, active
)
SELECT 'inv-catalog-' || s.id, s.name_ar, s.code, s.unit, 0, 1,
  COALESCE(s.unit_cost, 0), s.supplier_id, s.reorder_point,
  s.minimum_order_quantity, s.id, 1
FROM services s
WHERE s.item_type = 'PRODUCT'
  AND NOT EXISTS (SELECT 1 FROM inventory_items i WHERE i.catalog_service_id = s.id);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_catalog_service_unique
ON inventory_items(catalog_service_id) WHERE catalog_service_id IS NOT NULL;

INSERT INTO app_settings (key, value, updated_at)
VALUES ('database.schemaVersion', '10', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = '10', updated_at = CURRENT_TIMESTAMP;
