import { CheckCircle2, Download, LoaderCircle, RefreshCw, Save, Settings, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DEFAULT_UPDATE_FEED_URL, type AppInfo, type UpdateSettingsDto, type UpdateStatusDto } from '../../../shared/contracts'
import { PageHeader } from '../components/PageHeader'
import { getArabicError } from '../utils/errors'
import { formatNumber } from '../utils/format'

const initialSettings: UpdateSettingsDto = { feedUrl: DEFAULT_UPDATE_FEED_URL, autoCheck: true }

export function SettingsPage() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [settings, setSettings] = useState(initialSettings)
  const [status, setStatus] = useState<UpdateStatusDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [clearingSales, setClearingSales] = useState(false)
  const [salesClearMessage, setSalesClearMessage] = useState('')

  useEffect(() => {
    Promise.all([window.desktopApi.app.getInfo(), window.desktopApi.updates.getSettings(), window.desktopApi.updates.getStatus()])
      .then(([info, updateSettings, updateStatus]) => { setAppInfo(info); setSettings(updateSettings); setStatus(updateStatus) })
      .catch((cause) => setError(getArabicError(cause, 'تعذر تحميل الإعدادات.')))
      .finally(() => setLoading(false))
    return window.desktopApi.updates.onStatusChanged(setStatus)
  }, [])

  const saveSettings = async () => {
    setBusy('save'); setError(''); setSaved(false)
    try { setSettings(await window.desktopApi.updates.saveSettings(settings)); setSaved(true) }
    catch (cause) { setError(getArabicError(cause, 'تعذر حفظ إعدادات التحديث.')) }
    finally { setBusy('') }
  }
  const check = async () => {
    setBusy('check'); setError(''); setSaved(false)
    try { setStatus(await window.desktopApi.updates.check()) }
    catch (cause) { setError(getArabicError(cause, 'تعذر فحص التحديثات.')) }
    finally { setBusy('') }
  }
  const download = async () => {
    setBusy('download'); setError('')
    try { await window.desktopApi.updates.download() }
    catch (cause) { setError(getArabicError(cause, 'تعذر تنزيل التحديث.')) }
    finally { setBusy('') }
  }
  const install = async () => {
    setBusy('install'); setError('')
    try { await window.desktopApi.updates.install() }
    catch (cause) { setError(getArabicError(cause, 'تعذر بدء تثبيت التحديث.')) ; setBusy('') }
  }
  const clearSales = async () => {
    const confirmed = window.confirm('سيتم حذف جميع الطلبات وبنود الطلب والمدفوعات وأرقام المبيعات والأرباح نهائيًا.\n\nلن يتم حذف التصنيفات أو الخدمات أو المنتجات أو الأسعار أو بيانات المخزون.\n\nهل تريد متابعة الحذف؟')
    if (!confirmed) return
    setClearingSales(true); setError(''); setSalesClearMessage('')
    try {
      const result = await window.desktopApi.maintenance.clearSalesData('DELETE_SALES')
      setSalesClearMessage(result.ordersDeleted > 0 ? `تم حذف ${formatNumber(result.ordersDeleted)} طلب وإعادة بيانات المبيعات إلى الصفر.` : 'لا توجد بيانات مبيعات لحذفها.')
      window.dispatchEvent(new Event('sandala:orders-changed'))
    } catch (cause) { setError(getArabicError(cause, 'تعذر حذف بيانات المبيعات.')) }
    finally { setClearingSales(false) }
  }

  return <div className="page settings-page">
    <PageHeader title="الإعدادات" subtitle="إعداد تحديثات Sandala Printer وإدارة الإصدار" />
    {error && <div className="alert error">{error}</div>}
    {saved && <div className="alert success-alert"><CheckCircle2 size={19} /><b>تم حفظ إعدادات التحديث.</b></div>}
    {salesClearMessage && <div className="alert success-alert"><CheckCircle2 size={19} /><b>{salesClearMessage}</b></div>}
    {loading ? <div className="table-state"><LoaderCircle className="spin" size={26} /> جارٍ تحميل الإعدادات...</div> : <div className="settings-grid">
      <section className="panel app-version-card"><div className="settings-icon"><Settings /></div><div><span>الإصدار المثبت</span><b dir="ltr">Sandala Printer {appInfo?.version ?? '—'}</b><small>قاعدة بياناتك تبقى محفوظة عند تثبيت التحديثات.</small></div></section>
      <section className="panel update-settings-card">
        <div className="section-title"><div><h2>تحديث التطبيق</h2><p>يفحص التطبيق الإصدارات الجديدة وينزّلها ويثبتها دون تنزيل البرنامج يدويًا.</p></div><RefreshCw size={23} /></div>
        <div className="update-settings-form">
          <label>رابط مصدر التحديث<input dir="ltr" type="url" value={settings.feedUrl} onChange={(event) => setSettings({ ...settings, feedUrl: event.target.value })} placeholder="https://updates.example.com/sandala-printer" /></label>
          <label className="auto-update-check"><input type="checkbox" checked={settings.autoCheck} onChange={(event) => setSettings({ ...settings, autoCheck: event.target.checked })} /><span><b>فحص التحديث تلقائيًا</b><small>سيظهر إشعار داخل التطبيق فور توفر إصدار أحدث.</small></span></label>
          <div className="update-form-actions"><button className="secondary-button" disabled={Boolean(busy)} onClick={() => void saveSettings()}>{busy === 'save' ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />} حفظ الإعدادات</button><button className="primary-button" disabled={Boolean(busy)} onClick={() => void check()}>{busy === 'check' ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />} فحص الآن</button></div>
        </div>
      </section>
      <section className={`panel update-status-card ${status?.state ?? 'idle'}`}>
        <div><ShieldCheck size={25} /><span>حالة التحديث</span></div><b>{status?.message ?? 'جاهز لفحص التحديثات.'}</b>
        {status?.availableVersion && <small dir="ltr">Version {status.availableVersion}</small>}
        {(status?.state === 'downloading' || status?.state === 'installing') && <div className="update-progress"><span style={{ width: `${status.progress ?? 0}%` }} /><b>{status.state === 'installing' ? 'جارٍ التثبيت...' : `${formatNumber(status.progress ?? 0)}%`}</b></div>}
        {status?.state === 'available' && <button className="primary-button" disabled={Boolean(busy)} onClick={() => void download()}>{busy === 'download' ? <LoaderCircle className="spin" size={17} /> : <Download size={17} />} تنزيل التحديث</button>}
        {status?.state === 'downloaded' && <button className="primary-button install-update-button" disabled={Boolean(busy)} onClick={() => void install()}><RefreshCw size={17} /> إعادة التشغيل وتثبيت التحديث</button>}
      </section>
      <section className="panel update-help-card"><ShieldCheck size={22} /><div><b>تحديث آمن للبرنامج</b><p>يجب أن يحتوي مصدر التحديث على ملفات الإصدار التي ينشئها نظام بناء التطبيق. عند نشر إصدار أعلى سيظهر إشعار تلقائي، ثم يمكنك تنزيله وتثبيته من هذه الصفحة.</p></div></section>
      <section className="panel sales-reset-card"><div><Trash2 size={23} /><div><b>حذف بيانات التجربة</b><p>يحذف الطلبات والمدفوعات وأرقام المبيعات والأرباح فقط. لا يحذف التصنيفات أو الخدمات أو المنتجات أو الأسعار أو المخزون.</p></div></div><button type="button" className="delete-sales-button" disabled={clearingSales} onClick={() => void clearSales()}>{clearingSales ? <LoaderCircle className="spin" size={18} /> : <Trash2 size={18} />}{clearingSales ? 'جارٍ الحذف...' : 'حذف بيانات المبيعات'}</button></section>
    </div>}
  </div>
}
