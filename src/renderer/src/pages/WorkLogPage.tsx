import { CalendarClock, ChevronLeft, ChevronRight, Clock3, Coins, Edit3, LoaderCircle, Save, Sparkles, Trash2, UserRound } from 'lucide-react'
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
  const [increasedHours, setIncreasedHours] = useState('')
  const [hourlyRate, setHourlyRate] = useState(() => localStorage.getItem('sandala.work-log.hourly-rate') ?? '')
  const [additionPercentage, setAdditionPercentage] = useState(() => localStorage.getItem('sandala.work-log.addition-percentage') ?? localStorage.getItem('sandala.work-log.overtime-percentage') ?? '0')
  const [viewMode, setViewMode] = useState<ViewMode>('MONTH')
  const [selectedMonth, setSelectedMonth] = useState(toInputMonth(new Date()))
  const initialRange = currentMonthRange()
  const [customFrom, setCustomFrom] = useState(initialRange.from)
  const [customTo, setCustomTo] = useState(initialRange.to)
  const [report, setReport] = useState<WorkLogReportDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const numeric = (value: string) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0
  const wholeNumberText = (value: string) => value.replace(/[^0-9]/g, '')
  const pay = useMemo(() => calculateWorkPay({ regularHours: numeric(regularHours), increasedHours: numeric(increasedHours), hourlyRate: numeric(hourlyRate), additionPercentage: numeric(additionPercentage) }), [regularHours, increasedHours, hourlyRate, additionPercentage])
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
      await window.desktopApi.workLogs.save({ workDate, regularHours: numeric(regularHours), increasedHours: numeric(increasedHours), hourlyRate: numeric(hourlyRate), additionPercentage: numeric(additionPercentage) })
      localStorage.setItem('sandala.work-log.hourly-rate', hourlyRate)
      localStorage.setItem('sandala.work-log.addition-percentage', additionPercentage)
      setRegularHours(''); setIncreasedHours(''); setSuccess('تم حفظ دوام اليوم والأجر المستحق بنجاح.')
      const savedMonth = workDate.slice(0, 7)
      if (viewMode === 'MONTH' && savedMonth !== selectedMonth) setSelectedMonth(savedMonth)
      else await load(activeRange)
    } catch (cause) { setError(getArabicError(cause, 'تعذر حفظ سجل الدوام.')) }
    finally { setSaving(false) }
  }
  const edit = (row: WorkLogDto) => {
    setWorkDate(row.workDate); setRegularHours(String(row.regularHours)); setIncreasedHours(String(row.increasedHours)); setHourlyRate(String(row.hourlyRate));
    setAdditionPercentage(String(row.additionPercentage)); setSuccess('يمكنك الآن تعديل السجل ثم الضغط على حفظ.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const remove = async (row: WorkLogDto) => {
    if (!window.confirm(`هل تريد حذف سجل العمل ليوم ${dateLabel(row.workDate)}؟\n\nسيُعاد حساب الساعات والأجر الإجمالي مباشرة.`)) return
    setDeletingId(row.id); setError(''); setSuccess('')
    try {
      await window.desktopApi.workLogs.delete(row.id)
      setSuccess('تم حذف يوم العمل وتحديث الإجماليات بنجاح.')
      await load(activeRange)
    } catch (cause) { setError(getArabicError(cause, 'تعذر حذف يوم العمل.')) }
    finally { setDeletingId('') }
  }

  return <div className="page work-log-page">
    <PageHeader title="سجل دوام صاحب المطبعة" subtitle="تسجيل ساعات العمل والأجر المستحق يومياً ومتابعة الإجماليات حسب الشهر أو الفترة" />
    {error && <div className="alert error">{error}</div>}{success && <div className="alert success-alert">{success}</div>}
    <div className="work-log-top-grid">
      <section className="panel work-entry-card">
        <div className="section-title"><div><span className="eyebrow">تسجيل يوم عمل</span><h2>محمد وجيه عمري</h2><p>أدخل الساعات، وسيُحسب أجر اليوم مباشرة قبل الحفظ.</p></div><UserRound size={23} /></div>
        <div className="work-entry-form">
          <label className="work-date-field">تاريخ العمل<input type="date" value={workDate} max={today()} onChange={(event) => setWorkDate(event.target.value)} /></label>
          <label>ساعات بأجر عادي<input type="text" inputMode="numeric" pattern="[0-9]*" dir="ltr" value={regularHours} onChange={(event) => setRegularHours(wholeNumberText(event.target.value))} placeholder="مثال: 6" /></label>
          <label>ساعات بأجر مع زيادة<input type="text" inputMode="numeric" pattern="[0-9]*" dir="ltr" value={increasedHours} onChange={(event) => setIncreasedHours(wholeNumberText(event.target.value))} placeholder="مثال: 2" /></label>
          <label>أجر الساعة<input type="text" inputMode="numeric" pattern="[0-9]*" dir="ltr" value={hourlyRate} onChange={(event) => setHourlyRate(wholeNumberText(event.target.value))} placeholder="مثال: 20" /></label>
          <label><span>نسبة الإضافة على أجر الساعة <b dir="ltr">(%)</b></span><input type="text" inputMode="numeric" pattern="[0-9]*" dir="ltr" value={additionPercentage} onChange={(event) => setAdditionPercentage(wholeNumberText(event.target.value))} placeholder="مثال: 50" /></label>
        </div>
        <div className="daily-pay-preview"><div><span>أجر الساعات العادية</span><b>{formatCurrency(pay.regularPay)}</b></div><div><span>أجر الساعات ذات الزيادة</span><b>{formatCurrency(pay.increasedPay)}</b><small>{formatCurrency(pay.adjustedHourlyRate)} للساعة</small></div><div className="daily-pay-total"><span>أجر اليوم المستحق</span><strong>{formatCurrency(pay.totalPay)}</strong></div></div>
        <button type="button" className="primary-button work-save-button" disabled={saving || !workDate || !Number.isInteger(numeric(regularHours)) || !Number.isInteger(numeric(increasedHours)) || numeric(regularHours) + numeric(increasedHours) < 1 || numeric(regularHours) + numeric(increasedHours) > 24 || !Number.isInteger(numeric(hourlyRate)) || numeric(hourlyRate) < 1} onClick={() => void save()}>{saving ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}{saving ? 'جارٍ الحفظ...' : 'حفظ دوام اليوم'}</button>
      </section>

      <section className="work-summary-column">
        <div className="work-period-toolbar panel"><div className="work-view-switch"><button className={viewMode === 'MONTH' ? 'active' : ''} onClick={() => setViewMode('MONTH')}>حسب الشهر</button><button className={viewMode === 'CUSTOM' ? 'active' : ''} onClick={() => setViewMode('CUSTOM')}>من يوم إلى يوم</button></div>{viewMode === 'MONTH' ? <div className="month-navigator"><button aria-label="الشهر السابق" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}><ChevronRight size={18} /></button><b>{monthLabel(selectedMonth)}</b><button aria-label="الشهر التالي" disabled={selectedMonth >= toInputMonth(new Date())} onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}><ChevronLeft size={18} /></button></div> : <div className="custom-work-range"><label>من<input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></label><label>إلى<input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></label><button className="primary-button" disabled={loading || !customFrom || !customTo || customFrom > customTo} onClick={() => void load({ from: customFrom, to: customTo })}>عرض</button></div>}</div>
        <div className="work-summary-grid"><div className="panel"><Clock3 /><span>ساعات بأجر عادي</span><b>{formatNumber(report?.summary.regularHours ?? 0, 0, 2)}</b></div><div className="panel overtime"><Sparkles /><span>ساعات بأجر مع زيادة</span><b>{formatNumber(report?.summary.increasedHours ?? 0, 0, 2)}</b></div><div className="panel"><CalendarClock /><span>أيام العمل</span><b>{formatNumber(report?.summary.workDays ?? 0)}</b><small>إجمالي الساعات: {formatNumber(report?.summary.totalHours ?? 0, 0, 2)}</small></div><div className="panel total"><Coins /><span>إجمالي الأجر المستحق</span><b>{formatCurrency(report?.summary.totalPay ?? 0)}</b></div></div>
      </section>
    </div>

    <section className="panel work-log-list"><div className="section-title"><div><h2>تفاصيل أيام العمل</h2><p>{viewMode === 'MONTH' ? monthLabel(selectedMonth) : `${dateLabel(customFrom)} — ${dateLabel(customTo)}`}</p></div><CalendarClock size={22} /></div>{loading ? <div className="table-state"><LoaderCircle className="spin" size={26} /> جارٍ تحميل السجل...</div> : !report || report.rows.length === 0 ? <div className="empty-state large"><Clock3 size={40} /><b>لا توجد أيام عمل مسجلة</b><span>أدخل ساعات أول يوم عمل من النموذج في أعلى الصفحة.</span></div> : <div className="table-scroll"><table className="data-table work-log-table"><thead><tr><th>التاريخ</th><th>ساعات عادية</th><th>ساعات بزيادة</th><th>أجر الساعة</th><th>نسبة الزيادة</th><th>أجر اليوم</th><th></th></tr></thead><tbody>{report.rows.map((row) => <tr key={row.id}><td><b>{dateLabel(row.workDate)}</b></td><td>{formatNumber(row.regularHours, 0, 2)}</td><td>{formatNumber(row.increasedHours, 0, 2)}</td><td>{formatCurrency(row.hourlyRate)}</td><td>{formatNumber(row.additionPercentage, 0, 2)}%</td><td><b>{formatCurrency(row.totalPay)}</b><small>عادي {formatCurrency(row.regularPay)} • مع الزيادة {formatCurrency(row.increasedPay)}</small></td><td><div className="row-actions"><button className="icon-button" title="تعديل اليوم" disabled={Boolean(deletingId)} onClick={() => edit(row)}><Edit3 size={17} /></button><button className="icon-button danger" title="حذف يوم العمل" aria-label={`حذف سجل ${dateLabel(row.workDate)}`} disabled={Boolean(deletingId)} onClick={() => void remove(row)}>{deletingId === row.id ? <LoaderCircle className="spin" size={17} /> : <Trash2 size={17} />}</button></div></td></tr>)}</tbody></table></div>}</section>
  </div>
}
