import { Edit3, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ServiceCategoryDto } from '../../../shared/contracts'
import { CategoryDialog } from '../components/CategoryDialog'
import { PageHeader } from '../components/PageHeader'
import { getArabicError } from '../utils/errors'

export function CategoriesPage() {
  const [categories, setCategories] = useState<ServiceCategoryDto[] | null>(null)
  const [editing, setEditing] = useState<ServiceCategoryDto | 'new' | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void window.desktopApi.catalog.listCategories()
      .then(setCategories)
      .catch((cause) => setError(getArabicError(cause, 'تعذر تحميل التصنيفات.')))
  }, [])

  const removeCategory = async (category: ServiceCategoryDto) => {
    if (deleting || !window.confirm(`هل تريد حذف تصنيف «${category.nameAr}»؟\nستبقى المنتجات والخدمات التابعة له محفوظة تحت «بدون تصنيف».`)) return
    setDeleting(true)
    setError('')
    try {
      await window.desktopApi.catalog.deleteCategory(category.id)
      setCategories((current) => current?.filter((item) => item.id !== category.id) ?? null)
      window.dispatchEvent(new Event('sandala:catalog-changed'))
    } catch (cause) {
      setError(getArabicError(cause, 'تعذر حذف التصنيف.'))
    } finally {
      setDeleting(false)
    }
  }

  return <div className="page">
    <PageHeader title="التصنيفات" subtitle="نظّم تصنيفات المنتجات والخدمات"
      action={<button className="primary-button" disabled={deleting || (categories === null && !error)} onClick={() => setEditing('new')}><Plus size={18} /> إضافة تصنيف</button>} />
    {error && <div className="alert error" role="alert">{error}</div>}
    {categories === null ? !error && <div className="panel table-state">جارٍ تحميل التصنيفات...</div> :
      <section className="panel catalog-panel">
        <table className="data-table">
          <thead><tr><th>التصنيف</th><th>النوع</th><th>الإجراءات</th></tr></thead>
          <tbody>
            {categories.map((category) => <tr key={category.id}>
              <td><b>{category.nameAr}</b></td>
              <td>{category.itemType === 'PRODUCT' ? 'منتجات' : 'خدمات'}</td>
              <td>
                <div className="page-header-actions">
                  <button className="secondary-button" type="button" disabled={deleting} onClick={() => setEditing(category)}><Edit3 size={16} /> تعديل</button>
                  <button className="danger-button" type="button" disabled={deleting} aria-label={`حذف تصنيف ${category.nameAr}`} onClick={() => void removeCategory(category)}><Trash2 size={16} /> حذف</button>
                </div>
              </td>
            </tr>)}
            {categories.length === 0 && <tr><td colSpan={3} className="table-state">أضف أول تصنيف للمنتجات أو الخدمات.</td></tr>}
          </tbody>
        </table>
      </section>}
    {editing && <CategoryDialog category={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)}
      onSaved={(saved) => {
        setCategories((current) => [...(current ?? []).filter((category) => category.id !== saved.id), saved]
          .sort((a, b) => a.sortOrder - b.sortOrder || a.nameAr.localeCompare(b.nameAr, 'ar')))
        setEditing(null)
      }} />}
  </div>
}
