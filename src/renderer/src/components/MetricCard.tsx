import type { LucideIcon } from 'lucide-react'

export function MetricCard({ label, value, icon: Icon, tone = 'blue' }: { label: string; value: string; icon: LucideIcon; tone?: 'blue' | 'green' | 'red' | 'violet' }) {
  return <article className={`metric-card tone-${tone}`}><div className={`metric-icon ${tone}`}><Icon size={22} /></div><div className="metric-content"><span>{label}</span><strong dir="ltr">{value}</strong></div><span className="metric-accent" /></article>
}
