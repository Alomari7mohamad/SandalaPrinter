import type Database from 'better-sqlite3'
import { productSheetSource, productSheetVersion, sheetProducts, type SheetProduct } from './product-sheet.data'

const importKey = 'import.productSheetVersion'
const normalizeName = (name: string) => name.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ar')

interface ExistingProduct {
  id: string
  nameAr: string
  code: string
  notes: string | null
}

export function importProductSheet(database: Database.Database, products: readonly SheetProduct[] = sheetProducts): void {
  if (database.prepare('SELECT value FROM app_settings WHERE key=?').pluck().get(importKey) === productSheetVersion) return

  database.transaction(() => {
    const keys = new Set<string>()
    for (const product of products) {
      if (!product.key || keys.has(product.key) || !product.nameAr.trim() || !product.category.trim()) throw new Error('بيانات جدول المنتجات غير صالحة.')
      keys.add(product.key)
      const prices = [product.unitCost, product.regularSalePrice, product.offerSalePrice]
      if (prices.some((price) => price !== null && (!Number.isFinite(price) || price < 0))) throw new Error('أحد أسعار المنتجات غير صالح.')
    }

    const categories = database.prepare("SELECT id, name_ar nameAr FROM service_categories WHERE item_type='PRODUCT' AND active=1").all() as Array<{id: string; nameAr: string}>
    const categoryIds = new Map(categories.map((category) => [normalizeName(category.nameAr), category.id]))
    const existing = database.prepare("SELECT id, code, name_ar nameAr, notes FROM services WHERE item_type='PRODUCT' AND code NOT LIKE 'ARCHIVED-%'").all() as ExistingProduct[]
    const usedIds = new Set<string>()
    const insertCategory = database.prepare("INSERT INTO service_categories (id, code, name_ar, item_type, sort_order) VALUES (?, ?, ?, 'PRODUCT', ?)")
    const updateProduct = database.prepare(`UPDATE services SET name_ar=?, category_id=?, unit_cost=?,
      cost_type='PER_UNIT', cost_batch_size=NULL, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND item_type='PRODUCT'`)
    const insertProduct = database.prepare(`INSERT INTO services (id, code, name_ar, category_id, unit, item_type, cost_type, unit_cost, cost_calculation, sale_calculation, notes)
      VALUES (?, ?, ?, ?, 'قطعة', 'PRODUCT', 'PER_UNIT', ?, 'COST_STRATEGY', 'PRICING_RULE', ?)`)
    const deactivateRules = database.prepare('UPDATE pricing_rules SET active=0, updated_at=CURRENT_TIMESTAMP WHERE service_id=?')
    const insertPrice = database.prepare(`INSERT INTO pricing_rules (id, service_id, type, min_quantity, sale_unit_price, priority, active)
      VALUES (?, ?, 'UNIT_PRICE', 1, ?, 10, 1)`)
    const maximumSortOrder = Number(database.prepare('SELECT COALESCE(MAX(sort_order),0) FROM service_categories').pluck().get())
    let addedCategories = 0

    for (const product of products) {
      const categoryKey = normalizeName(product.category)
      let categoryId = categoryIds.get(categoryKey)
      if (!categoryId) {
        categoryId = `sheet-category-${product.key}`
        insertCategory.run(categoryId, `SHEET_CATEGORY_${product.key}`, product.category, maximumSortOrder + ++addedCategories)
        categoryIds.set(categoryKey, categoryId)
      }

      const sourceCodes = product.sourceCode ? [product.sourceCode, `GH2000-${product.sourceCode}`] : []
      const codeMatches = existing.filter((item) => sourceCodes.includes(item.code))
      if (codeMatches.length > 1) throw new Error(`رقم منتج مكرر في التطبيق: ${product.sourceCode}`)
      const legacyMatch = product.legacyId ? existing.find((item) => item.id === product.legacyId) : undefined
      if (codeMatches[0] && legacyMatch && codeMatches[0].id !== legacyMatch.id) throw new Error(`تعارض مطابقة المنتج: ${product.nameAr}`)
      const nameMatches = existing.filter((item) => normalizeName(item.nameAr) === normalizeName(product.nameAr))
      const matched = codeMatches[0] ?? legacyMatch ?? (nameMatches.length === 1 ? nameMatches[0] : undefined)
      const id = matched?.id ?? `sheet-product-${product.key}`
      if (usedIds.has(id)) throw new Error(`تكرار مطابقة المنتج: ${product.nameAr}`)
      usedIds.add(id)

      const sourceNotes = [
        matched?.notes,
        `رقم المنتج في جدول الأسعار: ${product.sourceCode || 'غير محدد'}`,
        `سعر البيع الأصلي: ${product.regularSalePrice} ₪`,
        `سعر العرض: ${product.offerSalePrice === null ? 'غير محدد' : product.offerSalePrice + ' ₪'}`,
        'السعر المعتمد للطلب هو سعر العرض عند وجوده.',
        `المصدر: ${productSheetSource}`
      ].filter(Boolean).join('\n')
      if (matched) updateProduct.run(product.nameAr, categoryId, product.unitCost, sourceNotes, id)
      else insertProduct.run(id, `SHEET_PRODUCT_${product.key}`, product.nameAr, categoryId, product.unitCost, sourceNotes)

      deactivateRules.run(id)
      insertPrice.run(`sheet-price-${product.key}`, id, product.offerSalePrice ?? product.regularSalePrice)
    }

    database.prepare(`INSERT INTO app_settings (key,value) VALUES (?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`).run(importKey, productSheetVersion)
  })()
}
