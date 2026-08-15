import { ArrowDownToLine, ArrowUpFromLine, Boxes, LoaderCircle, PackageCheck, PackageX, Search, Settings2, TriangleAlert, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { InventoryItemDto } from '../../../shared/contracts'
import { PageHeader } from '../components/PageHeader'
import { getArabicError } from '../utils/errors'
import { formatCurrency, formatNumber } from '../utils/format'

type InventoryDialogState = { item: InventoryItemDto; mode: 'ADD' | 'REMOVE' | 'SETTINGS' }

const stockStatus = (item: InventoryItemDto) => item.quantity <= 0 ? 'out' : item.lowStockThreshold > 0 && item.quantity <= item.lowStockThreshold ? 'low' : 'good'

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItemDto[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<InventoryDialogState | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [threshold, setThreshold] = useState('0')
  const [purchaseCost, setPurchaseCost] = useState('0')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true); setError('')
    try { setItems(await window.desktopApi.inventory.list()) }
    catch (cause) { setError(getArabicError(cause, 'تعذر تحميل المخزون.')) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter((item) => !query || `${item.name} ${item.sku ?? ''}`.toLowerCase().includes(query))
  }, [items, search])
  const counts = useMemo(() => ({ out: items.filter((item) => stockStatus(item) === 'out').length, low: items.filter((item) => stockStatus(item) === 'low').length, good: items.filter((item) => stockStatus(item) === 'good').length }), [items])

  const openDialog = (item: InventoryItemDto, mode: InventoryDialogState['mode']) => {
    setDialog({ item, mode }); setQuantity('1'); setNotes(''); setThreshold(String(item.lowStockThreshold)); setPurchaseCost(String(item.purchaseCost))
  }
  const replace = (saved: InventoryItemDto) => setItems((current) => current.map((item) => item.id === saved.id ? saved : item))
  const save = async () => {
    if (!dialog || saving) return
    setSaving(true); setError('')
    try {
      const saved = dialog.mode === 'SETTINGS'
        ? await window.desktopApi.inventory.updateSettings({ itemId: dialog.item.id, lowStockThreshold: Number(threshold), purchaseCost: Number(purchaseCost) })
        : await window.desktopApi.inventory.adjust({ itemId: dialog.item.id, type: dialog.mode, quantity: Number(quantity), notes: notes.trim() || null })
      replace(saved); setDialog(null); window.dispatchEvent(new Event('sandala:inventory-changed'))
    } catch (cause) { setError(getArabicError(cause, 'تعذر تحديث المخزون.')) }
    finally { setSaving(false) }
  }

  return <div className="page inventory-page">
    <PageHeader title="المخزون" subtitle="متابعة مواد الطباعة والإضافات والكميات المتاحة" />
    {error && <div className="alert error">{error}</div>}
    <div className="inventory-metrics"><div className="panel"><Boxes /><span>إجمالي الأصناف</span><b>{formatNumber(items.length)}</b></div><div className="panel good"><PackageCheck /><span>مخزون جيد</span><b>{formatNumber(counts.good)}</b></div><div className="panel low"><TriangleAlert /><span>مخزون منخفض</span><b>{formatNumber(counts.low)}</b></div><div className="panel out"><PackageX /><span>نفد من المخزون</span><b>{formatNumber(counts.out)}</b></div></div>
    <section className="panel catalog-panel inventory-panel">
      <div className="inventory-toolbar"><div className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن ورق، بروستول، دبابيس..." /></div><span>{formatNumber(filtered.length)} صنف</span></div>
      {loading ? <div className="table-state"><LoaderCircle className="spin" size={26} /> جارٍ تحميل المخزون...</div> : <div className="table-scroll"><table className="data-table inventory-table"><thead><tr><th>الصنف</th><th>الكمية الحالية</th><th>حد التنبيه</th><th>تكلفة الشراء</th><th>الحالة</th><th>الحركات</th><th>الإعدادات</th></tr></thead><tbody>{filtered.map((item) => { const status = stockStatus(item); return <tr key={item.id}><td><b>{item.name}</b><small dir="ltr">{item.sku}</small></td><td><strong dir="ltr">{formatNumber(item.quantity)} <small>{item.unit}</small></strong></td><td>{formatNumber(item.lowStockThreshold)} {item.unit}</td><td dir="ltr">{formatCurrency(item.purchaseCost, 4)}</td><td><span className={`stock-badge ${status}`}>{status === 'out' ? 'نفد' : status === 'low' ? 'منخفض' : 'جيد'}</span></td><td><div className="inventory-actions"><button className="stock-in" onClick={() => openDialog(item, 'ADD')}><ArrowDownToLine size={16} /> إضافة</button><button className="stock-out" disabled={item.quantity <= 0} onClick={() => openDialog(item, 'REMOVE')}><ArrowUpFromLine size={16} /> استهلاك</button></div></td><td><button className="icon-button" onClick={() => openDialog(item, 'SETTINGS')} title="إعدادات الصنف"><Settings2 size={17} /></button></td></tr> })}</tbody></table></div>}
    </section>
    {dialog && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null) }}><article className="modal inventory-dialog"><header><h2>{dialog.mode === 'ADD' ? 'إضافة إلى المخزون' : dialog.mode === 'REMOVE' ? 'تسجيل استهلاك' : 'إعدادات المخزون'}</h2><button className="icon-button" onClick={() => setDialog(null)}><X size={20} /></button></header><div className="modal-body"><div className="inventory-dialog-item"><span>الصنف</span><b>{dialog.item.name}</b><small>الرصيد الحالي: {formatNumber(dialog.item.quantity)} {dialog.item.unit}</small></div>{dialog.mode === 'SETTINGS' ? <form className="dialog-form one-column" onSubmit={(event) => { event.preventDefault(); void save() }}><label>حد تنبيه انخفاض المخزون<input type="number" min="0" step="1" value={threshold} onChange={(event) => setThreshold(event.target.value)} /></label><label>تكلفة شراء الوحدة<input type="number" min="0" step="0.001" value={purchaseCost} onChange={(event) => setPurchaseCost(event.target.value)} /></label><div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setDialog(null)}>إلغاء</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</button></div></form> : <form className="dialog-form one-column" onSubmit={(event) => { event.preventDefault(); void save() }}><label>الكمية ({dialog.item.unit})<input type="number" min="0.01" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label><label>ملاحظة<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="سبب الإضافة أو الاستهلاك (اختياري)" /></label>{dialog.mode === 'REMOVE' && Number(quantity) > dialog.item.quantity && <div className="alert error">الكمية أكبر من الرصيد الحالي.</div>}<div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setDialog(null)}>إلغاء</button><button type="submit" className="primary-button" disabled={saving || Number(quantity) <= 0 || (dialog.mode === 'REMOVE' && Number(quantity) > dialog.item.quantity)}>{saving ? 'جارٍ الحفظ...' : dialog.mode === 'ADD' ? 'إضافة الكمية' : 'تسجيل الاستهلاك'}</button></div></form>}</div></article></div>}
  </div>
}
