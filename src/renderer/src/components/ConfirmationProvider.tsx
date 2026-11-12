import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Modal } from './Modal'

type Confirm = (message: string) => Promise<boolean>
const ConfirmationContext = createContext<Confirm | null>(null)

// Native window.confirm can leave Electron's renderer without keyboard focus on
// Windows. Keep confirmations in the renderer and restore focus in Modal.
export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const pending = useRef<((accepted: boolean) => void) | null>(null)
  const finish = useCallback((accepted: boolean) => {
    pending.current?.(accepted)
    pending.current = null
    setMessage(null)
  }, [])
  const confirm = useCallback<Confirm>((text) => {
    if (pending.current) return Promise.resolve(false)
    return new Promise((resolve) => { pending.current = resolve; setMessage(text) })
  }, [])
  useEffect(() => () => { pending.current?.(false); pending.current = null }, [])
  return <ConfirmationContext.Provider value={confirm}>
    {children}
    {message !== null && <Modal title="تأكيد العملية" onClose={() => finish(false)}>
      <p style={{ whiteSpace: 'pre-line' }}>{message}</p>
      <div className="dialog-actions">
        <button type="button" className="secondary-button" onClick={() => finish(false)}>إلغاء</button>
        <button type="button" className="danger-button" onClick={() => finish(true)}>تأكيد</button>
      </div>
    </Modal>}
  </ConfirmationContext.Provider>
}

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmationContext)
  if (!confirm) throw new Error('ConfirmationProvider is missing')
  return confirm
}
