import { CalendarDays, LoaderCircle, Search } from 'lucide-react'
import { useState } from 'react'
import type { ReportRangeInput } from '../../../shared/contracts'
import { monthRange, toInputDate, toInputMonth } from '../utils/date-range'

export type ReportGrouping = 'daily' | 'monthly'

export function ReportFilters({ initialRange, loading, onApply }: { initialRange: ReportRangeInput; loading: boolean; onApply: (range: ReportRangeInput, grouping: ReportGrouping) => void }) {
  const [mode, setMode] = useState<ReportGrouping>('daily')
  const [from, setFrom] = useState(initialRange.from)
  const [to, setTo] = useState(initialRange.to)
  const [fromMonth, setFromMonth] = useState(initialRange.from.slice(0, 7))
  const [toMonth, setToMonth] = useState(initialRange.to.slice(0, 7))

  const apply = () => onApply(mode === 'daily' ? { from, to } : monthRange(fromMonth, toMonth), mode)
  const today = () => {
    const value = toInputDate(new Date())
    setMode('daily'); setFrom(value); setTo(value); onApply({ from: value, to: value }, 'daily')
  }
  const thisMonth = () => {
    const value = toInputMonth(new Date())
    const range = monthRange(value, value)
    setMode('monthly'); setFromMonth(value); setToMonth(value); onApply(range, 'monthly')
  }

  return <section className="panel report-filters">
    <div className="range-mode-switch"><button className={mode === 'daily' ? 'active' : ''} onClick={() => setMode('daily')}>أيام محددة</button><button className={mode === 'monthly' ? 'active' : ''} onClick={() => setMode('monthly')}>أشهر محددة</button></div>
    <div className="range-inputs">
      {mode === 'daily' ? (
        <>
          <label>من تاريخ<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>إلى تاريخ<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        </>
      ) : (
        <>
          <label>من شهر<input type="month" value={fromMonth} onChange={(event) => setFromMonth(event.target.value)} /></label>
          <label>إلى شهر<input type="month" value={toMonth} onChange={(event) => setToMonth(event.target.value)} /></label>
        </>
      )}
      <button className="primary-button" disabled={loading} onClick={apply}>{loading ? <LoaderCircle className="spin" size={17} /> : <Search size={17} />} عرض النتائج</button>
    </div>
    <div className="range-presets"><CalendarDays size={16} /><span>اختصار:</span><button onClick={today}>اليوم</button><button onClick={thisMonth}>هذا الشهر</button></div>
  </section>
}
