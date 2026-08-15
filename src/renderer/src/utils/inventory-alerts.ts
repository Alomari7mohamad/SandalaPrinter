import type { InventoryItemDto } from '../../../shared/contracts'

export type InventoryAlertItem = InventoryItemDto & { alertType: 'out' | 'low' }

export function getInventoryAlerts(items: InventoryItemDto[]): InventoryAlertItem[] {
  return items
    .flatMap((item): InventoryAlertItem[] => {
      if (item.quantity <= 0) return [{ ...item, alertType: 'out' }]
      if (item.lowStockThreshold > 0 && item.quantity <= item.lowStockThreshold) return [{ ...item, alertType: 'low' }]
      return []
    })
    .sort((left, right) => left.alertType === right.alertType ? left.quantity - right.quantity : left.alertType === 'out' ? -1 : 1)
}
