ALTER TABLE inventory_items ADD COLUMN package_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN package_name TEXT;
ALTER TABLE inventory_items ADD COLUMN units_per_package REAL;
ALTER TABLE inventory_items ADD COLUMN package_price REAL;
ALTER TABLE inventory_items ADD COLUMN package_notes TEXT;
ALTER TABLE inventory_items ADD COLUMN reorder_package_count REAL;

INSERT INTO app_settings (key, value, updated_at)
VALUES ('database.schemaVersion', '11', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = '11', updated_at = CURRENT_TIMESTAMP;
