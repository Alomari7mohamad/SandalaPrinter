import { ArrowDownToLine, ArrowUpFromLine, Boxes, ChevronDown, ChevronUp, Edit3, FolderPlus, LoaderCircle, PackageCheck, PackageX, Plus, Search, Settings2, Trash2, TriangleAlert, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { InventoryItemDto, RawMaterialCategoryDto, SupplierDto } from '../../../shared/contracts'
import { packageReorderPoint, splitPackageStock } from '../../../shared/inventory/package-tracking'
import { PageHeader } from '../components/PageHeader'
import { getArabicError } from '../utils/errors'
import { formatCurrency, formatNumber } from '../utils/format'

type InventoryDialogState = { item: InventoryItemDto; mode: 'ADD' | 'REMOVE' | 'SETTINGS' }
type PurchaseMode = 'UNIT' | 'PACKAGE'
const emptyMaterial = (rawMaterialCategoryId = '') => ({ name: '', unit: 'قطعة', rawMaterialCategoryId, purchaseMode: 'UNIT' as PurchaseMode, initialQuantity: '0', unitCost: '0', supplierIds: [] as string[], reorderPoint: '1', minimumOrderQuantity: '1', unitsPerPackage: '500', packagePrice: '0', packageNotes: '', reorderPackageCount: '1' })
const stockStatus = (item: InventoryItemDto) => item.quantity <= 0 ? 'out' : item.lowStockThreshold > 0 && item.quantity <= item.lowStockThreshold ? 'low' : 'good'
const packageSummary = (item: InventoryItemDto) => {
  if (!item.packageEnabled || !item.unitsPerPackage) return `${formatNumber(item.quantity)} ${item.unit}`
  const { fullPackages, looseUnits } = splitPackageStock(item.quantity, item.unitsPerPackage)
  return `${formatNumber(fullPackages)} رزمة${looseUnits > 0 ? ` + ${formatNumber(looseUnits)} ${item.unit}` : ''}`
}

function SupplierList({ suppliers, selected, onChange }: { suppliers: SupplierDto[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const add = (id: string) => { if (id && !selected.includes(id)) onChange([...selected, id]) }
  return <div className="supplier-list-select">
    <select value="" onChange={(event) => add(event.target.value)}><option value="">اختر تاجرًا من القائمة</option>{suppliers.filter((supplier) => !selected.includes(supplier.id)).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.companyName} — {supplier.name} — {supplier.whatsappPhone}</option>)}</select>
    {selected.length > 0 && <div className="selected-suppliers">{selected.map((id) => { const supplier = suppliers.find((item) => item.id === id); return supplier ? <span key={id}><b>{supplier.companyName}</b><small>{supplier.name} • <span dir="ltr">{supplier.whatsappPhone}</span></small><button type="button" onClick={() => onChange(selected.filter((item) => item !== id))} aria-label={`إزالة ${supplier.companyName}`}><X size={14} /></button></span> : null })}</div>}
  </div>
}

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItemDto[]>([])
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([])
  const [categories,setCategories]=useState<RawMaterialCategoryDto[]>([])
  const [categoryFilter,setCategoryFilter]=useState('all')
  const [showCategories,setShowCategories]=useState(false)
  const [categoryDialog,setCategoryDialog]=useState<{id?:string;nameAr:string}|null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [dialog, setDialog] = useState<InventoryDialogState | null>(null)
  const [itemToDelete, setItemToDelete] = useState<InventoryItemDto | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [newItem, setNewItem] = useState(emptyMaterial)
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [purchaseCost, setPurchaseCost] = useState('0')
  const [materialName, setMaterialName] = useState('')
  const [supplierIds, setSupplierIds] = useState<string[]>([])
  const [reorderPoint, setReorderPoint] = useState('1')
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState('1')
  const [packageEnabled, setPackageEnabled] = useState(false)
  const [unitsPerPackage, setUnitsPerPackage] = useState('500')
  const [packagePrice, setPackagePrice] = useState('0')
  const [packageNotes, setPackageNotes] = useState('')
  const [reorderPackageCount, setReorderPackageCount] = useState('1')
  const [materialCategoryId,setMaterialCategoryId]=useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [stock, traders, groups] = await Promise.all([window.desktopApi.inventory.list(), window.desktopApi.shortages.listSuppliers(),window.desktopApi.inventory.listCategories()])
      setItems(stock); setSuppliers(traders);setCategories(groups);setNewItem((current)=>({...current,rawMaterialCategoryId:current.rawMaterialCategoryId||groups[0]?.id||''}))
    } catch (cause) { setError(getArabicError(cause, 'تعذر تحميل المواد الخام.')) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  const filtered = useMemo(() => { const query = search.trim().toLowerCase(); return items.filter((item) => (!query || item.name.toLowerCase().includes(query))&&(categoryFilter==='all'||(categoryFilter==='none'?!item.rawMaterialCategoryId:item.rawMaterialCategoryId===categoryFilter))) }, [items, search,categoryFilter])
  const counts = useMemo(() => ({ out: items.filter((item) => stockStatus(item) === 'out').length, low: items.filter((item) => stockStatus(item) === 'low').length, good: items.filter((item) => stockStatus(item) === 'good').length }), [items])

  const openDialog = (item: InventoryItemDto, mode: InventoryDialogState['mode']) => {
    setDialog({ item, mode }); setQuantity('1'); setNotes(''); setMaterialName(item.name); setPurchaseCost(String(item.purchaseCost)); setSupplierIds(item.suppliers.map((supplier) => supplier.id)); setReorderPoint(String(item.reorderPoint)); setMinimumOrderQuantity(String(item.minimumOrderQuantity)); setPackageEnabled(item.packageEnabled); setUnitsPerPackage(String(item.unitsPerPackage ?? 500)); setPackagePrice(String(item.packagePrice ?? 0)); setPackageNotes(item.packageNotes ?? ''); setReorderPackageCount(String(item.reorderPackageCount ?? 1));setMaterialCategoryId(item.rawMaterialCategoryId??categories[0]?.id??'')
  }
  const replace = (saved: InventoryItemDto) => setItems((current) => current.map((item) => item.id === saved.id ? saved : item))
  const save = async () => {
    if (!dialog || saving) return
    setSaving(true); setError('')
    try {
      const threshold = packageEnabled ? packageReorderPoint(Number(reorderPackageCount), Number(unitsPerPackage)) : Number(reorderPoint)
      const effectiveUnitCost = packageEnabled && Number(unitsPerPackage) > 0 ? Number(packagePrice) / Number(unitsPerPackage) : Number(purchaseCost)
      const saved = dialog.mode === 'SETTINGS'
        ? await window.desktopApi.inventory.updateSettings({ itemId: dialog.item.id, name: materialName.trim(), lowStockThreshold: threshold, purchaseCost: effectiveUnitCost, supplierId: supplierIds[0] ?? null, supplierIds,rawMaterialCategoryId:materialCategoryId, reorderPoint: threshold, minimumOrderQuantity: Number(minimumOrderQuantity), packageEnabled, packageName: packageEnabled ? 'رزمة' : null, unitsPerPackage: packageEnabled ? Number(unitsPerPackage) : null, packagePrice: packageEnabled ? Number(packagePrice) : null, packageNotes: packageEnabled ? (packageNotes.trim() || null) : null, reorderPackageCount: packageEnabled ? Number(reorderPackageCount) : null })
        : await window.desktopApi.inventory.adjust({ itemId: dialog.item.id, type: dialog.mode, quantity: Number(quantity), quantityMode: dialog.mode === 'ADD' && dialog.item.packageEnabled ? 'PACKAGE' : 'UNIT', notes: notes.trim() || null })
      replace(saved); setDialog(null); window.dispatchEvent(new Event('sandala:inventory-changed'))
    } catch (cause) { setError(getArabicError(cause, 'تعذر تحديث المخزون.')) }
    finally { setSaving(false) }
  }
  const createItem = async () => {
    if (saving) return
    setSaving(true); setError('')
    try {
      const isPackage = newItem.purchaseMode === 'PACKAGE', unitCount = Number(newItem.unitsPerPackage), initial = Number(newItem.initialQuantity)
      const threshold = isPackage ? packageReorderPoint(Number(newItem.reorderPackageCount), unitCount) : Number(newItem.reorderPoint)
      const saved = await window.desktopApi.inventory.createItem({ name: newItem.name.trim(), sku: null, barcode: null, itemKind: 'RAW_MATERIAL', unit: newItem.unit.trim(), quantity: isPackage ? initial * unitCount : initial, purchaseCost: isPackage && unitCount > 0 ? Number(newItem.packagePrice) / unitCount : Number(newItem.unitCost), supplierId: newItem.supplierIds[0] ?? null, supplierIds: newItem.supplierIds, categoryId: null,rawMaterialCategoryId:newItem.rawMaterialCategoryId, reorderPoint: threshold, minimumOrderQuantity: Number(newItem.minimumOrderQuantity), packageEnabled: isPackage, packageName: isPackage ? 'رزمة' : null, unitsPerPackage: isPackage ? unitCount : null, packagePrice: isPackage ? Number(newItem.packagePrice) : null, packageNotes: isPackage ? (newItem.packageNotes.trim() || null) : null, reorderPackageCount: isPackage ? Number(newItem.reorderPackageCount) : null })
      setItems((rows) => [...rows, saved].sort((a, b) => a.name.localeCompare(b.name, 'ar'))); setNewOpen(false); setNewItem(emptyMaterial(categories[0]?.id)); window.dispatchEvent(new Event('sandala:inventory-changed'))
    } catch (cause) { setError(getArabicError(cause, 'تعذر إضافة المادة الخام.')) }
    finally { setSaving(false) }
  }
  const deleteItem = async () => {
    if (!itemToDelete || saving) return
    setSaving(true); setError('')
    try { await window.desktopApi.inventory.deleteItem(itemToDelete.id); setItems((current) => current.filter((item) => item.id !== itemToDelete.id)); setItemToDelete(null); window.dispatchEvent(new Event('sandala:inventory-changed')) }
    catch (cause) { setError(getArabicError(cause, 'تعذر حذف المادة الخام.')) }
    finally { setSaving(false) }
  }
  const saveCategory=async()=>{
    if(!categoryDialog?.nameAr.trim()||saving)return
    setSaving(true);setError('')
    try{const saved=await window.desktopApi.inventory.saveCategory({id:categoryDialog.id,nameAr:categoryDialog.nameAr.trim()});setCategories((current)=>[...current.filter((item)=>item.id!==saved.id),saved].sort((a,b)=>a.sortOrder-b.sortOrder));setCategoryFilter(saved.id);setCategoryDialog(null);setNewItem((current)=>({...current,rawMaterialCategoryId:current.rawMaterialCategoryId||saved.id}))}
    catch(cause){setError(getArabicError(cause,'تعذر حفظ تصنيف المواد الخام.'))}
    finally{setSaving(false)}
  }
  const deleteCategory=async(category:RawMaterialCategoryDto)=>{
    if(!window.confirm(`هل تريد حذف تصنيف «${category.nameAr}»؟\nستبقى المواد محفوظة وتنتقل إلى غير مصنف.`))return
    setSaving(true);setError('')
    try{await window.desktopApi.inventory.deleteCategory(category.id);setCategories((current)=>current.filter((item)=>item.id!==category.id));setItems((current)=>current.map((item)=>item.rawMaterialCategoryId===category.id?{...item,rawMaterialCategoryId:null,rawMaterialCategoryName:null}:item));if(categoryFilter===category.id)setCategoryFilter('all')}
    catch(cause){setError(getArabicError(cause,'تعذر حذف التصنيف.'))}
    finally{setSaving(false)}
  }

  return <div className="page inventory-page">
    <PageHeader title="المخزون" subtitle="إدارة المواد الخام والكميات المستهلكة في تنفيذ الخدمات" action={<div className="page-header-actions"><button className="secondary-button" onClick={()=>setCategoryDialog({nameAr:''})}><FolderPlus size={17}/> تصنيف جديد</button><button className="primary-button" onClick={() => setNewOpen(true)}><Plus size={17} /> إضافة مادة خام</button></div>} />
    {error && <div className="alert error">{error}</div>}
    <div className="inventory-metrics"><div className="panel"><Boxes /><span>إجمالي المواد الخام</span><b>{formatNumber(items.length)}</b></div><div className="panel good"><PackageCheck /><span>مخزون جيد</span><b>{formatNumber(counts.good)}</b></div><div className="panel low"><TriangleAlert /><span>مخزون منخفض</span><b>{formatNumber(counts.low)}</b></div><div className="panel out"><PackageX /><span>نفد من المخزون</span><b>{formatNumber(counts.out)}</b></div></div>
    <section className="panel catalog-panel inventory-panel">
      <div className="inventory-toolbar"><div className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم المادة الخام..." /></div><select value={categoryFilter} onChange={(event)=>setCategoryFilter(event.target.value)}><option value="all">كل تصنيفات المواد الخام</option>{categories.map((category)=><option key={category.id} value={category.id}>{category.nameAr}</option>)}{items.some((item)=>!item.rawMaterialCategoryId)&&<option value="none">غير مصنف</option>}</select><button type="button" className="category-list-toggle" aria-expanded={showCategories} onClick={()=>setShowCategories((current)=>!current)}>إدارة التصنيفات {showCategories?<ChevronUp size={17}/>:<ChevronDown size={17}/>}</button><span>{formatNumber(filtered.length)} مادة</span></div>
      {showCategories&&<div className="raw-category-strip">{categories.map((category)=><div key={category.id} className={categoryFilter===category.id?'active':''}><button type="button" onClick={()=>setCategoryFilter(category.id)}><b>{category.nameAr}</b><small>{formatNumber(items.filter((item)=>item.rawMaterialCategoryId===category.id).length)} مادة</small></button><span><button type="button" title="تعديل التصنيف" onClick={()=>setCategoryDialog({id:category.id,nameAr:category.nameAr})}><Edit3 size={15}/></button><button type="button" title="حذف التصنيف" onClick={()=>void deleteCategory(category)}><Trash2 size={15}/></button></span></div>)}</div>}
      {loading ? <div className="table-state"><LoaderCircle className="spin" size={26} /> جارٍ تحميل المواد الخام...</div> : filtered.length === 0 ? <div className="table-state">لا توجد مواد خام مطابقة.</div> : <div className="table-scroll"><table className="data-table inventory-table"><thead><tr><th>المادة الخام</th><th>الكمية الحالية</th><th>التجار</th><th>حد الطلب</th><th>تكلفة الشراء</th><th>الحالة</th><th>الحركات</th><th>الإجراءات</th></tr></thead><tbody>{filtered.map((item) => { const status = stockStatus(item); return <tr key={item.id}><td><b>{item.name}</b><small>{item.packageEnabled ? 'تُشترى بالرزمة' : 'تُشترى بالقطعة'}</small></td><td><strong>{packageSummary(item)}</strong>{item.packageEnabled && <small>{formatNumber(item.quantity)} {item.unit} إجمالاً</small>}</td><td>{item.suppliers.length ? item.suppliers.map((supplier) => <small key={supplier.id}>{supplier.companyName} — <span dir="ltr">{supplier.whatsappPhone}</span></small>) : 'غير محدد'}</td><td>{item.packageEnabled ? `أقل من ${formatNumber(item.reorderPackageCount ?? 0)} رزمة` : `${formatNumber(item.reorderPoint)} ${item.unit}`}</td><td dir="ltr">{item.packageEnabled ? `${formatCurrency(item.packagePrice ?? 0, 3)} / رزمة` : `${formatCurrency(item.purchaseCost, 4)} / ${item.unit}`}</td><td><span className={`stock-badge ${status}`}>{status === 'out' ? 'نفد' : status === 'low' ? 'منخفض' : 'جيد'}</span></td><td><div className="inventory-actions"><button className="stock-in" onClick={() => openDialog(item, 'ADD')}><ArrowDownToLine size={16} /> إضافة</button><button className="stock-out" disabled={item.quantity <= 0} onClick={() => openDialog(item, 'REMOVE')}><ArrowUpFromLine size={16} /> استهلاك</button></div></td><td><div className="row-actions"><button className="icon-button" onClick={() => openDialog(item, 'SETTINGS')} title="إعدادات المادة"><Settings2 size={17} /></button><button className="icon-button danger" onClick={() => setItemToDelete(item)} title="حذف المادة الخام"><Trash2 size={17} /></button></div></td></tr> })}</tbody></table></div>}
    </section>
    {dialog && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null) }}><article className="modal inventory-dialog"><header><h2>{dialog.mode === 'ADD' ? 'إضافة إلى المخزون' : dialog.mode === 'REMOVE' ? 'تسجيل استهلاك' : 'إعدادات المادة الخام'}</h2><button className="icon-button" onClick={() => setDialog(null)}><X size={20} /></button></header><div className="modal-body"><div className="inventory-dialog-item">{dialog.mode==='SETTINGS'?<><span>الرصيد الحالي</span><b>{packageSummary(dialog.item)}</b></>:<><span>المادة الخام</span><b>{dialog.item.name}</b><small>الرصيد الحالي: {packageSummary(dialog.item)}</small></>}</div>{dialog.mode === 'SETTINGS' ? <form className="dialog-form one-column" onSubmit={(event) => { event.preventDefault(); void save() }}><label>اسم المادة الخام<input required autoFocus value={materialName} onChange={(event) => setMaterialName(event.target.value)} /></label><label>تصنيف المادة الخام<select required value={materialCategoryId} onChange={(event)=>setMaterialCategoryId(event.target.value)}><option value="" disabled>اختر التصنيف</option>{categories.map((category)=><option key={category.id} value={category.id}>{category.nameAr}</option>)}</select></label><label>التجار<SupplierList suppliers={suppliers} selected={supplierIds} onChange={setSupplierIds} /></label><div className="purchase-mode"><button type="button" className={!packageEnabled ? 'active' : ''} onClick={() => setPackageEnabled(false)}>شراء بالقطعة</button><button type="button" className={packageEnabled ? 'active' : ''} onClick={() => setPackageEnabled(true)}>شراء بالرزمة</button></div>{packageEnabled ? <div className="package-settings-box"><label>عدد {dialog.item.unit} في الرزمة<input type="number" min="1" step="1" value={unitsPerPackage} onChange={(event) => setUnitsPerPackage(event.target.value)} /></label><label>سعر الرزمة<input type="number" min="0" step="any" value={packagePrice} onChange={(event) => setPackagePrice(event.target.value)} /></label><label>التنبيه عند أقل من عدد رزم<input type="number" min="0" step="1" value={reorderPackageCount} onChange={(event) => setReorderPackageCount(event.target.value)} /></label><label>ملاحظة قصيرة<textarea rows={2} value={packageNotes} onChange={(event) => setPackageNotes(event.target.value)} /></label></div> : <><label>تكلفة القطعة الواحدة<input type="number" min="0" step="any" value={purchaseCost} onChange={(event) => setPurchaseCost(event.target.value)} /></label><label>حد تنبيه انخفاض المخزون<input type="number" min="0" step="1" value={reorderPoint} onChange={(event) => setReorderPoint(event.target.value)} /></label></>}<label>كمية الطلب الدنيا<input type="number" min="1" step="1" value={minimumOrderQuantity} onChange={(event) => setMinimumOrderQuantity(event.target.value)} /></label><div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setDialog(null)}>إلغاء</button><button className="primary-button" disabled={saving||materialName.trim().length<2||!materialCategoryId}>{saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</button></div></form> : <form className="dialog-form one-column" onSubmit={(event) => { event.preventDefault(); void save() }}><label>{dialog.mode === 'ADD' && dialog.item.packageEnabled ? 'عدد الرزم المضافة' : `الكمية (${dialog.item.unit})`}<input type="number" min="0.01" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>{dialog.mode === 'ADD' && dialog.item.packageEnabled && <div className="package-add-preview">سيضاف {formatNumber(Number(quantity) * (dialog.item.unitsPerPackage ?? 0))} {dialog.item.unit}.</div>}<label>ملاحظة<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>{dialog.mode === 'REMOVE' && Number(quantity) > dialog.item.quantity && <div className="alert error">الكمية أكبر من الرصيد الحالي.</div>}<div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setDialog(null)}>إلغاء</button><button className="primary-button" disabled={saving || Number(quantity) <= 0 || (dialog.mode === 'REMOVE' && Number(quantity) > dialog.item.quantity)}>{saving ? 'جارٍ الحفظ...' : dialog.mode === 'ADD' ? 'إضافة الكمية' : 'تسجيل الاستهلاك'}</button></div></form>}</div></article></div>}
    {newOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setNewOpen(false) }}><article className="modal inventory-dialog"><header><h2>إضافة مادة خام</h2><button className="icon-button" onClick={() => setNewOpen(false)}><X size={20} /></button></header><form className="modal-body dialog-form" onSubmit={(event) => { event.preventDefault(); void createItem() }}><label>اسم المادة الخام<input required value={newItem.name} onChange={(event) => setNewItem({ ...newItem, name: event.target.value })} /></label><label>تصنيف المادة الخام<select required value={newItem.rawMaterialCategoryId} onChange={(event)=>setNewItem({...newItem,rawMaterialCategoryId:event.target.value})}><option value="" disabled>اختر التصنيف</option>{categories.map((category)=><option key={category.id} value={category.id}>{category.nameAr}</option>)}</select></label><label>وحدة القطعة<input required value={newItem.unit} onChange={(event) => setNewItem({ ...newItem, unit: event.target.value })} placeholder="ورقة، قطعة، عبوة..." /></label><label className="form-span">التجار<SupplierList suppliers={suppliers} selected={newItem.supplierIds} onChange={(supplierIds) => setNewItem({ ...newItem, supplierIds })} /></label><div className="purchase-mode form-span"><button type="button" className={newItem.purchaseMode === 'UNIT' ? 'active' : ''} onClick={() => setNewItem({ ...newItem, purchaseMode: 'UNIT' })}>أشتريها بالقطعة</button><button type="button" className={newItem.purchaseMode === 'PACKAGE' ? 'active' : ''} onClick={() => setNewItem({ ...newItem, purchaseMode: 'PACKAGE' })}>أشتريها بالرزمة</button></div>{newItem.purchaseMode === 'UNIT' ? <><label>الكمية الموجودة حالياً<input type="number" min="0" step="any" value={newItem.initialQuantity} onChange={(event) => setNewItem({ ...newItem, initialQuantity: event.target.value })} /></label><label>سعر شراء القطعة<input type="number" min="0" step="any" value={newItem.unitCost} onChange={(event) => setNewItem({ ...newItem, unitCost: event.target.value })} /></label><label>حد التنبيه<input type="number" min="0" step="1" value={newItem.reorderPoint} onChange={(event) => setNewItem({ ...newItem, reorderPoint: event.target.value })} /></label></> : <div className="package-settings-box form-span"><label>عدد القطع في الرزمة<input type="number" min="1" step="1" value={newItem.unitsPerPackage} onChange={(event) => setNewItem({ ...newItem, unitsPerPackage: event.target.value })} /></label><label>عدد الرزم الموجودة حالياً<input type="number" min="0" step="any" value={newItem.initialQuantity} onChange={(event) => setNewItem({ ...newItem, initialQuantity: event.target.value })} /></label><label>سعر شراء الرزمة<input type="number" min="0" step="any" value={newItem.packagePrice} onChange={(event) => setNewItem({ ...newItem, packagePrice: event.target.value })} /></label><label>التنبيه عند أقل من عدد رزم<input type="number" min="0" step="1" value={newItem.reorderPackageCount} onChange={(event) => setNewItem({ ...newItem, reorderPackageCount: event.target.value })} /></label><label>ملاحظة قصيرة<textarea rows={2} value={newItem.packageNotes} onChange={(event) => setNewItem({ ...newItem, packageNotes: event.target.value })} /></label><small>سيُحفظ الرصيد بوحدة {newItem.unit || 'القطعة'}: {formatNumber(Number(newItem.initialQuantity) * Number(newItem.unitsPerPackage))}.</small></div>}<label>كمية الطلب الدنيا<input type="number" min="1" step="1" value={newItem.minimumOrderQuantity} onChange={(event) => setNewItem({ ...newItem, minimumOrderQuantity: event.target.value })} /></label><div className="dialog-actions form-span"><button type="button" className="secondary-button" onClick={() => setNewOpen(false)}>إلغاء</button><button className="primary-button" disabled={saving || !newItem.name.trim() || !newItem.unit.trim() || !newItem.rawMaterialCategoryId || (newItem.purchaseMode === 'PACKAGE' && Number(newItem.unitsPerPackage) <= 0)}>{saving ? 'جارٍ الحفظ...' : 'إضافة المادة الخام'}</button></div></form></article></div>}
    {categoryDialog&&<div className="modal-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget&&!saving)setCategoryDialog(null)}}><article className="modal confirm-modal"><header><h2>{categoryDialog.id?'تعديل تصنيف المواد الخام':'إضافة تصنيف مواد خام'}</h2><button className="icon-button" onClick={()=>setCategoryDialog(null)}><X size={20}/></button></header><form className="modal-body dialog-form one-column" onSubmit={(event)=>{event.preventDefault();void saveCategory()}}><label>اسم التصنيف<input autoFocus required value={categoryDialog.nameAr} onChange={(event)=>setCategoryDialog({...categoryDialog,nameAr:event.target.value})} placeholder="مثلاً: ورقيات"/></label><div className="dialog-actions"><button type="button" className="secondary-button" onClick={()=>setCategoryDialog(null)}>إلغاء</button><button className="primary-button" disabled={saving||categoryDialog.nameAr.trim().length<2}>{saving?'جارٍ الحفظ...':'حفظ التصنيف'}</button></div></form></article></div>}
    {itemToDelete && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setItemToDelete(null) }}><article className="modal confirm-modal"><header><h2>حذف مادة خام</h2><button className="icon-button" disabled={saving} onClick={() => setItemToDelete(null)}><X size={20} /></button></header><div className="modal-body"><p>هل تريد حذف <b>{itemToDelete.name}</b>؟</p><div className="alert warning">لا يمكن حذف مادة مستخدمة في وصفة إحدى الخدمات قبل إزالتها من الوصفة.</div><div className="dialog-actions"><button className="secondary-button" disabled={saving} onClick={() => setItemToDelete(null)}>إلغاء</button><button className="danger-button" disabled={saving} onClick={() => void deleteItem()}>{saving ? 'جارٍ الحذف...' : 'نعم، حذف المادة'}</button></div></div></article></div>}
  </div>
}
