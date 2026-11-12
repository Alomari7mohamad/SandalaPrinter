import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { CatalogItemType, ServiceCategoryDto } from '../../../shared/contracts'
import { getArabicError } from '../utils/errors'
import { Modal } from './Modal'

export function CategoryDialog({ category, categories, initialItemType = 'SERVICE', onClose, onSaved }: { category?: ServiceCategoryDto; categories: ServiceCategoryDto[]; initialItemType?: CatalogItemType; onClose: () => void; onSaved: (category: ServiceCategoryDto) => void }) {
  const [name, setName] = useState(category?.nameAr ?? '')
  const [itemType, setItemType] = useState<CatalogItemType>(category?.itemType ?? initialItemType)
  const [parentId, setParentId] = useState(category?.parentId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => nameInputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [])
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const saved = await window.desktopApi.catalog.saveCategory({ id: category?.id, nameAr: name.trim(), itemType, parentId: parentId || null })
      window.dispatchEvent(new Event('sandala:catalog-changed'))
      onSaved(saved)
    } catch (cause) { setError(getArabicError(cause, 'تعذر حفظ التصنيف.')) }
    finally { setSaving(false) }
  }
  return <Modal title={category ? 'تعديل التصنيف' : 'إضافة تصنيف'} onClose={onClose}>
    <form className="dialog-form one-column" onSubmit={submit}>
      {error && <div className="alert error">{error}</div>}
      <label htmlFor="category-name">اسم التصنيف<input ref={nameInputRef} id="category-name" name="categoryName" type="text" dir="rtl" autoComplete="off" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.currentTarget.value)} placeholder="اكتب اسم التصنيف، مثال: طباعة لوحات" /></label>
      <label>نوع التصنيف
        <select value={itemType} onChange={(event) => { setItemType(event.target.value as CatalogItemType); setParentId('') }}>
          <option value="SERVICE">خدمات</option>
          <option value="PRODUCT">منتجات</option>
        </select>
      </label>
      <label>الفئة الرئيسية
        <select name="parentCategory" value={parentId} onChange={(event) => setParentId(event.target.value)}>
          <option value="">فئة رئيسية مستقلة</option>
          {categories.filter((item) => !item.parentId && item.id !== category?.id && item.itemType === itemType).map((item) => <option key={item.id} value={item.id}>{item.nameAr}</option>)}
        </select>
      </label>
      {category && category.itemType !== itemType && <p>ستنتقل العناصر التابعة لهذا التصنيف إلى الصفحة الموافقة للنوع الجديد.</p>}
      <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>إلغاء</button><button className="primary-button" disabled={saving || name.trim().length < 2}>{saving ? 'جارٍ الحفظ...' : category ? 'حفظ التعديل' : 'إضافة التصنيف'}</button></div>
    </form>
  </Modal>
}
