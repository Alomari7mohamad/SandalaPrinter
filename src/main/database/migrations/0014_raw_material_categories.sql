CREATE TABLE IF NOT EXISTS raw_material_categories (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE inventory_items ADD COLUMN raw_material_category_id TEXT REFERENCES raw_material_categories(id);

INSERT OR IGNORE INTO raw_material_categories (id, name_ar, sort_order) VALUES
  ('raw-category-paper', 'ورقيات', 10),
  ('raw-category-general', 'مواد خام عامة', 20);

UPDATE inventory_items SET raw_material_category_id = 'raw-category-paper'
WHERE item_kind='RAW_MATERIAL' AND (
  name LIKE '%ورق%' OR name LIKE '%بروستول%' OR name LIKE '%خرومو%'
  OR name LIKE '%كرتون%' OR name LIKE '%ملصقات%' OR lower(name) LIKE '%ncr%' OR name LIKE '%سبليميشن%'
);

UPDATE inventory_items SET raw_material_category_id = 'raw-category-general'
WHERE item_kind='RAW_MATERIAL' AND raw_material_category_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_raw_material_category ON inventory_items(raw_material_category_id);

INSERT INTO app_settings (key, value, updated_at)
VALUES ('database.schemaVersion', '15', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value='15', updated_at=CURRENT_TIMESTAMP;
