ALTER TABLE orders ADD COLUMN paid_at TEXT;

UPDATE orders
SET paid_at = COALESCE(updated_at, ordered_at)
WHERE payment_status = 'PAID' AND paid_at IS NULL;

INSERT INTO app_settings (key, value, updated_at)
VALUES ('database.schemaVersion', '5', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = '5', updated_at = CURRENT_TIMESTAMP;
