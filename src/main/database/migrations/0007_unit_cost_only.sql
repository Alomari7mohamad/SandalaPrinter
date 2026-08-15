UPDATE services
SET unit_cost = CASE
      WHEN cost_type = 'PER_100' AND unit_cost IS NOT NULL
        THEN unit_cost / COALESCE(NULLIF(cost_batch_size, 0), 100)
      ELSE unit_cost
    END,
    cost_type = 'PER_UNIT',
    cost_batch_size = NULL;

INSERT INTO app_settings (key, value, updated_at)
VALUES ('database.schemaVersion', '8', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = '8', updated_at = CURRENT_TIMESTAMP;
