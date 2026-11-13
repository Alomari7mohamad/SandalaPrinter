ALTER TABLE orders ADD COLUMN rounding_discount REAL NOT NULL DEFAULT 0 CHECK (rounding_discount >= 0 AND rounding_discount < 1);
INSERT INTO app_settings (key,value) VALUES ('database.schemaVersion','19')
ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP;
