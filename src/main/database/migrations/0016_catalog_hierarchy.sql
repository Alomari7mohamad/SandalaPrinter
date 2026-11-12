ALTER TABLE service_categories ADD COLUMN parent_id TEXT REFERENCES service_categories(id);
ALTER TABLE services ADD COLUMN regular_sale_price REAL CHECK (regular_sale_price IS NULL OR regular_sale_price >= 0);
ALTER TABLE services ADD COLUMN offer_sale_price REAL CHECK (offer_sale_price IS NULL OR offer_sale_price >= 0);
CREATE INDEX idx_category_parent ON service_categories(parent_id);
INSERT INTO app_settings (key,value) VALUES ('database.schemaVersion','17')
ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP;
