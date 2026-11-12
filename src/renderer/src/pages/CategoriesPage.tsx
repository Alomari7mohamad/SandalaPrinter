import { useConfirm } from '../components/ConfirmationProvider'
import { Edit3, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CatalogItemType, ServiceCategoryDto, ServiceDto } from '../../../shared/contracts'
import { productCounts } from '../../../shared/product-counts'
import { formatNumber } from '../utils/format'
import { CategoryDialog } from '../components/CategoryDialog'
import { PageHeader } from '../components/PageHeader'
import { getArabicError } from '../utils/errors'

export function CategoriesPage() {
  const confirm = useConfirm()
  const [categories, setCategories] = useState<ServiceCategoryDto[]>([])
  const [items, setItems] = useState<ServiceDto[]>([])
  const [loading, setLoading] = useState(true)
  const [itemType, setItemType] = useState<CatalogItemType>('PRODUCT')
  const [mainId, setMainId] = useState('')
  const [editing, setEditing] = useState<ServiceCategoryDto | 'new' | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const [groups, services] = await Promise.all([window.desktopApi.catalog.listCategories(), window.desktopApi.catalog.listServices()])
      setCategories(groups); setItems(services)
    } catch (cause) {
      setError(getArabicError(cause, 'تعذر تحميل التصنيفات.'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    const reload = () => { void load() }
    reload()
    window.addEventListener('sandala:catalog-changed', reload)
    return () => window.removeEventListener('sandala:catalog-changed', reload)
  }, [])
  const counts = productCounts(categories, items)

  const removeCategory = async (category: ServiceCategoryDto) => {
    if (deleting || !await confirm(`هل تريد حذف «${category.nameAr}»؟\nتنتقل عناصرها إلى «غير مصنف»، وتصبح فئاتها الثانوية فئات رئيسية.`)) return
    setDeleting(true)
    setError('')
    try {
      await window.desktopApi.catalog.deleteCategory(category.id)
      if (mainId === category.id) setMainId('')
      await load()
      window.dispatchEvent(new Event('sandala:catalog-changed'))
    } catch (cause) {
      setError(getArabicError(cause, 'تعذر حذف التصنيف.'))
    } finally {
      setDeleting(false)
    }
  }

  const roots = categories.filter((category) => category.itemType === itemType && !category.parentId)
  const visible = categories.filter((category) => category.itemType === itemType && (!mainId || category.id === mainId || category.parentId === mainId))
    .sort((a,b) => {
      const rootA = categories.find((root) => root.id === (a.parentId ?? a.id))
      const rootB = categories.find((root) => root.id === (b.parentId ?? b.id))
      return (rootA?.sortOrder ?? 0) - (rootB?.sortOrder ?? 0) || Number(Boolean(a.parentId)) - Number(Boolean(b.parentId)) || a.sortOrder - b.sortOrder
    })

  return <div className="page categories-page">
    <PageHeader title="التصنيفات" subtitle="الفئات الرئيسية والثانوية للمنتجات والخدمات"
      action={<button className="primary-button" disabled={loading || deleting} onClick={() => setEditing('new')}><Plus size={18} /> إضافة تصنيف</button>} />
    <section className="panel catalog-panel">
      <div className="catalog-type-tabs" role="group" aria-label="نوع التصنيفات">
        <button className={itemType === 'PRODUCT' ? 'active' : ''} aria-pressed={itemType === 'PRODUCT'} onClick={() => { setItemType('PRODUCT'); setMainId('') }}>تصنيفات المنتجات</button>
        <button className={itemType === 'SERVICE' ? 'active' : ''} aria-pressed={itemType === 'SERVICE'} onClick={() => { setItemType('SERVICE'); setMainId('') }}>تصنيفات الخدمات</button>
      </div>
      <div className="filters-bar"><label>الفئة الرئيسية<select value={mainId} onChange={(event) => setMainId(event.target.value)}><option value="">كل الفئات الرئيسية</option>{roots.map((category) => <option key={category.id} value={category.id}>{category.nameAr}</option>)}</select></label></div>
      {error && <div className="alert error" role="alert">{error}</div>}
      {loading ? <div className="table-state">جارٍ تحميل التصنيفات...</div> : <table className="data-table category-tree-table">
        <thead><tr><th>التصنيف</th><th>المستوى</th>{itemType === 'PRODUCT' && <th>عدد المنتجات</th>}<th>الإجراءات</th></tr></thead>
        <tbody>{visible.map((category) => <tr key={category.id} className={category.parentId ? 'category-child' : 'category-root'}>
          <td><b>{category.nameAr}</b>{category.parentId && <small>{categories.find((root) => root.id === category.parentId)?.nameAr}</small>}</td>
          <td>{category.parentId ? 'فئة ثانوية' : 'فئة رئيسية'}</td>
          {itemType === 'PRODUCT' && <td><article className="category-product-count" aria-label={`عدد منتجات ${category.nameAr}`} data-category-count={category.id}><strong dir="ltr">{formatNumber(counts.byCategory[category.id] ?? 0)}</strong><span>منتج</span></article></td>}
          <td><div className="page-header-actions">
            <button className="secondary-button" disabled={deleting} onClick={() => setEditing(category)}><Edit3 size={16} /> تعديل</button>
            <button className="danger-button" disabled={deleting} aria-label={`حذف تصنيف ${category.nameAr}`} onClick={() => void removeCategory(category)}><Trash2 size={16} /> حذف</button>
          </div></td>
        </tr>)}{visible.length === 0 && <tr><td colSpan={itemType === 'PRODUCT' ? 4 : 3} className="table-state">أضف فئة رئيسية أو ثانوية لهذا النوع.</td></tr>}</tbody>
      </table>}
    </section>
    {editing && <CategoryDialog category={editing === 'new' ? undefined : editing} categories={categories} initialItemType={itemType} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load() }} />}
  </div>
}
