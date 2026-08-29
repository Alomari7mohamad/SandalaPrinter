import { Banknote, Bell, ChartNoAxesCombined, CheckCheck, ClipboardList, Coins, PackageX, ReceiptText, ShoppingBag, Trash2, TrendingUp, TriangleAlert, Trophy, WalletCards } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BusinessReportDto, DashboardStats, InventoryItemDto } from '../../../shared/contracts'
import { MetricCard } from '../components/MetricCard'
import { PageHeader } from '../components/PageHeader'
import { DailyPerformanceCharts } from '../components/DailyPerformanceCharts'
import { ARABIC_WITH_LATIN_DIGITS, formatCurrency } from '../utils/format'
import { formatNumber } from '../utils/format'
import { getInventoryAlerts } from '../utils/inventory-alerts'
import { currentMonthRange, lastDaysRange } from '../utils/date-range'

const initialStats: DashboardStats = { todaySales: 0, todayCost: 0, todayProfit: 0, todayOrders: 0, monthSales: 0, monthCost: 0, monthProfit: 0, monthExpenses: 0, monthNetProfit: 0, marginPercent: 0 }
const money = (value: number) => formatCurrency(value)
const readStorageKey = 'sandala.inventory-notifications.read'
const dismissedStorageKey = 'sandala.inventory-notifications.dismissed'
const loadStoredKeys = (key: string) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]')
    return new Set<string>(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])
  } catch {
    return new Set<string>()
  }
}
const saveStoredKeys = (key: string, values: Set<string>) => localStorage.setItem(key, JSON.stringify([...values]))
const alertKey = (item: InventoryItemDto) => `${item.id}:${item.updatedAt}:${item.quantity}:${item.lowStockThreshold}`

export function DashboardPage() {
  const [stats, setStats] = useState(initialStats)
  const [inventory, setInventory] = useState<InventoryItemDto[]>([])
  const [monthReport, setMonthReport] = useState<BusinessReportDto | null>(null)
  const [weekReport, setWeekReport] = useState<BusinessReportDto | null>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [readNotifications, setReadNotifications] = useState(() => loadStoredKeys(readStorageKey))
  const [dismissedNotifications, setDismissedNotifications] = useState(() => loadStoredKeys(dismissedStorageKey))
  const [error, setError] = useState('')
  const notificationsRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  useEffect(() => {
    const loadInventory = () => { void window.desktopApi.inventory.list().then(setInventory).catch(() => setError('تعذر تحميل تنبيهات المخزون.')) }
    window.desktopApi.dashboard.getStats().then(setStats).catch(() => setError('تعذر تحميل بيانات لوحة التحكم.'))
    window.desktopApi.reports.get(currentMonthRange()).then(setMonthReport).catch(() => setError('تعذر تحميل مبيعات الشهر الحالي.'))
    window.desktopApi.reports.get(lastDaysRange(7)).then(setWeekReport).catch(() => setError('تعذر تحميل مقارنة الأيام.'))
    loadInventory()
    window.addEventListener('sandala:inventory-changed', loadInventory)
    return () => window.removeEventListener('sandala:inventory-changed', loadInventory)
  }, [])
  useEffect(() => {
    if (!notificationsOpen) return
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) setNotificationsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePress)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress)
  }, [notificationsOpen])
  const alerts = getInventoryAlerts(inventory).map((item) => ({ ...item, notificationKey: alertKey(item) })).filter((item) => !dismissedNotifications.has(item.notificationKey))
  const unreadCount = alerts.filter((item) => !readNotifications.has(item.notificationKey)).length
  const mostRequested = [...(monthReport?.orderedServices ?? [])].sort((a, b) => b.quantity - a.quantity || b.sales - a.sales)[0]
  const topProducts = [...(monthReport?.services ?? [])].sort((a, b) => b.quantity - a.quantity || b.sales - a.sales).slice(0, 5)
  const markAllRead = () => {
    const next = new Set(readNotifications)
    alerts.forEach((item) => next.add(item.notificationKey))
    saveStoredKeys(readStorageKey, next)
    setReadNotifications(next)
  }
  const dismiss = (key: string) => {
    const next = new Set(dismissedNotifications).add(key)
    saveStoredKeys(dismissedStorageKey, next)
    setDismissedNotifications(next)
  }
  const dismissAll = () => {
    const next = new Set(dismissedNotifications)
    alerts.forEach((item) => next.add(item.notificationKey))
    saveStoredKeys(dismissedStorageKey, next)
    setDismissedNotifications(next)
  }
  const openInventoryAlert = (key: string) => {
    const next = new Set(readNotifications).add(key)
    saveStoredKeys(readStorageKey, next)
    setReadNotifications(next)
    setNotificationsOpen(false)
    navigate('/inventory')
  }

  return (
    <div className="page dashboard-page">
      <PageHeader title="الرئيسية" subtitle={`نظرة سريعة على أداء المطبعة • ${new Intl.DateTimeFormat(ARABIC_WITH_LATIN_DIGITS, { dateStyle: 'full' }).format(new Date())}`} action={<div className="inventory-notifications" ref={notificationsRef}><button type="button" className={`notification-bell${unreadCount > 0 ? ' has-alerts' : ''}`} aria-label="تنبيهات المخزون" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((current) => !current)}><Bell size={23} />{unreadCount > 0 && <span>{formatNumber(unreadCount)}</span>}</button>{notificationsOpen && <div className="notification-popover"><header><div><b>تنبيهات المخزون</b><span>{alerts.length > 0 ? `${formatNumber(alerts.length)} أصناف تحتاج المتابعة` : 'المخزون بحالة جيدة'}</span></div><Bell size={20} /></header>{alerts.length > 0 && <div className="notification-toolbar"><button type="button" onClick={markAllRead} disabled={unreadCount === 0}><CheckCheck size={15} /> الكل مقروء</button><button type="button" className="danger" onClick={dismissAll}><Trash2 size={15} /> حذف الكل</button></div>}{alerts.length === 0 ? <div className="notification-empty"><Bell size={27} /><span>لا توجد أصناف منخفضة حاليًا.</span></div> : <div className="notification-list">{alerts.map((item) => <div className={`notification-item${readNotifications.has(item.notificationKey) ? ' read' : ''}`} key={item.notificationKey}><button type="button" className="notification-link" onClick={() => openInventoryAlert(item.notificationKey)}><span className={item.alertType}>{item.alertType === 'out' ? <PackageX size={18} /> : <TriangleAlert size={18} />}</span><div><b>{item.name}</b><small>{item.alertType === 'out' ? 'نفد من المخزون' : 'قارب على النفاد'} • المتبقي {formatNumber(item.quantity)} {item.unit}</small></div></button><button type="button" className="notification-delete" onClick={() => dismiss(item.notificationKey)} title="حذف الإشعار" aria-label={`حذف إشعار ${item.name}`}><Trash2 size={16} /></button></div>)}</div>}<button type="button" className="view-inventory-alerts" onClick={() => { setNotificationsOpen(false); navigate('/inventory') }}>فتح صفحة المخزون</button></div>}</div>} />
      {error && <div className="alert error">{error}</div>}
      <div className="dashboard-section-heading"><div><span>اليوم</span><h2>ملخص العمل الحالي</h2></div><p>الأرقام المالية تظهر للطلبات التي تم تسجيل دفعها</p></div>
      <section className="metrics-grid">
        <MetricCard label="مبيعات اليوم" value={money(stats.todaySales)} icon={WalletCards} tone="green" />
        <MetricCard label="تكلفة مبيعات اليوم" value={money(stats.todayCost)} icon={ReceiptText} tone="red" />
        <MetricCard label="ربح اليوم" value={money(stats.todayProfit)} icon={TrendingUp} tone="green" />
        <MetricCard label="عدد الطلبات اليوم" value={String(stats.todayOrders)} icon={ClipboardList} />
      </section>
      <div className="dashboard-section-heading compact"><div><span>هذا الشهر</span><h2>الصورة المالية العامة</h2></div></div>
      <section className="month-summary dashboard-month-summary">
        <MetricCard label="مبيعات هذا الشهر" value={money(stats.monthSales)} icon={Banknote} />
        <MetricCard label="تكلفة هذا الشهر" value={money(stats.monthCost)} icon={Coins} tone="red" />
        <MetricCard label="ربح هذا الشهر" value={money(stats.monthProfit)} icon={ChartNoAxesCombined} tone="green" />
        <MetricCard label="هامش الربح" value={`${stats.marginPercent.toFixed(1)}%`} icon={TrendingUp} tone="violet" />
      </section>
      <DailyPerformanceCharts rows={weekReport?.daily ?? []} />
      <div className="dashboard-section-heading compact"><div><span>رؤية تشغيلية</span><h2>الأكثر طلبًا ومبيعًا</h2></div></div>
      <section className="dashboard-sales-insights">
        <article className="panel top-requested-card"><Trophy size={28} /><span>المنتج أو الخدمة الأكثر طلبًا هذا الشهر</span>{mostRequested ? <><strong>{mostRequested.serviceName}</strong><small>{mostRequested.categoryName ?? 'بدون تصنيف'} • الكمية المطلوبة {formatNumber(mostRequested.quantity)}</small></> : <><strong>لا توجد طلبات بعد</strong><small>سيظهر المنتج الأول عند تسجيل طلبات هذا الشهر.</small></>}</article>
        <article className="panel monthly-top-products"><div className="panel-heading"><div><h2>أكثر 5 منتجات وخدمات مبيعًا</h2><p>الشهر الحالي • مرتبة حسب الكمية المباعة</p></div><ShoppingBag size={21} /></div>{topProducts.length === 0 ? <div className="empty-state"><ShoppingBag size={34} /><b>لا توجد كميات مباعة هذا الشهر</b></div> : <div className="monthly-top-list">{topProducts.map((item, index) => <div key={`${item.categoryName}-${item.serviceName}`}><span>{formatNumber(index + 1)}</span><div><b>{item.serviceName}</b><small>{item.categoryName ?? 'بدون تصنيف'}</small></div><strong>{formatNumber(item.quantity)} <small>كمية مباعة</small></strong></div>)}</div>}</article>
      </section>
    </div>
  )
}
