ALTER TABLE inventory_items ADD COLUMN category_id TEXT REFERENCES service_categories(id);

CREATE INDEX IF NOT EXISTS inventory_category_idx ON inventory_items(category_id);

INSERT INTO app_settings (key, value, updated_at)
VALUES ('database.schemaVersion', '12', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = '12', updated_at = CURRENT_TIMESTAMP;
