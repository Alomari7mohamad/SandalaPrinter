import { CircleCheck, PanelRightOpen, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { UpdateNotification } from './UpdateNotification'

export function AppLayout() {
  const location = useLocation()
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
      <main className="main-content">
        <div className="workspace-bar">
          <div><span className="workspace-status"><CircleCheck size={15} /> النظام جاهز</span><span className="workspace-context">{routeContext[location.pathname] ?? 'إدارة المطبعة'}</span></div>
          {location.pathname !== '/new-order' && <Link className="workspace-new-order" to="/new-order"><Plus size={17} /> طلب جديد</Link>}
        </div>
        <UpdateNotification /><Outlet />
      </main>
    </div>
  )
}

const routeContext: Record<string, string> = {
  '/': 'مركز المتابعة', '/new-order': 'إنشاء طلب', '/orders': 'إدارة الطلبات', '/services': 'صفحة العمل',
  '/pricing': 'إدارة التسعير', '/inventory': 'إدارة المخزون', '/shortages': 'المشتريات والنواقص', '/profits': 'التحليل المالي', '/work-log': 'دوام صاحب المطبعة', '/settings': 'إعدادات النظام',
}
