import type { UpdateSettingsDto } from '../../shared/contracts'
import { getSqlite } from './client'

const FEED_URL_KEY = 'updates.feedUrl'
const AUTO_CHECK_KEY = 'updates.autoCheck'

export function getUpdateSettings(): UpdateSettingsDto {
  const database = getSqlite()
  const rows = database.prepare(`SELECT key, value FROM app_settings WHERE key IN (?, ?)`).all(FEED_URL_KEY, AUTO_CHECK_KEY) as Array<{ key: string; value: string }>
  const values = new Map(rows.map((row) => [row.key, row.value]))
  return { feedUrl: values.get(FEED_URL_KEY) ?? '', autoCheck: values.get(AUTO_CHECK_KEY) !== 'false' }
}

export function saveUpdateSettings(settings: UpdateSettingsDto): UpdateSettingsDto {
  const database = getSqlite()
  const save = database.prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`)
  database.transaction(() => {
    save.run(FEED_URL_KEY, settings.feedUrl)
    save.run(AUTO_CHECK_KEY, settings.autoCheck ? 'true' : 'false')
  })()
  return getUpdateSettings()
}
