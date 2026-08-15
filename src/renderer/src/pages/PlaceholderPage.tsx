import { Construction } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'

export function PlaceholderPage({ title, phase }: { title: string; phase: string }) {
  return <div className="page"><PageHeader title={title} /><div className="panel phase-placeholder"><Construction size={48} /><h2>البنية جاهزة</h2><p>هذه الوحدة مجدولة للتنفيذ الكامل ضمن {phase}.</p></div></div>
}
