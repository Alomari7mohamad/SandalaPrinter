import { Award, CalendarDays, ClipboardList, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ReportPeriodRowDto } from '../../../shared/contracts'
import { ARABIC_WITH_LATIN_DIGITS, formatCurrency, formatNumber } from '../utils/format'
import { toInputDate } from '../utils/date-range'

interface DailyPoint { date: string; label: string; sales: number; profit: number; orders: number }

const buildSeries = (rows: ReportPeriodRowDto[], reference = new Date()): DailyPoint[] => {
  const byDate = new Map(rows.map((row) => [row.period, row]))
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - 6 + index)
    const key = toInputDate(date)
    const row = byDate.get(key)
    return {
      date: key,
      label: new Intl.DateTimeFormat(ARABIC_WITH_LATIN_DIGITS, { weekday: 'short', day: 'numeric' }).format(date),
      sales: row?.sales ?? 0,
      profit: row?.grossProfit ?? 0,
      orders: row?.ordersCount ?? 0
    }
  })
}

const change = (current: number, previous: number) => previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100
const comparisonText = (current: number, previous: number) => {
  const percentage = change(current, previous)
  if (percentage === null) return current === 0 ? 'لا تغيير عن الأمس' : 'بدأ النشاط اليوم'
  if (Math.abs(percentage) < .01) return 'لا تغيير عن الأمس'
  return `${percentage > 0 ? 'ارتفاع' : 'انخفاض'} ${formatNumber(Math.abs(percentage), 1, 1)}% عن الأمس`
}
const comparisonTone = (current: number, previous: number) => current > previous ? 'up' : current < previous ? 'down' : 'neutral'

export function DailyPerformanceCharts({ rows }: { rows: ReportPeriodRowDto[] }) {
  const series = buildSeries(rows)
  const today = series.at(-1)!
  const yesterday = series.at(-2)!
  const bestDay = [...series].sort((a, b) => b.sales - a.sales)[0]!
  const hasSales = bestDay.sales > 0

  return <section className="daily-performance-section">
    <div className="daily-comparison-cards">
      <article className="panel"><TrendingUp /><span>مبيعات اليوم مقارنة بالأمس</span><strong>{formatCurrency(today.sales)}</strong><small className={comparisonTone(today.sales, yesterday.sales)}>{comparisonText(today.sales, yesterday.sales)}</small></article>
      <article className="panel"><TrendingUp /><span>ربح اليوم مقارنة بالأمس</span><strong>{formatCurrency(today.profit)}</strong><small className={comparisonTone(today.profit, yesterday.profit)}>{comparisonText(today.profit, yesterday.profit)}</small></article>
      <article className="panel"><ClipboardList /><span>طلبات اليوم مقارنة بالأمس</span><strong>{formatNumber(today.orders)}</strong><small className={comparisonTone(today.orders, yesterday.orders)}>{comparisonText(today.orders, yesterday.orders)}</small></article>
      <article className="panel"><Award /><span>أعلى يوم مبيعات خلال 7 أيام</span><strong>{hasSales ? bestDay.label : 'لا توجد مبيعات'}</strong><small>{hasSales ? formatCurrency(bestDay.sales) : 'ستظهر المقارنة بعد تسجيل المبيعات'}</small></article>
    </div>
    <div className="dashboard-charts-grid">
      <article className="panel dashboard-chart-card"><div className="panel-heading"><div><h2>مقارنة المبيعات والأرباح بين الأيام</h2><p>آخر 7 أيام • المبالغ من الطلبات المدفوعة</p></div><TrendingUp size={21} /></div><div className="chart-canvas" dir="ltr"><ResponsiveContainer width="100%" height="100%"><BarChart data={series} margin={{ top: 18, right: 12, left: 4, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eef2" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: '#617582' }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => formatNumber(Number(value))} tick={{ fontSize: 10, fill: '#7a8b96' }} axisLine={false} tickLine={false} width={54} /><Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name === 'sales' ? 'المبيعات' : 'الربح']} labelStyle={{ textAlign: 'right', fontWeight: 700 }} /><Legend formatter={(value) => value === 'sales' ? 'المبيعات' : 'الربح'} /><Bar dataKey="sales" fill="#2583e8" radius={[5, 5, 0, 0]} maxBarSize={38} /><Bar dataKey="profit" fill="#25ad67" radius={[5, 5, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer></div></article>
      <article className="panel dashboard-chart-card"><div className="panel-heading"><div><h2>عدد الطلبات يوميًا</h2><p>مقارنة حركة الطلبات خلال آخر 7 أيام</p></div><CalendarDays size={21} /></div><div className="chart-canvas" dir="ltr"><ResponsiveContainer width="100%" height="100%"><LineChart data={series} margin={{ top: 22, right: 18, left: 0, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eef2" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: '#617582' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#7a8b96' }} axisLine={false} tickLine={false} width={34} /><Tooltip formatter={(value) => [formatNumber(Number(value)), 'عدد الطلبات']} labelStyle={{ textAlign: 'right', fontWeight: 700 }} /><Line type="monotone" dataKey="orders" name="الطلبات" stroke="#7656ce" strokeWidth={3} dot={{ r: 4, fill: '#7656ce', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div></article>
    </div>
  </section>
}
