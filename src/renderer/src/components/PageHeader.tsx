import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <header className="page-header"><div><span className="page-eyebrow">Sandala Printer</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action && <div className="page-header-action">{action}</div>}</header>
}
