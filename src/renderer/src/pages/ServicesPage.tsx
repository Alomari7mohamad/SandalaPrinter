import { Edit3, Eye, FolderPlus, Plus, Search, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
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
  const [addingCategory, setAddingCategory] = useState(false)
  const [deletingId, setDeletingId] = useState('')
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

  return <div className="page">
    <PageHeader title="الخدمات والمنتجات" subtitle={`${services.length} عنصر محفوظ في قاعدة البيانات`} action={<div className="page-header-actions"><button className="secondary-button" onClick={() => setAddingCategory(true)}><FolderPlus size={18} /> تصنيف جديد</button><button className="primary-button" onClick={() => setEditing('new')}><Plus size={18} /> إضافة خدمة أو منتج</button></div>} />
    {error && <div className="alert error">{error}</div>}
    <section className="panel catalog-panel">
      <div className="filters-bar"><div className="search-field"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم، A4، خرومو، ملون..." /></div><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">كل التصنيفات</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.nameAr}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">كل الحالات</option><option value="true">نشط</option><option value="false">غير نشط</option></select></div>
      {loading ? <div className="table-state">جارٍ تحميل الخدمات...</div> : filtered.length === 0 ? <div className="table-state">لا توجد خدمات مطابقة.</div> : <div className="table-scroll services-table-scroll"><table className="data-table services-pricing-table"><thead><tr><th>الخدمة أو المنتج</th><th>التصنيف</th><th>المواصفات</th><th>التكلفة</th><th>قواعد السعر</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>{filtered.map((service) => <tr key={service.id}><td><b>{service.nameAr}</b>{service.nameHe && <small dir="rtl">{service.nameHe}</small>}</td><td>{service.categoryName}</td><td>{[service.size, service.paperType, service.colorMode, service.unit].filter(Boolean).join(' • ') || '—'}</td><td dir="ltr">{costLabel(service)}</td><td><span className="rules-count">{service.pricingRulesCount}</span></td><td><span className={`badge ${service.active ? 'success' : 'muted'}`}>{service.active ? 'نشط' : 'غير نشط'}</span></td><td><div className="row-actions"><button title="تعديل" onClick={() => setEditing(service)}><Edit3 size={16} /></button><button title={service.active ? 'تعطيل' : 'تفعيل'} onClick={() => void toggle(service)}>{service.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}</button><button title="عرض الأسعار" onClick={() => navigate(`/pricing?service=${service.id}`)}><Eye size={17} /></button><button className="danger" disabled={deletingId === service.id} title="حذف" onClick={() => void remove(service)}><Trash2 size={17} /></button></div></td></tr>)}</tbody></table></div>}
    </section>
    {editing && <ServiceDialog service={editing === 'new' ? undefined : editing} pricingRules={editing === 'new' ? [] : rulesByService[editing.id] ?? []} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load() }} />}
    {addingCategory && <CategoryDialog onClose={() => setAddingCategory(false)} onSaved={(saved) => { setCategories((rows) => [...rows, saved]); setCategory(saved.id); setAddingCategory(false) }} />}
  </div>
}
