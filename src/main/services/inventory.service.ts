import { z } from 'zod'
import type { InventoryAdjustmentInput, InventorySettingsInput } from '../../shared/contracts'
import * as inventoryRepository from '../database/inventory.repository'

const adjustmentSchema = z.object({
  itemId: z.string().min(2).max(100),
  type: z.enum(['ADD', 'REMOVE']),
  quantity: z.number().positive().finite(),
  notes: z.string().trim().max(500).nullable()
})
const settingsSchema = z.object({
  itemId: z.string().min(2).max(100),
  lowStockThreshold: z.number().min(0).finite(),
  purchaseCost: z.number().min(0).finite()
})

export const inventoryService = {
  list: inventoryRepository.listInventoryItems,
  adjust(input: InventoryAdjustmentInput) {
    const parsed = adjustmentSchema.safeParse(input)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'بيانات حركة المخزون غير صحيحة.')
    return inventoryRepository.adjustInventory(parsed.data)
  },
  updateSettings(input: InventorySettingsInput) {
    const parsed = settingsSchema.safeParse(input)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'إعدادات المخزون غير صحيحة.')
    return inventoryRepository.updateInventorySettings(parsed.data)
  }
}
