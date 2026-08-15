import Decimal from 'decimal.js'

export interface InventoryConsumptionSource {
  serviceId: string
  categoryId: string | null
  size: string | null
  coverage: string | null
  quantity: number
}

export interface InventoryConsumption {
  inventoryItemId: string
  quantity: number
}

const directProductInventory: Record<string, string> = {
  'product-black-binder': 'inv-black-binders',
  'product-nylon-folder': 'inv-nylon-folders',
  'product-bag-folder': 'inv-nylon-bags',
  'product-nylon-bag': 'inv-nylon-bags',
  'product-large-staples': 'inv-staples-large',
  'product-small-staples': 'inv-staples-small',
  'product-red-glue': 'inv-red-glue'
}

function add(consumption: Map<string, Decimal>, inventoryItemId: string, quantity: Decimal): void {
  if (quantity.lte(0)) return
  consumption.set(inventoryItemId, (consumption.get(inventoryItemId) ?? new Decimal(0)).plus(quantity))
}

export function calculateInventoryConsumption(sources: InventoryConsumptionSource[]): InventoryConsumption[] {
  const consumption = new Map<string, Decimal>()

  for (const source of sources) {
    const quantity = new Decimal(source.quantity)
    const directItem = directProductInventory[source.serviceId]
    if (directItem) {
      add(consumption, directItem, quantity)
      continue
    }

    if (source.categoryId === 'cat-paper' && (source.size === 'A4' || source.size === 'A3')) {
      add(consumption, source.size === 'A4' ? 'inv-paper-a4' : 'inv-paper-a3', quantity)
      continue
    }
    if (source.categoryId === 'cat-bristol' && (source.size === 'A4' || source.size === 'A3')) {
      add(consumption, source.size === 'A4' ? 'inv-bristol-a4' : 'inv-bristol-a3', quantity)
      continue
    }
    if (source.categoryId === 'cat-chromo' && (source.size === 'A4' || source.size === 'A3')) {
      add(consumption, source.size === 'A4' ? 'inv-chromo-a4' : 'inv-chromo-a3', quantity)
      continue
    }
    if (source.categoryId === 'cat-notebooks') {
      const pages = Number(source.coverage?.match(/\d+/)?.[0] ?? 0)
      if (pages <= 0) continue
      const paperQuantity = quantity.times(pages)
      if (source.size === 'A4') {
        add(consumption, 'inv-paper-a4', paperQuantity)
        add(consumption, 'inv-cardboard', quantity)
      } else if (source.size === 'A5') {
        add(consumption, 'inv-paper-a4', paperQuantity.dividedBy(2))
        add(consumption, 'inv-cardboard', quantity.dividedBy(2))
      }
    }
  }

  return [...consumption.entries()].map(([inventoryItemId, quantity]) => ({
    inventoryItemId,
    quantity: quantity.toDecimalPlaces(4).toNumber()
  }))
}
