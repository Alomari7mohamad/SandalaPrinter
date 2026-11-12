import type { CatalogItemType, ServiceCategoryDto, ServiceDto } from './contracts'

export interface CatalogBranch {
  id: string
  name: string
  children: Array<{ id: string; name: string; items: ServiceDto[] }>
}

export function catalogBranches(categories: ServiceCategoryDto[], items: ServiceDto[], itemType: CatalogItemType): CatalogBranch[] {
  const byId = new Map(categories.filter((category) => category.itemType === itemType).map((category) => [category.id, category]))
  const branches = new Map<string, CatalogBranch>()
  for (const item of items) {
    if (item.itemType !== itemType) continue
    const category = item.categoryId ? byId.get(item.categoryId) : undefined
    const parent = category?.parentId ? byId.get(category.parentId) : undefined
    const rootId = parent?.id ?? category?.id ?? 'uncategorized'
    let branch = branches.get(rootId)
    if (!branch) {
      branch = { id: rootId, name: parent?.nameAr ?? category?.nameAr ?? 'غير مصنف', children: [] }
      branches.set(rootId, branch)
    }
    const leafId = category?.id ?? 'uncategorized'
    let child = branch.children.find((leaf) => leaf.id === leafId)
    if (!child) {
      child = { id: leafId, name: parent ? category!.nameAr : 'عام', items: [] }
      branch.children.push(child)
    }
    child.items.push(item)
  }
  return [...branches.values()]
}
