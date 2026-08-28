import { PanelRightOpen } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { UpdateNotification } from './UpdateNotification'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('sandala.sidebar.open') !== 'false')
  const toggleSidebar = () => setSidebarOpen((current) => {
    const next = !current
    localStorage.setItem('sandala.sidebar.open', String(next))
    return next
  })

  return (
    <div className={`app-shell${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
      <Sidebar onCollapse={toggleSidebar} />
      {!sidebarOpen && <aside className="sidebar-open-rail" aria-label="القائمة الجانبية مغلقة">
        <button type="button" className="sidebar-open-button" onClick={toggleSidebar} aria-label="فتح القائمة الجانبية" title="فتح القائمة الجانبية">
          <PanelRightOpen size={20} strokeWidth={2.4} />
          <span>القائمة</span>
        </button>
      </aside>}
      <main className="main-content"><UpdateNotification /><Outlet /></main>
    </div>
  )
}
