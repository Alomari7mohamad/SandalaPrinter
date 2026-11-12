import type { ServiceCategoryDto, ServiceDto } from './contracts'

type CountCategory = Pick<ServiceCategoryDto, 'id' | 'itemType'> & Partial<Pick<ServiceCategoryDto, 'parentId' | 'active'>>
type CountItem = Pick<ServiceDto, 'id' | 'itemType' | 'categoryId'> & Partial<Pick<ServiceDto, 'code' | 'active'>>

export function productCounts(categories: CountCategory[], items: CountItem[]) {
  const byId = new Map(categories.filter((category) => category.itemType === 'PRODUCT' && category.active !== false).map((category) => [category.id, category]))
  const byCategory: Record<string, number> = Object.fromEntries([...byId.keys()].map((id) => [id, 0]))
  let total = 0
  let uncategorized = 0
  const counted = new Set<string>()
  for (const item of items) {
    if (item.itemType !== 'PRODUCT' || item.code?.startsWith('ARCHIVED-') || counted.has(item.id)) continue
    counted.add(item.id)
    total += 1
    let category = item.categoryId ? byId.get(item.categoryId) : undefined
    if (!category) uncategorized += 1
    const visited = new Set<string>()
    while (category && !visited.has(category.id)) {
      visited.add(category.id)
      byCategory[category.id] = (byCategory[category.id] ?? 0) + 1
      category = category.parentId ? byId.get(category.parentId) : undefined
    }
  }
  return { total, uncategorized, byCategory }
}
