ALTER TABLE orders ADD COLUMN business_logo_data_url TEXT;

INSERT INTO app_settings (key, value, updated_at)
VALUES ('database.schemaVersion', '6', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = '6', updated_at = CURRENT_TIMESTAMP;
