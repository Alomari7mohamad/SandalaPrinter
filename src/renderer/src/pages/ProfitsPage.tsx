import { BadgeDollarSign, CircleDollarSign, LoaderCircle, Percent, Trophy, WalletCards } from 'lucide-react'
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

export function ProfitsPage() {
  const initialRange = currentMonthRange()
  const [report, setReport] = useState<BusinessReportDto | null>(null)
  const [grouping, setGrouping] = useState<ReportGrouping>('daily')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async (range: ReportRangeInput, nextGrouping: ReportGrouping = grouping) => {
    setLoading(true); setError(''); setGrouping(nextGrouping)
    try { setReport(await window.desktopApi.reports.get(range)) }
    catch (cause) { setError(getArabicError(cause, 'تعذر تحميل بيانات الأرباح.')) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load(initialRange, 'daily') }, [])
  const rows = grouping === 'daily' ? report?.daily ?? [] : report?.monthly ?? []
  const topSelling = [...(report?.services ?? [])].sort((a, b) => b.quantity - a.quantity || b.sales - a.sales).slice(0, 5)

  return <div className="page profits-page">
    <PageHeader title="الأرباح" subtitle="تحليل المبيعات والتكلفة وربح الخدمات حسب الفترة المحددة" />
    {error && <div className="alert error">{error}</div>}
    <ReportFilters initialRange={initialRange} loading={loading} onApply={(range, mode) => void load(range, mode)} />
    {loading && !report ? <div className="panel table-state"><LoaderCircle className="spin" size={27} /> جارٍ حساب الأرباح...</div> : report && <>
      <div className="profit-metrics"><div className="panel sales"><CircleDollarSign /><span>المبيعات</span><b>{formatCurrency(report.summary.sales)}</b></div><div className="panel cost"><WalletCards /><span>تكلفة الخدمات</span><b>{formatCurrency(report.summary.cost)}</b></div><div className="panel gross"><BadgeDollarSign /><span>ربح الخدمات</span><b>{formatCurrency(report.summary.grossProfit)}</b></div><div className="panel margin"><Percent /><span>هامش الربح</span><b>{formatNumber(report.summary.profitMargin, 2, 2)}%</b></div></div>
      <div className="profits-grid">
        <section className="panel catalog-panel"><div className="section-title"><div><h2>حركة الأرباح</h2><p>{grouping === 'daily' ? 'حسب اليوم' : 'حسب الشهر'}</p></div></div>{rows.length === 0 ? <div className="table-state">لا توجد أرباح في الفترة المحددة.</div> : <div className="table-scroll"><table className="data-table profit-table"><thead><tr><th>الفترة</th><th>المبيعات</th><th>التكلفة</th><th>ربح الخدمات</th></tr></thead><tbody>{rows.map((row) => <tr key={row.period}><td><b>{formatPeriod(row.period)}</b><small>{formatNumber(row.ordersCount)} طلب</small></td><td dir="ltr">{formatCurrency(row.sales)}</td><td dir="ltr">{formatCurrency(row.cost)}</td><td dir="ltr" className={row.grossProfit < 0 ? 'negative' : 'positive'}><b>{formatCurrency(row.grossProfit)}</b></td></tr>)}</tbody></table></div>}</section>
        <section className="panel catalog-panel top-selling-services"><div className="section-title"><div><h2>أكثر الخدمات مبيعًا</h2><p>أفضل 5 حسب الكمية المباعة</p></div><Trophy size={21} /></div>{topSelling.length === 0 ? <div className="table-state">لا توجد خدمات مباعة في الفترة.</div> : <div className="top-selling-list">{topSelling.map((row, index) => <div key={`${row.categoryName}-${row.serviceName}`}><span>{formatNumber(index + 1)}</span><div><b>{row.serviceName}</b><small>{row.categoryName ?? 'بدون تصنيف'}</small></div><strong>{formatNumber(row.quantity)} <small>مباعة</small></strong></div>)}</div>}</section>
      </div>
      <section className="panel catalog-panel service-profits-panel"><div className="section-title"><div><h2>ربح الخدمات وكميات البيع</h2><p>تفاصيل كل منتج وخدمة في الفترة المحددة</p></div></div>{report.services.length === 0 ? <div className="table-state">لا توجد خدمات في الفترة.</div> : <div className="table-scroll"><table className="data-table service-profit-table"><thead><tr><th>الخدمة</th><th>الكمية المباعة</th><th>المبيعات</th><th>التكلفة</th><th>الربح</th></tr></thead><tbody>{[...report.services].sort((a, b) => b.profit - a.profit).map((row) => <tr key={`${row.categoryName}-${row.serviceName}`}><td><b>{row.serviceName}</b><small>{row.categoryName}</small></td><td>{formatNumber(row.quantity)}</td><td dir="ltr">{formatCurrency(row.sales)}</td><td dir="ltr">{formatCurrency(row.cost)}</td><td dir="ltr" className={row.profit < 0 ? 'negative' : 'positive'}><b>{formatCurrency(row.profit)}</b></td></tr>)}</tbody></table></div>}</section>
    </>}
  </div>
}
