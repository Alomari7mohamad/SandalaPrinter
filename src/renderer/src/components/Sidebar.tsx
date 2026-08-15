import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Boxes, ChartNoAxesCombined, ClipboardList, House, PackageOpen, Plus, Settings, Tags, UserRound } from 'lucide-react'
import sandalaLogo from '../assets/sandala-logo.png'
import sandalaIcon from '../assets/sandala-icon.png'

const items = [
  ['/', 'الرئيسية', House], ['/orders', 'الطلبات', ClipboardList],
  ['/services', 'الخدمات والمنتجات', PackageOpen], ['/pricing', 'الأسعار', Tags],
  ['/inventory', 'المخزون', Boxes], ['/profits', 'الأرباح', ChartNoAxesCombined],
  ['/settings', 'الإعدادات', Settings],
] as const

export function Sidebar() {
  const [unpaidOrders, setUnpaidOrders] = useState(0)
  const location = useLocation()
  useEffect(() => {
    const loadUnpaidOrders = () => {
      void window.desktopApi.orders.list({}).then((orders) => setUnpaidOrders(orders.filter((order) => order.status !== 'CANCELLED' && order.paymentStatus !== 'PAID').length)).catch(() => undefined)
    }
    loadUnpaidOrders()
    window.addEventListener('sandala:orders-changed', loadUnpaidOrders)
    return () => window.removeEventListener('sandala:orders-changed', loadUnpaidOrders)
  }, [location.pathname])
  return (
    <aside className="sidebar">
      <div className="brand"><img className="brand-logo full" src={sandalaLogo} alt="Sandala Printer" /><img className="brand-logo mark" src={sandalaIcon} alt="Sandala Printer" /></div>
      <NavLink to="/new-order" className="new-order-button"><Plus size={19} /> طلب جديد <kbd>Ctrl N</kbd></NavLink>
      <nav>
        {items.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Icon size={18} /><span>{label}</span>{to === '/orders' && unpaidOrders > 0 && <b className="sidebar-count-badge" aria-label={`${unpaidOrders} طلب غير مدفوع`}>{unpaidOrders > 99 ? '99+' : formatSidebarCount(unpaidOrders)}</b>}
          </NavLink>
        ))}
      </nav>
      <footer className="sidebar-footer"><div className="sidebar-manager"><UserRound size={20} /><div><span>مدير المطبعة</span><b>محمد وجيه عمري</b></div></div><div className="sidebar-database-status"><span className="status-dot" /> قاعدة البيانات متصلة</div></footer>
    </aside>
  )
}

const formatSidebarCount = (value: number) => new Intl.NumberFormat('en-US', { useGrouping: false }).format(value)
