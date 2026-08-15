import { app, BrowserWindow } from 'electron'
import { DEFAULT_UPDATE_FEED_URL, type UpdateSettingsDto, type UpdateStatusDto } from '../../shared/contracts'
import * as settingsRepository from '../database/update-settings.repository'

let initialized = false
let autoUpdater: typeof import('electron-updater')['autoUpdater'] | undefined
let status: UpdateStatusDto = {
  state: 'idle', currentVersion: app.getVersion(), availableVersion: null, progress: null, message: 'جاهز لفحص التحديثات.'
}

function publish(next: Partial<UpdateStatusDto>): UpdateStatusDto {
  status = { ...status, ...next, currentVersion: app.getVersion() }
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send('updates:status-changed', status)
  return status
}

function configureFeed(feedUrl: string): void {
  if (!feedUrl || !autoUpdater) return
  autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl })
}

function validateSettings(input: UpdateSettingsDto): UpdateSettingsDto {
  const feedUrl = (input.feedUrl.trim() || DEFAULT_UPDATE_FEED_URL).replace(/\/+$/, '')
  if (feedUrl) {
    let parsed: URL
    try { parsed = new URL(feedUrl) } catch { throw new Error('رابط مصدر التحديث غير صالح.') }
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('مصدر التحديث يجب أن يكون رابط HTTP أو HTTPS.')
  }
  return { feedUrl, autoCheck: Boolean(input.autoCheck) }
}

export async function initializeUpdateService(): Promise<void> {
  if (initialized) return
  initialized = true
  try {
    const updaterPackage = (await import('electron-updater')).default
    autoUpdater = updaterPackage.autoUpdater
    if (!autoUpdater) throw new Error('electron-updater did not expose autoUpdater')
  } catch {
    publish({ state: 'error', message: 'تعذر تحميل خدمة تحديث التطبيق.' })
    return
  }
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('checking-for-update', () => publish({ state: 'checking', progress: null, message: 'جارٍ البحث عن تحديث...' }))
  autoUpdater.on('update-available', (info) => publish({ state: 'available', availableVersion: info.version, progress: null, message: `يتوفر تحديث جديد: الإصدار ${info.version}` }))
  autoUpdater.on('update-not-available', () => publish({ state: 'not-available', availableVersion: null, progress: null, message: 'أنت تستخدم أحدث إصدار.' }))
  autoUpdater.on('download-progress', (progress) => publish({ state: 'downloading', progress: Math.round(progress.percent), message: `جارٍ تنزيل التحديث: ${Math.round(progress.percent)}%` }))
  autoUpdater.on('update-downloaded', (info) => publish({ state: 'downloaded', availableVersion: info.version, progress: 100, message: 'اكتمل تنزيل التحديث وأصبح جاهزًا للتثبيت.' }))
  autoUpdater.on('error', () => publish({ state: 'error', progress: null, message: 'تعذر الاتصال بمصدر التحديث أو التحقق من ملف الإصدار.' }))

  const settings = settingsRepository.getUpdateSettings()
  if (app.isPackaged && settings.autoCheck && settings.feedUrl) {
    configureFeed(settings.feedUrl)
    const timer = setTimeout(() => { void checkForUpdates() }, 8000)
    timer.unref()
  }
}

export function getStatus(): UpdateStatusDto { return status }
export function getSettings(): UpdateSettingsDto { return settingsRepository.getUpdateSettings() }

export function saveSettings(input: UpdateSettingsDto): UpdateSettingsDto {
  const settings = validateSettings(input)
  const saved = settingsRepository.saveUpdateSettings(settings)
  if (saved.feedUrl) configureFeed(saved.feedUrl)
  publish({ state: 'idle', availableVersion: null, progress: null, message: 'تم حفظ إعدادات التحديث.' })
  return saved
}

export async function checkForUpdates(): Promise<UpdateStatusDto> {
  const settings = settingsRepository.getUpdateSettings()
  if (!app.isPackaged) return publish({ state: 'disabled', message: 'فحص التحديثات يعمل بعد تثبيت نسخة Windows النهائية.' })
  if (!autoUpdater) return publish({ state: 'error', message: 'خدمة التحديث غير متاحة حاليًا.' })
  if (!settings.feedUrl) return publish({ state: 'disabled', message: 'أضف رابط مصدر التحديث في الإعدادات أولًا.' })
  configureFeed(settings.feedUrl)
  await autoUpdater.checkForUpdates()
  return status
}

export async function downloadUpdate(): Promise<void> {
  if (status.state !== 'available') throw new Error('لا يوجد تحديث متاح للتنزيل.')
  if (!autoUpdater) throw new Error('خدمة التحديث غير متاحة حاليًا.')
  await autoUpdater.downloadUpdate()
}

export function installUpdate(): void {
  if (status.state !== 'downloaded') throw new Error('لم يكتمل تنزيل التحديث بعد.')
  if (!autoUpdater) throw new Error('خدمة التحديث غير متاحة حاليًا.')
  const updater = autoUpdater
  setImmediate(() => updater.quitAndInstall(false, true))
}
