import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const dialogRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const frame = requestAnimationFrame(() => {
      window.focus()
      const firstField = dialogRef.current?.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), select:not([disabled]), .secondary-button')
      firstField?.focus()
    })
    return () => { cancelAnimationFrame(frame); if (previous?.isConnected) previous.focus() }
  }, [])
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section ref={dialogRef} className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); return }
      if (event.key !== 'Tab') return
      const fields = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]') ?? [])
      const first = fields[0], last = fields[fields.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}>
      <header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={19} /></button></header>
      <div className="modal-body">{children}</div>
    </section>
  </div>
}
