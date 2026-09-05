import { ChevronDown, ChevronUp, Edit3, Eye, FolderCog, FolderPlus, Plus, Search, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ServiceCategoryDto, ServiceDto } from '../../../shared/contracts'
import type { PriceRule } from '../../../shared/pricing/pricing-types'
import { PageHeader } from '../components/PageHeader'
import { CategoryDialog } from '../components/CategoryDialog'
import { ServiceDialog } from '../components/ServiceDialog'
import { getArabicError } from '../utils/errors'

const costLabel = (service: ServiceDto) => service.unitCost === null ? 'غير محددة' : `${service.unitCost} ₪ / ${service.unit}`

export function ServicesPage() {
  const navigate = useNavigate()
  const [services, setServices] = useState<ServiceDto[]>([])
  const [categories, setCategories] = useState<ServiceCategoryDto[]>([])
  const [rulesByService, setRulesByService] = useState<Record<string, PriceRule[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('true')
  const [editing, setEditing] = useState<ServiceDto | null | 'new'>(null)
  const [editingCategory, setEditingCategory] = useState<ServiceCategoryDto | null | 'new'>(null)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [deletingCategoryId, setDeletingCategoryId] = useState('')
  const load = async () => {
    setLoading(true); setError('')
    try {
      const [serviceRows, categoryRows] = await Promise.all([window.desktopApi.catalog.listServices(), window.desktopApi.catalog.listCategories()])
      const ruleEntries = await Promise.all(serviceRows.map(async (service) => [service.id, await window.desktopApi.pricing.listRules(service.id)] as const))
      setServices(serviceRows); setCategories(categoryRows); setRulesByService(Object.fromEntries(ruleEntries))
    }
    catch (cause) { setError(getArabicError(cause, 'تعذر تحميل الخدمات.')) } finally { setLoading(false) }
  }
  useEffect(() => {
    void load()
    const reload = () => { void load() }
    window.addEventListener('sandala:catalog-changed', reload)
    return () => window.removeEventListener('sandala:catalog-changed', reload)
  }, [])
  const filtered = useMemo(() => services.filter((service) => {
    const query = search.trim().toLowerCase()
    const searchable = `${service.nameAr} ${service.nameHe ?? ''} ${service.code} ${service.paperType ?? ''} ${service.size ?? ''} ${service.colorMode ?? ''}`.toLowerCase()
    return (!query || searchable.includes(query)) && (category === 'all' || service.categoryId === category) && (status === 'all' || String(service.active) === status)
  }), [services, search, category, status])
  const toggle = async (service: ServiceDto) => {
    try { await window.desktopApi.catalog.setServiceActive(service.id, !service.active); setServices((rows) => rows.map((row) => row.id === service.id ? { ...row, active: !row.active } : row)); window.dispatchEvent(new Event('sandala:catalog-changed')) }
    catch (cause) { setError(getArabicError(cause)) }
  }
  const remove = async (service: ServiceDto) => {
    if (!window.confirm(`هل تريد حذف «${service.nameAr}»؟\nستبقى تفاصيلها محفوظة داخل الطلبات السابقة.`)) return
    setDeletingId(service.id); setError('')
    try {
      await window.desktopApi.catalog.deleteService(service.id)
      setServices((rows) => rows.filter((row) => row.id !== service.id))
      setRulesByService((current) => { const next = { ...current }; delete next[service.id]; return next })
      window.dispatchEvent(new Event('sandala:catalog-changed'))
    } catch (cause) { setError(getArabicError(cause, 'تعذر حذف الخدمة.')) }
    finally { setDeletingId('') }
  }
  const removeCategory = async (item: ServiceCategoryDto) => {
    const itemCount = services.filter((service) => service.categoryId === item.id).length
    const explanation = itemCount > 0 ? `\nسيبقى ${itemCount} منتجًا أو خدمة محفوظًا وينتقل إلى «بدون تصنيف».` : ''
    if (!window.confirm(`هل تريد حذف تصنيف «${item.nameAr}»؟${explanation}`)) return
    setDeletingCategoryId(item.id); setError('')
    try {
      await window.desktopApi.catalog.deleteCategory(item.id)
      if (category === item.id) setCategory('all')
      window.dispatchEvent(new Event('sandala:catalog-changed'))
      await load()
    } catch (cause) { setError(getArabicError(cause, 'تعذر حذف التصنيف.')) }
    finally { setDeletingCategoryId('') }
  }

  return <div className="page">
    <PageHeader title="صفحة العمل" subtitle={`${services.length} خدمة محفوظة في قاعدة البيانات`} action={<div className="page-header-actions"><button className="secondary-button" onClick={() => setEditingCategory('new')}><FolderPlus size={18} /> تصنيف جديد</button><button className="primary-button" onClick={() => setEditing('new')}><Plus size={18} /> إضافة منتج</button></div>} />
    {error && <div className="alert error">{error}</div>}
    <section className={`panel category-manager-panel${showCategoryManager ? ' open' : ''}`}>
      <button type="button" className="category-manager-toggle" onClick={() => setShowCategoryManager((current) => !current)}><span><FolderCog size={20} /><span><b>إدارة التصنيفات</b><small>تعديل أسماء التصنيفات أو حذف غير المطلوب منها</small></span></span>{showCategoryManager ? <ChevronUp size={19} /> : <ChevronDown size={19} />}</button>
      {showCategoryManager && <div className="category-manager-grid">{categories.map((item) => { const count = services.filter((service) => service.categoryId === item.id).length; return <article key={item.id}><span><b>{item.nameAr}</b><small>{count} خدمة</small></span><div><button type="button" title="تعديل التصنيف" onClick={() => setEditingCategory(item)}><Edit3 size={16} /></button><button type="button" className="danger" disabled={deletingCategoryId === item.id} title="حذف التصنيف" onClick={() => void removeCategory(item)}><Trash2 size={16} /></button></div></article> })}</div>}
    </section>
    <section className="panel catalog-panel">
      <div className="filters-bar"><div className="search-field"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم، A4، خرومو، ملون..." /></div><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">كل التصنيفات</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.nameAr}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">كل الحالات</option><option value="true">نشط</option><option value="false">غير نشط</option></select></div>
      {loading ? <div className="table-state">جارٍ تحميل الخدمات...</div> : filtered.length === 0 ? <div className="table-state">لا توجد خدمات مطابقة.</div> : <div className="table-scroll services-table-scroll"><table className="data-table services-pricing-table"><thead><tr><th>الخدمة</th><th>التصنيف</th><th>المواصفات</th><th>التكلفة</th><th>قواعد السعر</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>{filtered.map((service) => <tr key={service.id}><td><b>{service.nameAr}</b>{service.nameHe && <small dir="rtl">{service.nameHe}</small>}</td><td>{service.categoryName}</td><td>{[service.size, service.paperType, service.colorMode, service.unit].filter(Boolean).join(' • ') || '—'}</td><td dir="ltr">{costLabel(service)}</td><td><span className="rules-count">{service.pricingRulesCount}</span></td><td><span className={`badge ${service.active ? 'success' : 'muted'}`}>{service.active ? 'نشط' : 'غير نشط'}</span></td><td><div className="row-actions"><button title="تعديل" onClick={() => setEditing(service)}><Edit3 size={16} /></button><button title={service.active ? 'تعطيل' : 'تفعيل'} onClick={() => void toggle(service)}>{service.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}</button><button title="عرض الأسعار" onClick={() => navigate(`/pricing?service=${service.id}`)}><Eye size={17} /></button><button className="danger" disabled={deletingId === service.id} title="حذف" onClick={() => void remove(service)}><Trash2 size={17} /></button></div></td></tr>)}</tbody></table></div>}
    </section>
    {editing && <ServiceDialog service={editing === 'new' ? undefined : editing} pricingRules={editing === 'new' ? [] : rulesByService[editing.id] ?? []} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load() }} />}
    {editingCategory && <CategoryDialog category={editingCategory === 'new' ? undefined : editingCategory} onClose={() => setEditingCategory(null)} onSaved={(saved) => { setEditingCategory(null); setCategory(saved.id); void load() }} />}
  </div>
}
