import { ArrowDownUp, CalendarDays, CheckCircle2, CircleX, Eye, ListFilter, LoaderCircle, Printer, Search, ShoppingBag, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { OrderDetailDto, OrderPaymentFilter, OrderSort, OrderSummaryDto } from '../../../shared/contracts'
import { PageHeader } from '../components/PageHeader'
import { InvoicePrintDialog } from '../components/InvoicePrintDialog'
import { getArabicError } from '../utils/errors'
import { ARABIC_WITH_LATIN_DIGITS, formatCurrency, formatNumber } from '../utils/format'
import { toInputDate } from '../utils/date-range'

const formatDateTime = (value: string) => new Intl.DateTimeFormat(ARABIC_WITH_LATIN_DIGITS, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const paymentLabel = (status: string) => ({ UNPAID: 'غير مدفوع', PARTIAL: 'مدفوع جزئياً', PAID: 'مدفوع' }[status] ?? status)

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummaryDto[]>([])
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<'TODAY' | 'ALL' | 'CUSTOM'>('TODAY')
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | OrderPaymentFilter>('ALL')
  const [sort, setSort] = useState<OrderSort>('NEWEST')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [printLoading, setPrintLoading] = useState('')
  const [paymentUpdating, setPaymentUpdating] = useState('')
  const [selected, setSelected] = useState<OrderDetailDto | null>(null)
  const [printing, setPrinting] = useState<OrderDetailDto | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const today = toInputDate(new Date())
    const effectiveFrom = period === 'TODAY' ? today : period === 'CUSTOM' ? from || undefined : undefined
    const effectiveTo = period === 'TODAY' ? today : period === 'CUSTOM' ? to || undefined : undefined
    try { setOrders(await window.desktopApi.orders.list({ search: search.trim() || undefined, from: effectiveFrom, to: effectiveTo, paymentStatus: paymentFilter === 'ALL' ? undefined : paymentFilter, sort })) }
    catch (cause) { setError(getArabicError(cause, 'تعذر تحميل الطلبات.')) }
    finally { setLoading(false) }
  }, [search, period, paymentFilter, sort, from, to])
  useEffect(() => { void load() }, [])

  const openOrder = async (id: string) => {
    setDetailLoading(true); setError('')
    try { setSelected(await window.desktopApi.orders.get(id)) }
    catch (cause) { setError(getArabicError(cause, 'تعذر تحميل تفاصيل الطلب.')) }
    finally { setDetailLoading(false) }
  }
  const printOrder = async (id: string) => {
    setPrintLoading(id); setError('')
    try { setPrinting(await window.desktopApi.orders.get(id)) }
    catch (cause) { setError(getArabicError(cause, 'تعذر تحميل الطلب للطباعة.')) }
    finally { setPrintLoading('') }
  }
  const markPaid = async (order: OrderSummaryDto) => {
    if (order.paymentStatus === 'PAID') return
    setPaymentUpdating(order.id); setError('')
    try {
      const saved = await window.desktopApi.orders.setPaymentStatus(order.id, true)
      setOrders((current) => current.map((item) => item.id === saved.id ? saved : item))
      if (selected?.id === saved.id) setSelected((current) => current ? { ...current, paymentStatus: saved.paymentStatus } : current)
      window.dispatchEvent(new Event('sandala:orders-changed'))
    } catch (cause) { setError(getArabicError(cause, 'تعذر تحديث حالة الدفع.')) }
    finally { setPaymentUpdating('') }
  }

  return <div className="page orders-page">
    <PageHeader title="الطلبات" subtitle={`${formatNumber(orders.length)} طلب في النتائج الحالية`} />
    {error && <div className="alert error">{error}</div>}
    <section className="panel catalog-panel">
      <div className="orders-filters">
        <div className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void load() }} placeholder="ابحث برقم الطلب أو اسم الزبون أو الهاتف" /></div>
        <label className="order-filter-field"><CalendarDays size={16} /><span>الفترة</span><select value={period} onChange={(event) => setPeriod(event.target.value as typeof period)}><option value="TODAY">طلبات اليوم</option><option value="ALL">كل الطلبات</option><option value="CUSTOM">فترة محددة</option></select></label>
        <label className="order-filter-field"><ListFilter size={16} /><span>الدفع</span><select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as typeof paymentFilter)}><option value="ALL">الكل</option><option value="UNPAID">غير مدفوعة</option><option value="PAID">مدفوعة</option></select></label>
        <label className="order-filter-field"><ArrowDownUp size={16} /><span>الترتيب</span><select value={sort} onChange={(event) => setSort(event.target.value as OrderSort)}><option value="NEWEST">الأحدث أولًا</option><option value="HIGHEST_VALUE">الأعلى قيمة</option></select></label>
        <button className="primary-button" onClick={() => void load()} disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <Search size={18} />} عرض</button>
        {period === 'CUSTOM' && <div className="custom-order-dates"><label><span>من</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label><span>إلى</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>}
      </div>
      {loading ? <div className="table-state"><LoaderCircle className="spin" size={26} /> جارٍ تحميل الطلبات...</div> : orders.length === 0 ? <div className="empty-state large"><ShoppingBag size={42} /><b>لا توجد طلبات مطابقة</b><span>أنشئ طلباً جديداً أو غيّر مرشحات البحث.</span></div> : <div className="table-scroll orders-table-scroll"><table className="data-table orders-table"><thead><tr><th>رقم الطلب</th><th>التاريخ</th><th>الزبون</th><th>الخدمات</th><th>الإجمالي</th><th>الدفع</th><th>التفاصيل</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><b dir="ltr">{order.orderNumber}</b></td><td>{formatDateTime(order.orderedAt)}</td><td><b>{order.customerName}</b><small dir="ltr">{order.customerPhone ?? 'بدون هاتف'}</small></td><td>{formatNumber(order.itemsCount)}</td><td><b dir="ltr">{formatCurrency(order.total)}</b></td><td><button type="button" title={order.paymentStatus === 'PAID' ? 'تم تسجيل الدفع نهائيًا' : 'اضغط لتسجيل الطلب كمدفوع'} className={`payment-action-button ${order.paymentStatus === 'PAID' ? 'paid locked' : 'unpaid'}`} disabled={paymentUpdating === order.id || order.paymentStatus === 'PAID'} onClick={() => void markPaid(order)}>{paymentUpdating === order.id ? <LoaderCircle className="spin" size={18} /> : order.paymentStatus === 'PAID' ? <CheckCircle2 size={18} /> : <CircleX size={18} />}<span>{paymentLabel(order.paymentStatus)}</span></button></td><td><div className="order-row-actions"><button className="icon-button view-order-button" title="عرض التفاصيل" disabled={detailLoading} onClick={() => void openOrder(order.id)}><Eye size={18} /></button><button className="icon-button print-order-row-button" title="طباعة الطلب" disabled={printLoading === order.id} onClick={() => void printOrder(order.id)}>{printLoading === order.id ? <LoaderCircle className="spin" size={17} /> : <Printer size={17} />}</button></div></td></tr>)}</tbody></table></div>}
    </section>
    {selected && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><article className="modal order-detail-modal"><header><div><h2>تفاصيل الطلب <span dir="ltr">{selected.orderNumber}</span></h2><p>{formatDateTime(selected.orderedAt)}</p></div><div className="order-detail-header-actions"><button type="button" className="primary-button" onClick={() => setPrinting(selected)}><Printer size={18} /> طباعة الطلب</button><button type="button" className="icon-button" onClick={() => setSelected(null)}><X size={20} /></button></div></header><div className="modal-body">
      <div className="order-detail-customer"><div><span>الزبون</span><b>{selected.customerName}</b></div><div><span>الهاتف</span><b dir="ltr">{selected.customerPhone ?? '—'}</b></div><div><span>عنوان التوصيل</span><b>{selected.deliveryAddress ?? '—'}</b></div><div><span>الملاحظات</span><b>{selected.notes ?? '—'}</b></div><div className="order-detail-logo"><span>شعار العمل</span>{selected.businessLogoDataUrl ? <img src={selected.businessLogoDataUrl} alt="شعار العمل" /> : <b>—</b>}</div></div>
      <div className="table-scroll"><table className="data-table order-detail-items"><thead><tr><th>الخدمة</th><th>المواصفات</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>{selected.items.map((item) => <tr key={item.id}><td><b>{item.serviceName}</b></td><td>{[item.size, item.colorMode, item.materialType].filter(Boolean).join(' • ') || '—'}</td><td>{formatNumber(item.quantity)} {item.unit}</td><td dir="ltr">{item.unitSalePrice === null ? '—' : formatCurrency(item.unitSalePrice, 4)}</td><td dir="ltr"><b>{formatCurrency(item.totalSalePrice)}</b></td></tr>)}</tbody></table></div>
      <div className="order-detail-totals"><div><span>عدد الخدمات</span><b>{formatNumber(selected.itemsCount)}</b></div>{selected.discountAmount > 0 && <><div><span>قبل الخصم</span><b>{formatCurrency(selected.subtotal)}</b></div><div><span>الخصم</span><b>- {formatCurrency(selected.discountAmount)}</b></div></>}<div><span>إجمالي الطلب</span><b>{formatCurrency(selected.total)}</b></div><div><span>حالة الدفع</span><b>{paymentLabel(selected.paymentStatus)}</b></div></div>
    </div></article></div>}
    {printing && <InvoicePrintDialog order={printing} onClose={() => setPrinting(null)} />}
  </div>
}
