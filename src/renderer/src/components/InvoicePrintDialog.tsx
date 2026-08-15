import { LoaderCircle, Printer, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { OrderDetailDto } from '../../../shared/contracts'
import sandalaLogo from '../assets/sandala-logo.png'
import { getArabicError } from '../utils/errors'
import { splitTaxInclusive } from '../utils/invoice'

type InvoiceLanguage = 'ar' | 'he'
type InvoicePageSize = 'THERMAL' | 'A4' | 'A5'
interface InvoicePreferences { language: InvoiceLanguage; pageSize: InvoicePageSize; phone: string; email: string }

const STORAGE_KEY = 'sandala:invoice-preferences:v2'
const initialPreferences: InvoicePreferences = { language: 'ar', pageSize: 'A4', phone: '0552616622', email: 'sandalaprinter@gmail.com' }
const labels = {
  ar: { order: 'الطلب', orderNumber: 'رقم الطلب', date: 'التاريخ', customer: 'تفاصيل الزبون', name: 'الاسم', phone: 'الهاتف', address: 'العنوان', notes: 'ملاحظات', logo: 'الشعار', service: 'الخدمة أو المنتج', quantity: 'الكمية', unitPrice: 'سعر الوحدة', lineTotal: 'الإجمالي', beforeTax: 'السعر قبل الضريبة', tax: 'الضريبة (18%)', final: 'السعر النهائي', payment: 'حالة الدفع', paid: 'مدفوع', unpaid: 'غير مدفوع', thanks: 'شكرًا لاختياركم Sandala Printer' },
  he: { order: 'הזמנה', orderNumber: 'מספר הזמנה', date: 'תאריך', customer: 'פרטי לקוח', name: 'שם', phone: 'טלפון', address: 'כתובת', notes: 'הערות', logo: 'לוגו', service: 'שירות או מוצר', quantity: 'כמות', unitPrice: 'מחיר ליחידה', lineTotal: 'סה״כ', beforeTax: 'מחיר לפני מע״מ', tax: 'מע״מ (18%)', final: 'מחיר סופי', payment: 'מצב תשלום', paid: 'שולם', unpaid: 'לא שולם', thanks: 'תודה שבחרתם ב-Sandala Printer' }
} as const

function loadPreferences(): InvoicePreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Partial<InvoicePreferences>
    return { ...initialPreferences, ...saved }
  } catch { return initialPreferences }
}

const money = (value: number) => `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} ₪`
const quantity = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value)

export function InvoicePrintDialog({ order, onClose }: { order: OrderDetailDto; onClose: () => void }) {
  const [preferences, setPreferences] = useState<InvoicePreferences>(loadPreferences)
  const [printing, setPrinting] = useState(false)
  const [printError, setPrintError] = useState('')
  const text = labels[preferences.language]
  const totals = splitTaxInclusive(order.total)
  const locale = preferences.language === 'ar' ? 'ar-u-nu-latn' : 'he-u-nu-latn'
  const pageRule = preferences.pageSize === 'THERMAL' ? '80mm auto' : `${preferences.pageSize} portrait`
  const print = async () => {
    if (printing) return
    setPrinting(true)
    setPrintError('')
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
      const sheet = document.querySelector<HTMLElement>('.invoice-print-sheet')
      const contentHeightMicrons = preferences.pageSize === 'THERMAL' && sheet
        ? Math.ceil((sheet.scrollHeight / 96) * 25_400) + 8_000
        : undefined
      await window.desktopApi.printing.printOrder({ pageSize: preferences.pageSize, contentHeightMicrons })
    } catch (cause) {
      setPrintError(getArabicError(cause, 'تعذر إرسال الطلب إلى الطابعة الافتراضية. تأكد من تشغيل الطابعة ثم حاول مجددًا.'))
    } finally {
      setPrinting(false)
    }
  }

  return createPortal(<div className="modal-backdrop invoice-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <article className="modal wide invoice-dialog" role="dialog" aria-modal="true" aria-label="طباعة الطلب">
      <header><h2>طباعة الطلب <span dir="ltr">{order.orderNumber}</span></h2><button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={20} /></button></header>
      <div className="modal-body invoice-modal-body">
        <section className="invoice-print-controls">
          <label>مقاس الورق<select value={preferences.pageSize} onChange={(event) => setPreferences({ ...preferences, pageSize: event.target.value as InvoicePageSize })}><option value="THERMAL">ورق حراري 80mm</option><option value="A4">A4</option><option value="A5">A5</option></select></label>
          <label>لغة الطلب<select value={preferences.language} onChange={(event) => setPreferences({ ...preferences, language: event.target.value as InvoiceLanguage })}><option value="ar">العربية</option><option value="he">עברית</option></select></label>
          <label>هاتف المطبعة<input dir="ltr" type="tel" value={preferences.phone} onChange={(event) => setPreferences({ ...preferences, phone: event.target.value })} placeholder="مثال: 0590000000" /></label>
          <label>البريد الإلكتروني<input dir="ltr" type="email" value={preferences.email} onChange={(event) => setPreferences({ ...preferences, email: event.target.value })} placeholder="name@example.com" /></label>
          <button type="button" className="primary-button invoice-print-button" disabled={printing} onClick={() => void print()}>{printing ? <LoaderCircle className="spin" size={18} /> : <Printer size={18} />} {printing ? 'جارٍ الإرسال...' : 'طباعة الطلب'}</button>
          {printError && <div className="alert error invoice-print-error">{printError}</div>}
        </section>
        <style>{`@media print { @page { size: ${pageRule}; margin: ${preferences.pageSize === 'THERMAL' ? '4mm' : '10mm'}; } }`}</style>
        <section className={`invoice-print-sheet invoice-size-${preferences.pageSize.toLowerCase()}`} dir="rtl" lang={preferences.language}>
          <header className="invoice-brand"><img src={sandalaLogo} alt="Sandala Printer" /><div className="invoice-contact"><b>Sandala Printer</b>{preferences.phone && <span dir="ltr">{preferences.phone}</span>}{preferences.email && <span dir="ltr">{preferences.email}</span>}</div></header>
          <div className="invoice-title"><h1>{text.order}</h1><div><span>{text.orderNumber}: <b dir="ltr">{order.orderNumber}</b></span><span>{text.date}: <b>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.orderedAt))}</b></span></div></div>
          <section className="invoice-customer"><h2>{text.customer}</h2><div className="invoice-customer-grid"><p><span>{text.name}</span><b>{order.customerName}</b></p><p><span>{text.phone}</span><b dir="ltr">{order.customerPhone ?? '—'}</b></p><p><span>{text.address}</span><b>{order.deliveryAddress ?? '—'}</b></p><p><span>{text.notes}</span><b>{order.notes ?? '—'}</b></p>{order.businessLogoDataUrl && <p className="invoice-customer-logo"><span>{text.logo}</span><img src={order.businessLogoDataUrl} alt={text.logo} /></p>}</div></section>
          <section className="invoice-items"><div className="invoice-item-row invoice-items-head"><b>{text.service}</b><b>{text.quantity}</b><b>{text.unitPrice}</b><b>{text.lineTotal}</b></div>{order.items.map((item) => <div className="invoice-item-row" key={item.id}><div><b>{preferences.language === 'he' ? item.serviceNameHe || item.serviceName : item.serviceName}</b></div><span>{quantity(item.quantity)}</span><span dir="ltr">{item.unitSalePrice === null ? '—' : money(item.unitSalePrice)}</span><b dir="ltr">{money(item.totalSalePrice)}</b></div>)}</section>
          <section className="invoice-summary"><div><span>{text.beforeTax}</span><b dir="ltr">{money(totals.beforeTax)}</b></div><div><span>{text.tax}</span><b dir="ltr">{money(totals.tax)}</b></div><div className="invoice-final-total"><span>{text.final}</span><b dir="ltr">{money(totals.total)}</b></div><div><span>{text.payment}</span><b>{order.paymentStatus === 'PAID' ? text.paid : text.unpaid}</b></div></section>
          <footer>{text.thanks}</footer>
        </section>
      </div>
    </article>
  </div>, document.body)
}
