ALTER TABLE orders ADD COLUMN customer_name_snapshot TEXT NOT NULL DEFAULT 'زبون عام';
ALTER TABLE orders ADD COLUMN customer_phone_snapshot TEXT;
ALTER TABLE orders ADD COLUMN delivery_address TEXT;

UPDATE customers SET name = 'زبون عام', updated_at = CURRENT_TIMESTAMP
WHERE id = 'cash-customer' AND name = 'زبون نقدي';

INSERT INTO app_settings (key, value, updated_at)
VALUES ('database.schemaVersion', '4', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = '4', updated_at = CURRENT_TIMESTAMP;
