import { Download, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UpdateStatusDto } from '../../../shared/contracts'

export function UpdateNotification() {
  const [status, setStatus] = useState<UpdateStatusDto | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    void window.desktopApi.updates.getStatus().then(setStatus)
    return window.desktopApi.updates.onStatusChanged(setStatus)
  }, [])

  if (!status || !['available', 'downloading', 'downloaded'].includes(status.state)) return null
  return <div className={`update-notification ${status.state}`}>
    {status.state === 'downloaded' ? <RefreshCw size={21} /> : <Download size={21} />}
    <div><b>{status.state === 'downloaded' ? 'التحديث جاهز للتثبيت' : 'يوجد تحديث جديد للتطبيق'}</b><span>{status.message}</span></div>
    <button type="button" onClick={() => navigate('/settings')}>فتح الإعدادات</button>
  </div>
}
