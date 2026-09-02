import { CalendarClock, ChevronLeft, ChevronRight, Clock3, Coins, Edit3, LoaderCircle, Save, Sparkles, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { ReportRangeInput, WorkLogDto, WorkLogReportDto } from '../../../shared/contracts'
import { calculateWorkPay } from '../../../shared/work-logs/work-pay'
import { PageHeader } from '../components/PageHeader'
import { currentMonthRange, monthRange, toInputDate, toInputMonth } from '../utils/date-range'
import { getArabicError } from '../utils/errors'
import { ARABIC_WITH_LATIN_DIGITS, formatCurrency, formatNumber } from '../utils/format'

type ViewMode = 'MONTH' | 'CUSTOM'
const today = () => toInputDate(new Date())
const monthLabel = (month: string) => new Intl.DateTimeFormat(ARABIC_WITH_LATIN_DIGITS, { month: 'long', year: 'numeric' }).format(new Date(`${month}-15T12:00:00`))
const dateLabel = (date: string) => new Intl.DateTimeFormat(ARABIC_WITH_LATIN_DIGITS, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`))
const shiftMonth = (month: string, amount: number) => {
  const [year, number] = month.split('-').map(Number)
  return toInputMonth(new Date(year!, number! - 1 + amount, 1))
}

export function WorkLogPage() {
  const [workDate, setWorkDate] = useState(today)
  const [regularHours, setRegularHours] = useState('')
  const [overtimeHours, setOvertimeHours] = useState('')
  const [hourlyRate, setHourlyRate] = useState(() => localStorage.getItem('sandala.work-log.hourly-rate') ?? '')
  const [overtimePercentage, setOvertimePercentage] = useState(() => localStorage.getItem('sandala.work-log.overtime-percentage') ?? '50')
  const [viewMode, setViewMode] = useState<ViewMode>('MONTH')
  const [selectedMonth, setSelectedMonth] = useState(toInputMonth(new Date()))
  const initialRange = currentMonthRange()
  const [customFrom, setCustomFrom] = useState(initialRange.from)
  const [customTo, setCustomTo] = useState(initialRange.to)
  const [report, setReport] = useState<WorkLogReportDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const numeric = (value: string) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0
  const pay = useMemo(() => calculateWorkPay({ regularHours: numeric(regularHours), overtimeHours: numeric(overtimeHours), hourlyRate: numeric(hourlyRate), overtimePercentage: numeric(overtimePercentage) }), [regularHours, overtimeHours, hourlyRate, overtimePercentage])
  const activeRange: ReportRangeInput = viewMode === 'MONTH' ? monthRange(selectedMonth, selectedMonth) : { from: customFrom, to: customTo }

  const load = async (range: ReportRangeInput = activeRange) => {
    setLoading(true); setError('')
    try { setReport(await window.desktopApi.workLogs.getReport(range)) }
    catch (cause) { setError(getArabicError(cause, 'تعذر تحميل سجل الدوام.')) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load(activeRange) }, [viewMode, selectedMonth])

  const save = async () => {
    setSaving(true); setError(''); setSuccess('')
    try {
      await window.desktopApi.workLogs.save({ workDate, regularHours: numeric(regularHours), overtimeHours: numeric(overtimeHours), hourlyRate: numeric(hourlyRate), overtimePercentage: numeric(overtimePercentage) })
      localStorage.setItem('sandala.work-log.hourly-rate', hourlyRate)
      localStorage.setItem('sandala.work-log.overtime-percentage', overtimePercentage)
      setRegularHours(''); setOvertimeHours(''); setSuccess('تم حفظ دوام اليوم والأجر المستحق بنجاح.')
      const savedMonth = workDate.slice(0, 7)
      if (viewMode === 'MONTH' && savedMonth !== selectedMonth) setSelectedMonth(savedMonth)
      else await load(activeRange)
    } catch (cause) { setError(getArabicError(cause, 'تعذر حفظ سجل الدوام.')) }
    finally { setSaving(false) }
  }
  const edit = (row: WorkLogDto) => {
    setWorkDate(row.workDate); setRegularHours(String(row.regularHours)); setOvertimeHours(String(row.overtimeHours));
    setHourlyRate(String(row.hourlyRate)); setOvertimePercentage(String(row.overtimePercentage)); setSuccess('يمكنك الآن تعديل السجل ثم الضغط على حفظ.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return <div className="page work-log-page">
    <PageHeader title="سجل دوام صاحب المطبعة" subtitle="تسجيل ساعات العمل والأجر المستحق يومياً ومتابعة الإجماليات حسب الشهر أو الفترة" />
    {error && <div className="alert error">{error}</div>}{success && <div className="alert success-alert">{success}</div>}
    <div className="work-log-top-grid">
      <section className="panel work-entry-card">
        <div className="section-title"><div><span className="eyebrow">تسجيل يوم عمل</span><h2>محمد وجيه عمري</h2><p>أدخل الساعات، وسيُحسب أجر اليوم مباشرة قبل الحفظ.</p></div><UserRound size={23} /></div>
        <div className="work-entry-form">
          <label className="work-date-field">تاريخ العمل<input type="date" value={workDate} max={today()} onChange={(event) => setWorkDate(event.target.value)} /></label>
          <label>الساعات العادية<input type="number" min="0" max="24" step="0.25" value={regularHours} onChange={(event) => setRegularHours(event.target.value)} placeholder="مثال: 8" /></label>
          <label>الساعات الإضافية<input type="number" min="0" max="24" step="0.25" value={overtimeHours} onChange={(event) => setOvertimeHours(event.target.value)} placeholder="مثال: 2" /></label>
          <label>أجر الساعة<input type="number" min="0" step="0.01" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} placeholder="₪ 0.00" /></label>
          <label>زيادة الأجر الإضافي<input type="number" min="0" step="1" value={overtimePercentage} onChange={(event) => setOvertimePercentage(event.target.value)} placeholder="50" /><span className="field-suffix">%</span></label>
        </div>
        <div className="daily-pay-preview"><div><span>أجر الساعات العادية</span><b>{formatCurrency(pay.regularPay)}</b></div><div><span>أجر الساعات الإضافية</span><b>{formatCurrency(pay.overtimePay)}</b></div><div className="daily-pay-total"><span>أجر اليوم المستحق</span><strong>{formatCurrency(pay.totalPay)}</strong></div></div>
        <button type="button" className="primary-button work-save-button" disabled={saving || !workDate || numeric(regularHours) + numeric(overtimeHours) <= 0 || numeric(hourlyRate) <= 0 || numeric(regularHours) + numeric(overtimeHours) > 24} onClick={() => void save()}>{saving ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}{saving ? 'جارٍ الحفظ...' : 'حفظ دوام اليوم'}</button>
      </section>

      <section className="work-summary-column">
        <div className="work-period-toolbar panel"><div className="work-view-switch"><button className={viewMode === 'MONTH' ? 'active' : ''} onClick={() => setViewMode('MONTH')}>حسب الشهر</button><button className={viewMode === 'CUSTOM' ? 'active' : ''} onClick={() => setViewMode('CUSTOM')}>من يوم إلى يوم</button></div>{viewMode === 'MONTH' ? <div className="month-navigator"><button aria-label="الشهر السابق" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}><ChevronRight size={18} /></button><b>{monthLabel(selectedMonth)}</b><button aria-label="الشهر التالي" disabled={selectedMonth >= toInputMonth(new Date())} onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}><ChevronLeft size={18} /></button></div> : <div className="custom-work-range"><label>من<input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></label><label>إلى<input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></label><button className="primary-button" disabled={loading || !customFrom || !customTo || customFrom > customTo} onClick={() => void load({ from: customFrom, to: customTo })}>عرض</button></div>}</div>
        <div className="work-summary-grid"><div className="panel"><Clock3 /><span>الساعات العادية</span><b>{formatNumber(report?.summary.regularHours ?? 0, 0, 2)}</b></div><div className="panel overtime"><Sparkles /><span>الساعات الإضافية</span><b>{formatNumber(report?.summary.overtimeHours ?? 0, 0, 2)}</b></div><div className="panel"><CalendarClock /><span>أيام العمل</span><b>{formatNumber(report?.summary.workDays ?? 0)}</b></div><div className="panel total"><Coins /><span>إجمالي الأجر المستحق</span><b>{formatCurrency(report?.summary.totalPay ?? 0)}</b></div></div>
      </section>
    </div>

    <section className="panel work-log-list"><div className="section-title"><div><h2>تفاصيل أيام العمل</h2><p>{viewMode === 'MONTH' ? monthLabel(selectedMonth) : `${dateLabel(customFrom)} — ${dateLabel(customTo)}`}</p></div><CalendarClock size={22} /></div>{loading ? <div className="table-state"><LoaderCircle className="spin" size={26} /> جارٍ تحميل السجل...</div> : !report || report.rows.length === 0 ? <div className="empty-state large"><Clock3 size={40} /><b>لا توجد أيام عمل مسجلة</b><span>أدخل ساعات أول يوم عمل من النموذج في أعلى الصفحة.</span></div> : <div className="table-scroll"><table className="data-table work-log-table"><thead><tr><th>التاريخ</th><th>الساعات العادية</th><th>الساعات الإضافية</th><th>أجر الساعة</th><th>نسبة الإضافي</th><th>أجر اليوم</th><th></th></tr></thead><tbody>{report.rows.map((row) => <tr key={row.id}><td><b>{dateLabel(row.workDate)}</b></td><td>{formatNumber(row.regularHours, 0, 2)}</td><td>{formatNumber(row.overtimeHours, 0, 2)}</td><td>{formatCurrency(row.hourlyRate)}</td><td>{formatNumber(row.overtimePercentage, 0, 2)}%</td><td><b>{formatCurrency(row.totalPay)}</b><small>عادي {formatCurrency(row.regularPay)} • إضافي {formatCurrency(row.overtimePay)}</small></td><td><button className="icon-button" title="تعديل اليوم" onClick={() => edit(row)}><Edit3 size={17} /></button></td></tr>)}</tbody></table></div>}</section>
  </div>
}
