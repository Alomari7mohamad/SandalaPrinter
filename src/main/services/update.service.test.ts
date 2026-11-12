import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  settings: { autoCheck: true, feedUrl: 'https://updates.example.test' },
  check: vi.fn(),
  download: vi.fn()
}))

vi.mock('electron', () => ({
  app: Object.assign(new EventEmitter(), { isPackaged: true, getVersion: () => '1.0.13' }),
  BrowserWindow: { getAllWindows: () => [] },
  Notification: { isSupported: () => false }
}))

vi.mock('electron-updater', () => ({
  default: {
    autoUpdater: Object.assign(new EventEmitter(), {
      setFeedURL: vi.fn(),
      checkForUpdates: mocks.check,
      downloadUpdate: mocks.download
    })
  }
}))

vi.mock('../database/update-settings.repository', () => ({
  ensureUpdateSettings: () => mocks.settings,
  getUpdateSettings: () => mocks.settings,
  saveUpdateSettings: (settings: typeof mocks.settings) => Object.assign(mocks.settings, settings)
}))

const release = { version: '1.0.14', files: [], path: 'setup.exe', sha512: 'test', releaseDate: '2026-11-10' }

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  Object.assign(mocks.settings, { autoCheck: true, feedUrl: 'https://updates.example.test' })
  mocks.check.mockReset()
  mocks.download.mockReset()
  const { app } = await import('electron')
  const { default: { autoUpdater } } = await import('electron-updater')
  app.removeAllListeners('browser-window-focus')
  autoUpdater.removeAllListeners()
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('automatic application updates', () => {
  it('detects a new release while the app stays open and checks again on focus after the cooldown', async () => {
    const { app } = await import('electron')
    const { default: { autoUpdater } } = await import('electron-updater')
    const service = await import('./update.service')
    mocks.check.mockImplementationOnce(async () => autoUpdater.emit('update-not-available', { ...release, version: '1.0.13' }))
    mocks.check.mockImplementation(async () => autoUpdater.emit('update-available', release))

    await service.initializeUpdateService()
    await vi.advanceTimersByTimeAsync(1500)
    expect(service.getStatus().state).toBe('not-available')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(service.getStatus()).toMatchObject({ state: 'available', availableVersion: '1.0.14' })
    app.emit('browser-window-focus')
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.check).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(15_000)
    app.emit('browser-window-focus')
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.check).toHaveBeenCalledTimes(3)
  })

  it('starts and stops automatic checks when the setting changes', async () => {
    mocks.settings.autoCheck = false
    const service = await import('./update.service')
    await service.initializeUpdateService()
    await vi.advanceTimersByTimeAsync(65_000)
    expect(mocks.check).not.toHaveBeenCalled()
    service.saveSettings({ ...mocks.settings, autoCheck: true })
    await vi.advanceTimersByTimeAsync(1)
    expect(mocks.check).toHaveBeenCalledTimes(1)
    service.saveSettings({ ...mocks.settings, autoCheck: false })
    await vi.advanceTimersByTimeAsync(65_000)
    expect(mocks.check).toHaveBeenCalledTimes(1)
  })

  it('retries a failed background check and leaves a downloaded update ready to install', async () => {
    const { default: { autoUpdater } } = await import('electron-updater')
    const service = await import('./update.service')
    mocks.check.mockRejectedValueOnce(new Error('Offline'))
    mocks.check.mockImplementation(async () => autoUpdater.emit('update-available', release))
    mocks.download.mockImplementation(async () => autoUpdater.emit('update-downloaded', { ...release, downloadedFile: 'setup.exe' }))
    await service.initializeUpdateService()
    await vi.advanceTimersByTimeAsync(1500)
    expect(service.getStatus().state).toBe('error')
    await vi.advanceTimersByTimeAsync(60_000)
    await service.downloadUpdate()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(service.getStatus().state).toBe('downloaded')
    expect(mocks.check).toHaveBeenCalledTimes(2)
  })
})
