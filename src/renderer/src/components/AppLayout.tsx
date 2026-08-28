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
      <button type="button" className="sidebar-toggle" onClick={toggleSidebar} aria-expanded={sidebarOpen} aria-label={sidebarOpen ? 'إغلاق القائمة الجانبية' : 'فتح القائمة الجانبية'} title={sidebarOpen ? 'إخفاء القائمة الجانبية' : 'فتح القائمة الجانبية'}>
        {sidebarOpen ? <PanelRightClose size={18} strokeWidth={2.4} /> : <PanelRightOpen size={19} strokeWidth={2.4} />}
        <span>{sidebarOpen ? 'إخفاء القائمة' : 'فتح القائمة'}</span>
      </button>
      <main className="main-content"><UpdateNotification /><Outlet /></main>
    </div>
  )
}
