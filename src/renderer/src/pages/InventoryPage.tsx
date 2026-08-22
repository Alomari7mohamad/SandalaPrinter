import { ArrowDownToLine, ArrowUpFromLine, Boxes, LoaderCircle, PackageCheck, PackageX, Plus, Search, Settings2, Trash2, TriangleAlert, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { InventoryItemDto, SupplierDto } from '../../../shared/contracts'
import { packageReorderPoint, splitPackageStock } from '../../../shared/inventory/package-tracking'
import { PageHeader } from '../components/PageHeader'
import { getArabicError } from '../utils/errors'
import { formatCurrency, formatNumber } from '../utils/format'

type InventoryDialogState = { item: InventoryItemDto; mode: 'ADD' | 'REMOVE' | 'SETTINGS' }

const stockStatus = (item: InventoryItemDto) => item.quantity <= 0 ? 'out' : item.lowStockThreshold > 0 && item.quantity <= item.lowStockThreshold ? 'low' : 'good'
const packageSummary = (item: InventoryItemDto) => {
  if (!item.packageEnabled || !item.unitsPerPackage) return `${formatNumber(item.quantity)} ${item.unit}`
  const { fullPackages, looseUnits } = splitPackageStock(item.quantity, item.unitsPerPackage)
  return `${formatNumber(fullPackages)} ${item.packageName || 'رزمة'}${looseUnits > 0 ? ` + ${formatNumber(looseUnits)} ${item.unit}` : ''}`
}

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItemDto[]>([])
  const [suppliers,setSuppliers]=useState<SupplierDto[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<InventoryDialogState | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [threshold, setThreshold] = useState('0')
  const [purchaseCost, setPurchaseCost] = useState('0')
  const [supplierId,setSupplierId]=useState(''),[reorderPoint,setReorderPoint]=useState('1'),[minimumOrderQuantity,setMinimumOrderQuantity]=useState('1'),[newOpen,setNewOpen]=useState(false)
  const [packageEnabled,setPackageEnabled]=useState(false),[packageName,setPackageName]=useState('رزمة'),[unitsPerPackage,setUnitsPerPackage]=useState('500'),[packagePrice,setPackagePrice]=useState('0'),[packageNotes,setPackageNotes]=useState(''),[reorderPackageCount,setReorderPackageCount]=useState('1')
  const [newItem,setNewItem]=useState({name:'',sku:'',unit:'قطعة',quantity:'0',purchaseCost:'0',supplierId:'',reorderPoint:'1',minimumOrderQuantity:'1',packageEnabled:false,packageName:'رزمة',unitsPerPackage:'500',packagePrice:'0',packageNotes:'',reorderPackageCount:'1'})
  const [itemToDelete, setItemToDelete] = useState<InventoryItemDto | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true); setError('')
    try { const [stock,traders]=await Promise.all([window.desktopApi.inventory.list(),window.desktopApi.shortages.listSuppliers()]);setItems(stock);setSuppliers(traders) }
    catch (cause) { setError(getArabicError(cause, 'تعذر تحميل المخزون.')) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchesSearch = !query || `${item.name} ${item.sku ?? ''}`.toLowerCase().includes(query)
      const matchesCategory = categoryFilter === 'all'
        || (categoryFilter === 'uncategorized' ? !item.categoryId : item.categoryId === categoryFilter)
      return matchesSearch && matchesCategory
    })
  }, [items, search, categoryFilter])
  const inventoryCategories = useMemo(() => {
    const categories = new Map<string, string>()
    for (const item of items) if (item.categoryId && item.categoryName) categories.set(item.categoryId, item.categoryName)
    return [...categories].sort((a, b) => a[1].localeCompare(b[1], 'ar'))
  }, [items])
  const hasUncategorized = items.some((item) => !item.categoryId)
  const counts = useMemo(() => ({ out: items.filter((item) => stockStatus(item) === 'out').length, low: items.filter((item) => stockStatus(item) === 'low').length, good: items.filter((item) => stockStatus(item) === 'good').length }), [items])

  const openDialog = (item: InventoryItemDto, mode: InventoryDialogState['mode']) => {
    setDialog({ item, mode }); setQuantity('1'); setNotes(''); setThreshold(String(item.lowStockThreshold)); setPurchaseCost(String(item.purchaseCost));setSupplierId(item.supplierId??'');setReorderPoint(String(item.reorderPoint));setMinimumOrderQuantity(String(item.minimumOrderQuantity));setPackageEnabled(item.packageEnabled);setPackageName(item.packageName||'رزمة');setUnitsPerPackage(String(item.unitsPerPackage??500));setPackagePrice(String(item.packagePrice??0));setPackageNotes(item.packageNotes??'');setReorderPackageCount(String(item.reorderPackageCount??1))
  }
  const replace = (saved: InventoryItemDto) => setItems((current) => current.map((item) => item.id === saved.id ? saved : item))
  const save = async () => {
    if (!dialog || saving) return
    setSaving(true); setError('')
    try {
      const packageThreshold = packageReorderPoint(Number(reorderPackageCount), Number(unitsPerPackage))
      const saved = dialog.mode === 'SETTINGS'
        ? await window.desktopApi.inventory.updateSettings({ itemId: dialog.item.id, lowStockThreshold: packageEnabled ? packageThreshold : Number(threshold), purchaseCost: Number(purchaseCost), supplierId:supplierId||null, reorderPoint:packageEnabled ? packageThreshold : Number(reorderPoint), minimumOrderQuantity:Number(minimumOrderQuantity), packageEnabled, packageName:packageEnabled?packageName.trim():null, unitsPerPackage:packageEnabled?Number(unitsPerPackage):null, packagePrice:packageEnabled?Number(packagePrice):null, packageNotes:packageEnabled?(packageNotes.trim()||null):null, reorderPackageCount:packageEnabled?Number(reorderPackageCount):null })
        : await window.desktopApi.inventory.adjust({ itemId: dialog.item.id, type: dialog.mode, quantity: Number(quantity), quantityMode:dialog.mode==='ADD'&&dialog.item.packageEnabled?'PACKAGE':'UNIT', notes: notes.trim() || null })
      replace(saved); setDialog(null); window.dispatchEvent(new Event('sandala:inventory-changed'))
    } catch (cause) { setError(getArabicError(cause, 'تعذر تحديث المخزون.')) }
    finally { setSaving(false) }
  }
  const createItem=async()=>{setSaving(true);setError('');try{const packageThreshold=Math.max(0,Number(newItem.reorderPackageCount)*Number(newItem.unitsPerPackage)-1);const saved=await window.desktopApi.inventory.createItem({name:newItem.name,sku:newItem.sku.trim()||null,unit:newItem.unit,quantity:newItem.packageEnabled?Number(newItem.quantity)*Number(newItem.unitsPerPackage):Number(newItem.quantity),purchaseCost:Number(newItem.purchaseCost),supplierId:newItem.supplierId,reorderPoint:newItem.packageEnabled?packageThreshold:Number(newItem.reorderPoint),minimumOrderQuantity:Number(newItem.minimumOrderQuantity),packageEnabled:newItem.packageEnabled,packageName:newItem.packageEnabled?newItem.packageName:null,unitsPerPackage:newItem.packageEnabled?Number(newItem.unitsPerPackage):null,packagePrice:newItem.packageEnabled?Number(newItem.packagePrice):null,packageNotes:newItem.packageEnabled?(newItem.packageNotes.trim()||null):null,reorderPackageCount:newItem.packageEnabled?Number(newItem.reorderPackageCount):null});setItems(rows=>[...rows,saved].sort((a,b)=>a.name.localeCompare(b.name,'ar')));setNewOpen(false);setNewItem({name:'',sku:'',unit:'قطعة',quantity:'0',purchaseCost:'0',supplierId:'',reorderPoint:'1',minimumOrderQuantity:'1',packageEnabled:false,packageName:'رزمة',unitsPerPackage:'500',packagePrice:'0',packageNotes:'',reorderPackageCount:'1'});window.dispatchEvent(new Event('sandala:inventory-changed'))}catch(cause){setError(getArabicError(cause,'تعذر إضافة المنتج للمخزون.'))}finally{setSaving(false)}}
  const deleteItem = async () => {
    if (!itemToDelete || saving) return
    setSaving(true); setError('')
    try {
      await window.desktopApi.inventory.deleteItem(itemToDelete.id)
      setItems((current) => current.filter((item) => item.id !== itemToDelete.id))
      setItemToDelete(null)
      window.dispatchEvent(new Event('sandala:inventory-changed'))
    } catch (cause) { setError(getArabicError(cause, 'تعذر حذف المنتج من المخزون.')) }
    finally { setSaving(false) }
  }

  return <div className="page inventory-page">
    <PageHeader title="المخزون" subtitle="متابعة مواد الطباعة والإضافات والكميات المتاحة" action={<button className="primary-button" onClick={()=>setNewOpen(true)}><Plus size={17}/> إضافة منتج مخزون</button>} />
    {error && <div className="alert error">{error}</div>}
    <div className="inventory-metrics"><div className="panel"><Boxes /><span>إجمالي الأصناف</span><b>{formatNumber(items.length)}</b></div><div className="panel good"><PackageCheck /><span>مخزون جيد</span><b>{formatNumber(counts.good)}</b></div><div className="panel low"><TriangleAlert /><span>مخزون منخفض</span><b>{formatNumber(counts.low)}</b></div><div className="panel out"><PackageX /><span>نفد من المخزون</span><b>{formatNumber(counts.out)}</b></div></div>
    <section className="panel catalog-panel inventory-panel">
      <div className="inventory-toolbar"><div className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن ورق، بروستول، دبابيس..." /></div><select className="inventory-category-filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">كل الفئات</option>{inventoryCategories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}{hasUncategorized && <option value="uncategorized">بدون فئة</option>}</select><span>{formatNumber(filtered.length)} صنف</span></div>
      {loading ? <div className="table-state"><LoaderCircle className="spin" size={26} /> جارٍ تحميل المخزون...</div> : <div className="table-scroll"><table className="data-table inventory-table"><thead><tr><th>الصنف</th><th>الكمية الحالية</th><th>التاجر</th><th>حد الطلب</th><th>تكلفة الشراء</th><th>الحالة</th><th>الحركات</th><th>الإجراءات</th></tr></thead><tbody>{filtered.map((item) => { const status = stockStatus(item); return <tr key={item.id}><td><b>{item.name}</b><small dir="ltr">{item.sku}</small></td><td><strong>{packageSummary(item)}</strong>{item.packageEnabled&&<small>{formatNumber(item.quantity)} {item.unit} إجمالاً</small>}</td><td>{item.supplierName??'غير محدد'}</td><td>{item.packageEnabled?`أقل من ${formatNumber(item.reorderPackageCount??0)} ${item.packageName||'رزمة'}`:`${formatNumber(item.reorderPoint)} / طلب ${formatNumber(item.minimumOrderQuantity)}`}</td><td dir="ltr">{item.packageEnabled?`${formatCurrency(item.packagePrice??0,3)} / ${item.packageName||'رزمة'}`:formatCurrency(item.purchaseCost,4)}</td><td><span className={`stock-badge ${status}`}>{status === 'out' ? 'نفد' : status === 'low' ? 'منخفض' : 'جيد'}</span></td><td><div className="inventory-actions"><button className="stock-in" onClick={() => openDialog(item, 'ADD')}><ArrowDownToLine size={16} /> إضافة</button><button className="stock-out" disabled={item.quantity <= 0} onClick={() => openDialog(item, 'REMOVE')}><ArrowUpFromLine size={16} /> استهلاك</button></div></td><td><div className="row-actions"><button className="icon-button" onClick={() => openDialog(item, 'SETTINGS')} title="إعدادات الصنف"><Settings2 size={17} /></button><button className="icon-button danger" onClick={() => setItemToDelete(item)} title="حذف من المخزون" aria-label={`حذف ${item.name} من المخزون`}><Trash2 size={17} /></button></div></td></tr> })}</tbody></table></div>}
    </section>
    {dialog && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null) }}><article className="modal inventory-dialog"><header><h2>{dialog.mode === 'ADD' ? 'إضافة إلى المخزون' : dialog.mode === 'REMOVE' ? 'تسجيل استهلاك' : 'إعدادات المخزون'}</h2><button className="icon-button" onClick={() => setDialog(null)}><X size={20} /></button></header><div className="modal-body"><div className="inventory-dialog-item"><span>الصنف</span><b>{dialog.item.name}</b><small>الرصيد الحالي: {packageSummary(dialog.item)} ({formatNumber(dialog.item.quantity)} {dialog.item.unit})</small></div>{dialog.mode === 'SETTINGS' ? <form className="dialog-form one-column" onSubmit={(event) => { event.preventDefault(); void save() }}><label>التاجر<select value={supplierId} onChange={e=>setSupplierId(e.target.value)}><option value="">غير محدد</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.companyName} — {s.name}</option>)}</select></label><label className="checkbox-label"><input type="checkbox" checked={packageEnabled} onChange={e=>setPackageEnabled(e.target.checked)}/> شراء ومتابعة هذا المنتج بالرزم أو العبوات</label>{packageEnabled?<div className="package-settings-box"><label>اسم العبوة<input value={packageName} onChange={e=>setPackageName(e.target.value)} placeholder="رزمة"/></label><label>عدد {dialog.item.unit} داخل العبوة<input type="number" min="0.01" step="any" value={unitsPerPackage} onChange={e=>setUnitsPerPackage(e.target.value)}/></label><label>سعر شراء العبوة<input type="number" min="0" step="0.001" value={packagePrice} onChange={e=>setPackagePrice(e.target.value)}/></label><label>التنبيه عند أقل من عدد عبوات<input type="number" min="0" step="any" value={reorderPackageCount} onChange={e=>setReorderPackageCount(e.target.value)}/></label><label>كمية الطلب الدنيا ({packageName||'عبوة'})<input type="number" min="0.01" step="any" value={minimumOrderQuantity} onChange={e=>setMinimumOrderQuantity(e.target.value)}/></label><label>ملاحظة قصيرة<textarea rows={2} maxLength={300} value={packageNotes} onChange={e=>setPackageNotes(e.target.value)} placeholder="مثلاً: ورق أبيض، 500 ورقة في الرزمة"/></label><small>سيبدأ التنبيه عند {formatNumber(Math.max(0,Number(reorderPackageCount)*Number(unitsPerPackage)-1))} {dialog.item.unit} أو أقل.</small></div>:<><label>حد الانتقال إلى النواقص<input type="number" min="0" step="1" value={reorderPoint} onChange={e=>setReorderPoint(e.target.value)}/></label><label>كمية الطلب الدنيا<input type="number" min="0.01" step="any" value={minimumOrderQuantity} onChange={e=>setMinimumOrderQuantity(e.target.value)}/></label><label>حد تنبيه انخفاض المخزون<input type="number" min="0" step="1" value={threshold} onChange={(event) => setThreshold(event.target.value)} /></label></>}<label>تكلفة الوحدة المستخدمة في حساب الخدمات<input type="number" min="0" step="0.001" value={purchaseCost} onChange={(event) => setPurchaseCost(event.target.value)} /></label><div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setDialog(null)}>إلغاء</button><button type="submit" className="primary-button" disabled={saving||packageEnabled&&(!packageName.trim()||Number(unitsPerPackage)<=0||Number(packagePrice)<0)}>{saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</button></div></form> : <form className="dialog-form one-column" onSubmit={(event) => { event.preventDefault(); void save() }}><label>{dialog.mode==='ADD'&&dialog.item.packageEnabled?`عدد ${dialog.item.packageName||'الرزم'} المضافة`:`الكمية (${dialog.item.unit})`}<input type="number" min="0.01" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>{dialog.mode==='ADD'&&dialog.item.packageEnabled&&<div className="package-add-preview">سيضاف {formatNumber(Number(quantity)*(dialog.item.unitsPerPackage??0))} {dialog.item.unit} إلى المخزون.</div>}<label>ملاحظة<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="سبب الإضافة أو الاستهلاك (اختياري)" /></label>{dialog.mode === 'REMOVE' && Number(quantity) > dialog.item.quantity && <div className="alert error">الكمية أكبر من الرصيد الحالي.</div>}<div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setDialog(null)}>إلغاء</button><button type="submit" className="primary-button" disabled={saving || Number(quantity) <= 0 || (dialog.mode === 'REMOVE' && Number(quantity) > dialog.item.quantity)}>{saving ? 'جارٍ الحفظ...' : dialog.mode === 'ADD' ? 'إضافة الكمية' : 'تسجيل الاستهلاك'}</button></div></form>}</div></article></div>}
    {newOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setNewOpen(false)}}><article className="modal"><header><h2>إضافة منتج للمخزون</h2><button className="icon-button" onClick={()=>setNewOpen(false)}><X/></button></header><form className="modal-body dialog-form" onSubmit={e=>{e.preventDefault();void createItem()}}><label>اسم المنتج<input required value={newItem.name} onChange={e=>setNewItem({...newItem,name:e.target.value})}/></label><label>الرمز<input dir="ltr" value={newItem.sku} onChange={e=>setNewItem({...newItem,sku:e.target.value})}/></label><label>الوحدة<input required value={newItem.unit} onChange={e=>setNewItem({...newItem,unit:e.target.value})}/></label><label>الكمية الحالية<input type="number" min="0" value={newItem.quantity} onChange={e=>setNewItem({...newItem,quantity:e.target.value})}/></label><label>تكلفة الوحدة<input type="number" min="0" step="0.001" value={newItem.purchaseCost} onChange={e=>setNewItem({...newItem,purchaseCost:e.target.value})}/></label><label>التاجر<select required value={newItem.supplierId} onChange={e=>setNewItem({...newItem,supplierId:e.target.value})}><option value="">اختر التاجر</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.companyName} — {s.name}</option>)}</select></label><label>حد إعادة الطلب<input type="number" min="0" value={newItem.reorderPoint} onChange={e=>setNewItem({...newItem,reorderPoint:e.target.value})}/></label><label>كمية الطلب الدنيا<input type="number" min="0.01" step="any" value={newItem.minimumOrderQuantity} onChange={e=>setNewItem({...newItem,minimumOrderQuantity:e.target.value})}/></label><div className="dialog-actions form-span"><button type="button" className="secondary-button" onClick={()=>setNewOpen(false)}>إلغاء</button><button className="primary-button" disabled={saving||!newItem.supplierId}>{saving?'جارٍ الحفظ...':'إضافة المنتج'}</button></div></form></article></div>}
    {itemToDelete && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setItemToDelete(null) }}><article className="modal confirm-modal"><header><h2>حذف منتج من المخزون</h2><button className="icon-button" disabled={saving} onClick={() => setItemToDelete(null)}><X size={20} /></button></header><div className="modal-body"><p>هل تريد حذف <b>{itemToDelete.name}</b> من المخزون؟</p><div className="alert warning">سيختفي المنتج من المخزون والنواقص والتنبيهات، مع الاحتفاظ بحركات المخزون والطلبات السابقة.</div>{itemToDelete.catalogServiceId && <small>لن يتم حذف منتج البيع المرتبط من صفحة الخدمات والمنتجات.</small>}<div className="dialog-actions"><button type="button" className="secondary-button" disabled={saving} onClick={() => setItemToDelete(null)}>إلغاء</button><button type="button" className="danger-button" disabled={saving} onClick={() => void deleteItem()}>{saving ? 'جارٍ الحذف...' : 'نعم، حذف المنتج'}</button></div></div></article></div>}
  </div>
}
