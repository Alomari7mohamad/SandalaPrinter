import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useLayoutEffect } from 'react'
import { AppLayout } from './components/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { NewOrderPage } from './pages/NewOrderPage'
import { ServicesPage } from './pages/ServicesPage'
import { PricingPage } from './pages/PricingPage'
import { OrdersPage } from './pages/OrdersPage'
import { InventoryPage } from './pages/InventoryPage'
import { ProfitsPage } from './pages/ProfitsPage'
import { SettingsPage } from './pages/SettingsPage'

export function App() {
  const navigate = useNavigate()
  const location = useLocation()
  useLayoutEffect(() => {
    const resetScroll = () => { window.scrollTo({ top: 0, left: 0 }); document.documentElement.scrollTop = 0; document.body.scrollTop = 0 }
    resetScroll()
    const frame = window.requestAnimationFrame(resetScroll)
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        navigate('/new-order')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="new-order" element={<NewOrderPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="profits" element={<ProfitsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
