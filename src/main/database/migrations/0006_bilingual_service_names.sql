ALTER TABLE services ADD COLUMN name_he TEXT;
ALTER TABLE order_items ADD COLUMN service_name_he_snapshot TEXT;

INSERT INTO app_settings (key, value, updated_at)
VALUES ('database.schemaVersion', '7', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = '7', updated_at = CURRENT_TIMESTAMP;
