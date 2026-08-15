UPDATE app_settings SET value = 'Sandala Printer', updated_at = CURRENT_TIMESTAMP
WHERE key = 'printer.name' AND value = 'OH Printer Manager';

INSERT INTO app_settings (key, value, updated_at)
VALUES ('database.schemaVersion', '3', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = '3', updated_at = CURRENT_TIMESTAMP;
