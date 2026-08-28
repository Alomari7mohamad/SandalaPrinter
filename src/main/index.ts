import { app, BrowserWindow, dialog, shell } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { closeDatabase, initializeDatabase } from './database/client'
import { registerIpcHandlers, unregisterIpcHandlers } from './ipc'
import { initializeUpdateService } from './services/update.service'

// Keep development/test data isolated from the database used by the installed app.
const developmentUserDataPath = !app.isPackaged ? process.env.SANDALA_USER_DATA_PATH : undefined
const defaultUserDataDirectory = app.isPackaged ? 'sandala-printer' : 'oh-printer-manager'
app.setPath('userData', developmentUserDataPath || join(app.getPath('appData'), defaultUserDataDirectory))
app.setName('Sandala Printer')

const remoteDebuggingPort = process.env.ELECTRON_REMOTE_DEBUGGING_PORT
if (!app.isPackaged && remoteDebuggingPort && /^\d{4,5}$/.test(remoteDebuggingPort)) {
  app.commandLine.appendSwitch('remote-debugging-port', remoteDebuggingPort)
}

function createWindow(): void {
  const preloadPath = join(__dirname, '../preload/index.cjs')
  const windowIconPath = app.isPackaged ? join(process.resourcesPath, 'icon.png') : join(app.getAppPath(), 'resources', 'icon.png')
  if (!existsSync(preloadPath)) throw new Error(`Preload bundle is missing: ${preloadPath}`)
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#f5f7f9',
    title: 'Sandala Printer',
    icon: windowIconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.on('preload-error', (_event, failedPath, error) => {
    console.error(`Failed to load preload script: ${failedPath}`, error)
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  const rendererLoad = process.env.ELECTRON_RENDERER_URL
    ? mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    : mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  void rendererLoad.catch((error: unknown) => {
    console.error('Failed to load the application renderer', error)
    dialog.showErrorBox(
      'تعذر فتح Sandala Printer',
      'تعذر تحميل واجهة التطبيق. يرجى إغلاق البرنامج وإعادة تشغيله.'
    )
    mainWindow.destroy()
  })
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  void app.whenReady().then(() => {
    try {
      app.setAppUserModelId('com.sandala.printer')
      initializeDatabase()
      registerIpcHandlers()
      createWindow()
      void initializeUpdateService()
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
      })
    } catch (error) {
      console.error('Failed to start Sandala Printer', error)
      dialog.showErrorBox(
        'تعذر تشغيل Sandala Printer',
        'تعذر الاتصال بقاعدة بيانات التطبيق. لم يتم حذف أي بيانات. يرجى إعادة تشغيل البرنامج، وإن استمرت المشكلة تواصل مع الدعم.'
      )
      app.quit()
    }
  }).catch((error: unknown) => {
    console.error('Electron failed before application startup', error)
    app.quit()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  unregisterIpcHandlers()
  closeDatabase()
})
