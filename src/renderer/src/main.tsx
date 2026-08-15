import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import './styles.css'
import { DESKTOP_API_KEY } from '../../shared/contracts'
import { isDesktopApiAvailable } from './utils/api-guard'
import { FatalErrorScreen } from './components/FatalErrorScreen'
import { AppErrorBoundary } from './components/AppErrorBoundary'

const root = ReactDOM.createRoot(document.getElementById('root')!)
const exposedApi = (window as unknown as Record<string, unknown>)[DESKTOP_API_KEY]

root.render(isDesktopApiAvailable(exposedApi) ? (
  <React.StrictMode>
    <AppErrorBoundary><HashRouter><App /></HashRouter></AppErrorBoundary>
  </React.StrictMode>
) : (
  <FatalErrorScreen title="تعذر الاتصال بخدمات التطبيق الداخلية" message="يرجى إعادة تشغيل البرنامج. لم يتم تحميل قناة الاتصال الآمنة بين الواجهة وخدمات Electron." />
))
