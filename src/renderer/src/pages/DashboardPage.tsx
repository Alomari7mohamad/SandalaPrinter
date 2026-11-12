import { Banknote, ChartNoAxesCombined, ClipboardList, Coins, ReceiptText, ShoppingBag, TrendingUp, Trophy, WalletCards } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { BusinessReportDto, DashboardStats } from '../../../shared/contracts'
import { MetricCard } from '../components/MetricCard'
import { PageHeader } from '../components/PageHeader'
import { DailyPerformanceCharts } from '../components/DailyPerformanceCharts'
import { ARABIC_WITH_LATIN_DIGITS, formatCurrency } from '../utils/format'
import { formatNumber } from '../utils/format'
import { currentMonthRange, lastDaysRange } from '../utils/date-range'

const initialStats: DashboardStats = { todaySales: 0, todayCost: 0, todayProfit: 0, todayOrders: 0, monthSales: 0, monthCost: 0, monthProfit: 0, monthExpenses: 0, monthNetProfit: 0, marginPercent: 0 }
const money = (value: number) => formatCurrency(value)
export function DashboardPage() {
  const [stats, setStats] = useState(initialStats)

  const [monthReport, setMonthReport] = useState<BusinessReportDto | null>(null)
  const [weekReport, setWeekReport] = useState<BusinessReportDto | null>(null)



  const [error, setError] = useState('')


  useEffect(() => {

    window.desktopApi.dashboard.getStats().then(setStats).catch((cause) => setError(getArabicError(cause, 'تعذر تحميل بيانات لوحة التحكم.')))
    window.desktopApi.reports.get(currentMonthRange()).then(setMonthReport).catch((cause) => setError(getArabicError(cause, 'تعذر تحميل مبيعات الشهر الحالي.')))
    window.desktopApi.reports.get(lastDaysRange(7)).then(setWeekReport).catch((cause) => setError(getArabicError(cause, 'تعذر تحميل مقارنة الأيام.')))



  }, [])
  const mostRequested = [...(monthReport?.orderedServices ?? [])].sort((a, b) => b.quantity - a.quantity || b.sales - a.sales)[0]
  const topProducts = [...(monthReport?.services ?? [])].sort((a, b) => b.quantity - a.quantity || b.sales - a.sales).slice(0, 5)
  return (
    <div className="page dashboard-page">
      <PageHeader title="الرئيسية" subtitle={`نظرة سريعة على أداء المطبعة • ${new Intl.DateTimeFormat(ARABIC_WITH_LATIN_DIGITS, { dateStyle: 'full' }).format(new Date())}`} />
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
        <article className="panel top-requested-card"><Trophy size={28} /><span>الأكثر طلبًا هذا الشهر</span>{mostRequested ? <><strong>{mostRequested.serviceName}</strong><small>{mostRequested.categoryName ?? 'بدون تصنيف'} • الكمية المطلوبة {formatNumber(mostRequested.quantity)}</small></> : <><strong>لا توجد طلبات بعد</strong><small>ستظهر الخدمة الأولى عند تسجيل طلبات هذا الشهر.</small></>}</article>
        <article className="panel monthly-top-products"><div className="panel-heading"><div><h2>أكثر 5 منتجات وخدمات مبيعًا</h2><p>الشهر الحالي • مرتبة حسب الكمية المباعة</p></div><ShoppingBag size={21} /></div>{topProducts.length === 0 ? <div className="empty-state"><ShoppingBag size={34} /><b>لا توجد كميات مباعة هذا الشهر</b></div> : <div className="monthly-top-list">{topProducts.map((item, index) => <div key={`${item.categoryName}-${item.serviceName}`}><span>{formatNumber(index + 1)}</span><div><b>{item.serviceName}</b><small>{item.categoryName ?? 'بدون تصنيف'}</small></div><strong>{formatNumber(item.quantity)} <small>كمية مباعة</small></strong></div>)}</div>}</article>
      </section>
    </div>
  )
}
import { getArabicError } from '../utils/errors'
