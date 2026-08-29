import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { BookOpenText, Boxes, ChartNoAxesCombined, ClipboardList, House, PackageOpen, PanelRightClose, Plus, Settings, ShoppingBasket, Tags, UserRound } from 'lucide-react'
import sandalaLogo from '../assets/sandala-logo.png'
import sandalaIcon from '../assets/sandala-icon.png'

const sections = [
  { label: 'العمل اليومي', items: [['/', 'الرئيسية', House], ['/orders', 'الطلبات', ClipboardList]] },
  { label: 'المنتجات والتشغيل', items: [['/services', 'الخدمات والمنتجات', PackageOpen], ['/pricing', 'الأسعار', Tags], ['/book-printing', 'طباعة الكتب', BookOpenText], ['/inventory', 'المخزون', Boxes], ['/shortages', 'النواقص والطلبيات', ShoppingBasket]] },
  { label: 'التحليل والنظام', items: [['/profits', 'الأرباح', ChartNoAxesCombined], ['/settings', 'الإعدادات', Settings]] },
] as const

export function Sidebar({ onCollapse }: { onCollapse: () => void }) {
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
      <div className="brand"><img className="brand-logo full" src={sandalaLogo} alt="Sandala Printer" /><img className="brand-logo mark" src={sandalaIcon} alt="Sandala Printer" /><div className="brand-caption"><b>Sandala Printer</b><span>نظام إدارة المطبعة</span></div></div>
      <button type="button" className="sidebar-collapse-control" onClick={onCollapse} aria-label="إغلاق القائمة الجانبية" title="إغلاق القائمة الجانبية"><PanelRightClose size={17} /><span>إخفاء القائمة</span></button>
      <NavLink to="/new-order" className="new-order-button"><Plus size={19} /> طلب جديد <kbd>Ctrl N</kbd></NavLink>
      <nav>
        {sections.map((section) => <section className="nav-section" key={section.label}>
          <span className="nav-section-label">{section.label}</span>
          {section.items.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-item-icon"><Icon size={18} /></span><span>{label}</span>{to === '/orders' && unpaidOrders > 0 && <b className="sidebar-count-badge" aria-label={`${unpaidOrders} طلب غير مدفوع`}>{unpaidOrders > 99 ? '99+' : formatSidebarCount(unpaidOrders)}</b>}
            </NavLink>
          ))}
        </section>)}
      </nav>
      <footer className="sidebar-footer"><div className="sidebar-manager"><UserRound size={20} /><div><span>مدير المطبعة</span><b>محمد وجيه عمري</b></div></div><div className="sidebar-database-status"><span className="status-dot" /> قاعدة البيانات متصلة</div></footer>
    </aside>
  )
}

const formatSidebarCount = (value: number) => new Intl.NumberFormat('en-US', { useGrouping: false }).format(value)
