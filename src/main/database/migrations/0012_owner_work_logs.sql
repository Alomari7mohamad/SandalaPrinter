CREATE TABLE IF NOT EXISTS owner_work_logs (
  id TEXT PRIMARY KEY,
  work_date TEXT NOT NULL UNIQUE,
  regular_hours REAL NOT NULL DEFAULT 0 CHECK (regular_hours >= 0),
  overtime_hours REAL NOT NULL DEFAULT 0 CHECK (overtime_hours >= 0),
  hourly_rate REAL NOT NULL DEFAULT 0 CHECK (hourly_rate >= 0),
  overtime_percentage REAL NOT NULL DEFAULT 0 CHECK (overtime_percentage >= 0),
  regular_pay REAL NOT NULL DEFAULT 0,
  overtime_pay REAL NOT NULL DEFAULT 0,
  total_pay REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS owner_work_logs_date_idx ON owner_work_logs(work_date);

INSERT INTO app_settings (key, value, updated_at)
VALUES ('database.schemaVersion', '13', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
