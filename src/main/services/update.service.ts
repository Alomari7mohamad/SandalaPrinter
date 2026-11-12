import { app, BrowserWindow, Notification } from 'electron'
import { DEFAULT_UPDATE_FEED_URL, type UpdateSettingsDto, type UpdateStatusDto } from '../../shared/contracts'
import * as settingsRepository from '../database/update-settings.repository'

let initialized = false
let autoUpdater: typeof import('electron-updater')['autoUpdater'] | undefined
let checkingPromise: Promise<UpdateStatusDto> | null = null
let lastNotifiedVersion: string | null = null
let automaticTimer: ReturnType<typeof setTimeout> | undefined
let lastCheckStartedAt = -Infinity
const automaticCheckInterval = 60_000
const focusCheckCooldown = 15_000
let status: UpdateStatusDto = {
  state: 'idle', currentVersion: app.getVersion(), availableVersion: null, progress: null, message: 'جاهز لفحص التحديثات.'
}

function publish(next: Partial<UpdateStatusDto>): UpdateStatusDto {
  status = { ...status, ...next, currentVersion: app.getVersion() }
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send('updates:status-changed', status)
  if (app.isPackaged && status.state === 'available' && status.availableVersion && status.availableVersion !== lastNotifiedVersion && Notification.isSupported()) {
    lastNotifiedVersion = status.availableVersion
    const notification = new Notification({ title: 'تحديث جديد لـ Sandala Printer', body: `الإصدار ${status.availableVersion} متاح الآن. افتح التطبيق لتنزيله وتثبيته.` })
    notification.on('click', () => { const window=BrowserWindow.getAllWindows()[0]; if(window){ if(window.isMinimized()) window.restore(); window.show(); window.focus() } })
    notification.show()
  }
  return status
}

function configureFeed(feedUrl: string): void {
  if (!feedUrl || !autoUpdater) return
  autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl })
}

function checkAutomatically(): void {
  if (lastCheckStartedAt === -Infinity || Date.now() - lastCheckStartedAt < focusCheckCooldown) return
  void checkForUpdates()
}

function scheduleAutomaticChecks(settings: UpdateSettingsDto, delay: number): void {
  clearTimeout(automaticTimer)
  automaticTimer = undefined
  app.removeListener('browser-window-focus', checkAutomatically)
  if (!app.isPackaged || !settings.autoCheck || !settings.feedUrl) return

  const tick = () => {
    void checkForUpdates()
    automaticTimer = setTimeout(tick, automaticCheckInterval)
    automaticTimer.unref()
  }
  automaticTimer = setTimeout(tick, delay)
  automaticTimer.unref()
  app.on('browser-window-focus', checkAutomatically)
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
  // Install only after the explicit button action. Installing on an ordinary
  // quit can leave an assisted NSIS update waiting without reopening the app.
  // إذا أُغلق التطبيق بعد اكتمال التنزيل، ثبّت التحديث أيضاً كمسار احتياطي.
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.autoRunAppAfterInstall = true
  autoUpdater.on('checking-for-update', () => {
    if (status.state !== 'available') publish({ state: 'checking', progress: null, message: 'جارٍ البحث عن تحديث...' })
  })
  autoUpdater.on('update-available', (info) => publish({ state: 'available', availableVersion: info.version, progress: null, message: `يتوفر تحديث جديد: الإصدار ${info.version}` }))
  autoUpdater.on('update-not-available', () => publish({ state: 'not-available', availableVersion: null, progress: null, message: 'أنت تستخدم أحدث إصدار.' }))
  autoUpdater.on('download-progress', (progress) => publish({ state: 'downloading', progress: Math.round(progress.percent), message: `جارٍ تنزيل التحديث: ${Math.round(progress.percent)}%` }))
  autoUpdater.on('update-downloaded', (info) => publish({ state: 'downloaded', availableVersion: info.version, progress: 100, message: 'اكتمل تنزيل التحديث وأصبح جاهزًا للتثبيت.' }))
  autoUpdater.on('error', () => publish({ state: 'error', progress: null, message: 'تعذر الاتصال بمصدر التحديث أو التحقق من ملف الإصدار.' }))

  scheduleAutomaticChecks(settingsRepository.ensureUpdateSettings(), 1500)
}

export function getStatus(): UpdateStatusDto { return status }
export function getSettings(): UpdateSettingsDto { return settingsRepository.getUpdateSettings() }

export function saveSettings(input: UpdateSettingsDto): UpdateSettingsDto {
  const settings = validateSettings(input)
  const saved = settingsRepository.saveUpdateSettings(settings)
  // لا نمسح نتيجة فحص أو تنزيل قائم عند حفظ الخيارات.
  if (status.state === 'idle' || status.state === 'not-available' || status.state === 'disabled' || status.state === 'error') {
    publish({ message: 'تم حفظ إعدادات التحديث.' })
  }
  scheduleAutomaticChecks(saved, 0)
  return saved
}

export async function checkForUpdates(): Promise<UpdateStatusDto> {
  if (checkingPromise) return checkingPromise
  if (['downloading', 'downloaded', 'installing'].includes(status.state)) return status
  if (!app.isPackaged) return publish({ state: 'disabled', message: 'فحص التحديثات يعمل بعد تثبيت نسخة Windows النهائية.' })
  if (!autoUpdater) return publish({ state: 'error', message: 'خدمة التحديث غير متاحة حاليًا.' })
  const updater = autoUpdater
  const settings = settingsRepository.getUpdateSettings()
  if (!settings.feedUrl) return publish({ state: 'disabled', message: 'أضف رابط مصدر التحديث في الإعدادات أولًا.' })
  lastCheckStartedAt = Date.now()
  checkingPromise = Promise.resolve().then(async () => {
    configureFeed(settings.feedUrl)
    await updater.checkForUpdates()
    return status
  }).catch(() => {
    return status.state === 'error' ? status : publish({ state: 'error', progress: null, message: 'تعذر الاتصال بمصدر التحديث أو التحقق من ملف الإصدار.' })
  }).finally(() => {
    checkingPromise = null
  })
  return checkingPromise
}

export async function downloadUpdate(): Promise<void> {
  if (checkingPromise) await checkingPromise
  if (status.state !== 'available') throw new Error('لا يوجد تحديث متاح للتنزيل.')
  if (!autoUpdater) throw new Error('خدمة التحديث غير متاحة حاليًا.')
  publish({ state: 'downloading', progress: 0, message: 'جارٍ تنزيل التحديث...' })
  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    if (getStatus().state !== 'error') publish({ state: 'error', progress: null, message: 'تعذر تنزيل التحديث.' })
    throw error
  }
}

export function installUpdate(): void {
  if (status.state !== 'downloaded') throw new Error('لم يكتمل تنزيل التحديث بعد.')
  if (!autoUpdater) throw new Error('خدمة التحديث غير متاحة حاليًا.')
  const updater = autoUpdater
  publish({ state: 'installing', progress: 100, message: 'جارٍ تثبيت التحديث وإعادة تشغيل التطبيق...' })
  // Silent mode completes the assisted NSIS installation without leaving a
  // hidden wizard open; forceRunAfter starts the newly installed version.
  setImmediate(() => updater.quitAndInstall(true, true))
}
