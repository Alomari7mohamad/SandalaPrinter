import { PanelRightClose, PanelRightOpen } from 'lucide-react'
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
      <Sidebar />
      <button type="button" className="sidebar-toggle" onClick={toggleSidebar} aria-label={sidebarOpen ? 'إغلاق القائمة الجانبية' : 'فتح القائمة الجانبية'} title={sidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة'}>
        {sidebarOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
      </button>
      <main className="main-content"><UpdateNotification /><Outlet /></main>
    </div>
  )
}
