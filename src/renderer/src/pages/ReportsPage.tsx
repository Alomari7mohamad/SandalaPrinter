import { ClipboardList, Coins, Layers3, LoaderCircle, ReceiptText } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { BusinessReportDto, ReportRangeInput } from '../../../shared/contracts'
import { PageHeader } from '../components/PageHeader'
import { ReportFilters, type ReportGrouping } from '../components/ReportFilters'
import { currentMonthRange } from '../utils/date-range'
import { getArabicError } from '../utils/errors'
import { ARABIC_WITH_LATIN_DIGITS, formatCurrency, formatNumber } from '../utils/format'

const formatPeriod = (period: string) => period.length === 7
  ? new Intl.DateTimeFormat(ARABIC_WITH_LATIN_DIGITS, { month: 'long', year: 'numeric' }).format(new Date(`${period}-15T12:00:00`))
  : new Intl.DateTimeFormat(ARABIC_WITH_LATIN_DIGITS, { dateStyle: 'medium' }).format(new Date(`${period}T12:00:00`))

export function ReportsPage() {
  const initialRange = currentMonthRange()
  const [report, setReport] = useState<BusinessReportDto | null>(null)
  const [grouping, setGrouping] = useState<ReportGrouping>('daily')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async (range: ReportRangeInput, nextGrouping: ReportGrouping = grouping) => {
    setLoading(true); setError(''); setGrouping(nextGrouping)
    try { setReport(await window.desktopApi.reports.get(range)) }
    catch (cause) { setError(getArabicError(cause, 'تعذر تحميل التقرير.')) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load(initialRange, 'daily') }, [])
  const rows = grouping === 'daily' ? report?.daily ?? [] : report?.monthly ?? []

  return <div className="page reports-page">
    <PageHeader title="التقارير" subtitle="راجع المبيعات والطلبات والخدمات خلال أيام أو أشهر محددة" />
    {error && <div className="alert error">{error}</div>}
    <ReportFilters initialRange={initialRange} loading={loading} onApply={(range, mode) => void load(range, mode)} />
    {loading && !report ? <div className="panel table-state"><LoaderCircle className="spin" size={27} /> جارٍ إعداد التقرير...</div> : report && <>
      <div className="report-metrics"><div className="panel"><ClipboardList /><span>عدد الطلبات</span><b>{formatNumber(report.summary.ordersCount)}</b></div><div className="panel"><Coins /><span>إجمالي المبيعات</span><b>{formatCurrency(report.summary.sales)}</b></div><div className="panel"><ReceiptText /><span>متوسط الطلب</span><b>{formatCurrency(report.summary.averageOrder)}</b></div><div className="panel"><Layers3 /><span>إجمالي الكميات</span><b>{formatNumber(report.summary.itemsQuantity)}</b></div></div>
      <div className="reports-grid">
        <section className="panel catalog-panel"><div className="section-title"><div><h2>{grouping === 'daily' ? 'تفصيل الأيام' : 'تفصيل الأشهر'}</h2><p>المبيعات والتكلفة والربح لكل فترة</p></div></div>{rows.length === 0 ? <div className="table-state">لا توجد حركة في الفترة المحددة.</div> : <div className="table-scroll"><table className="data-table period-report-table"><thead><tr><th>الفترة</th><th>الطلبات</th><th>المبيعات</th><th>التكلفة</th><th>الربح</th></tr></thead><tbody>{rows.map((row) => <tr key={row.period}><td><b>{formatPeriod(row.period)}</b></td><td>{formatNumber(row.ordersCount)}</td><td dir="ltr">{formatCurrency(row.sales)}</td><td dir="ltr">{formatCurrency(row.cost)}</td><td dir="ltr" className={row.grossProfit < 0 ? 'negative' : 'positive'}>{formatCurrency(row.grossProfit)}</td></tr>)}</tbody></table></div>}</section>
        <section className="panel catalog-panel"><div className="section-title"><div><h2>الخدمات المباعة</h2><p>مرتبة حسب قيمة المبيعات</p></div></div>{report.services.length === 0 ? <div className="table-state">لا توجد خدمات مباعة.</div> : <div className="table-scroll"><table className="data-table service-report-table"><thead><tr><th>الخدمة</th><th>الكمية</th><th>المبيعات</th><th>الربح</th></tr></thead><tbody>{report.services.map((row) => <tr key={`${row.categoryName}-${row.serviceName}`}><td><b>{row.serviceName}</b><small>{row.categoryName}</small></td><td>{formatNumber(row.quantity)}</td><td dir="ltr">{formatCurrency(row.sales)}</td><td dir="ltr" className={row.profit < 0 ? 'negative' : 'positive'}>{formatCurrency(row.profit)}</td></tr>)}</tbody></table></div>}</section>
      </div>
    </>}
  </div>
}
