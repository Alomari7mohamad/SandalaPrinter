import { z } from 'zod'
import type { InventoryAdjustmentInput, InventoryItemInput, InventorySettingsInput } from '../../shared/contracts'
import * as inventoryRepository from '../database/inventory.repository'

const adjustmentSchema = z.object({
  itemId: z.string().min(2).max(100),
  type: z.enum(['ADD', 'REMOVE']),
  quantity: z.number().positive().finite(), quantityMode: z.enum(['UNIT', 'PACKAGE']).optional(),
  notes: z.string().trim().max(500).nullable()
})
const settingsSchema = z.object({
  itemId: z.string().min(2).max(100),
  lowStockThreshold: z.number().min(0).finite(),
  purchaseCost: z.number().min(0).finite(),
  supplierId: z.string().min(2).nullable(),
  reorderPoint: z.number().min(0).finite(),
  minimumOrderQuantity: z.number().positive().finite(), packageEnabled: z.boolean(), packageName: z.string().trim().min(1).max(40).nullable(), unitsPerPackage: z.number().positive().finite().nullable(), packagePrice: z.number().nonnegative().finite().nullable(), packageNotes: z.string().trim().max(300).nullable(), reorderPackageCount: z.number().nonnegative().finite().nullable()
}).superRefine((value, context) => { if(value.packageEnabled && (!value.packageName || !value.unitsPerPackage || value.packagePrice===null || value.reorderPackageCount===null)) context.addIssue({code:'custom',message:'أكمل اسم العبوة وعدد الوحدات وسعر العبوة وحد التنبيه.'}) })
const packageFields={ packageEnabled:z.boolean(), packageName:z.string().trim().min(1).max(40).nullable(), unitsPerPackage:z.number().positive().finite().nullable(), packagePrice:z.number().nonnegative().finite().nullable(), packageNotes:z.string().trim().max(300).nullable(), reorderPackageCount:z.number().nonnegative().finite().nullable() }
const itemSchema=z.object({ name:z.string().trim().min(2).max(150), sku:z.string().trim().max(80).nullable(), unit:z.string().trim().min(1).max(40), quantity:z.number().min(0).finite(), purchaseCost:z.number().min(0).finite(), supplierId:z.string().min(2), reorderPoint:z.number().min(0).finite(), minimumOrderQuantity:z.number().positive().finite(), ...packageFields }).superRefine((value, context) => { if(value.packageEnabled && (!value.packageName || !value.unitsPerPackage || value.packagePrice===null || value.reorderPackageCount===null)) context.addIssue({code:'custom',message:'أكمل بيانات العبوة.'}) })
const itemIdSchema = z.string().trim().min(2).max(100)

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
  },
  createItem(input: InventoryItemInput) { const parsed=itemSchema.safeParse(input); if(!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'بيانات المنتج غير صحيحة.'); return inventoryRepository.createInventoryItem(parsed.data) },
  deleteItem(id: string) {
    const parsed = itemIdSchema.safeParse(id)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'معرّف منتج المخزون غير صالح.')
    inventoryRepository.deleteInventoryItem(parsed.data)
  }
}
