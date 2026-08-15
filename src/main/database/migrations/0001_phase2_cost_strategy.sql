ALTER TABLE services ADD COLUMN cost_batch_size REAL;
UPDATE services SET cost_type = 'PER_UNIT' WHERE cost_type = 'UNIT';
INSERT INTO app_settings (key, value, updated_at)
VALUES ('database.schemaVersion', '2', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = '2', updated_at = CURRENT_TIMESTAMP;
