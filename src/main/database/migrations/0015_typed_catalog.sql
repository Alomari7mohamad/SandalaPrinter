ALTER TABLE service_categories ADD COLUMN item_type TEXT NOT NULL DEFAULT 'SERVICE'
  CHECK (item_type IN ('SERVICE', 'PRODUCT'));

-- Recover legacy products that were previously saved through the services-only form.
UPDATE services SET item_type='PRODUCT'
WHERE id LIKE 'product-%' OR id LIKE 'ghassan-product-%' OR id LIKE 'inventory-catalog-%'
  OR EXISTS (SELECT 1 FROM inventory_items WHERE catalog_service_id=services.id);

-- Product-only categories retain their original identifiers.
UPDATE service_categories SET item_type='PRODUCT'
WHERE EXISTS (SELECT 1 FROM services WHERE category_id=service_categories.id AND item_type='PRODUCT')
  AND NOT EXISTS (SELECT 1 FROM services WHERE category_id=service_categories.id AND item_type='SERVICE');

-- Split mixed categories while retaining all catalog item and order identifiers.
INSERT INTO service_categories (id, name_ar, code, active, sort_order, item_type)
SELECT 'typed-products:' || id, name_ar, 'TYPED_PRODUCTS:' || id, active, sort_order, 'PRODUCT'
FROM service_categories
WHERE item_type='SERVICE'
  AND EXISTS (SELECT 1 FROM services WHERE category_id=service_categories.id AND item_type='PRODUCT');

UPDATE services SET category_id='typed-products:' || category_id
WHERE item_type='PRODUCT'
  AND category_id IN (SELECT id FROM service_categories WHERE item_type='SERVICE');

INSERT INTO app_settings (key, value) VALUES ('database.schemaVersion', '16')
ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP;
