import { z } from 'zod'
import type { PurchaseRequestInput, SupplierInput } from '../../shared/contracts'
import * as repository from '../database/shortages.repository'

const supplierSchema = z.object({ id: z.string().optional(), name: z.string().trim().min(2).max(120), companyName: z.string().trim().min(2).max(150), whatsappPhone: z.string().trim().regex(/^\+?[0-9]{8,15}$/, 'رقم واتساب غير صالح.'), productTypes: z.string().trim().max(500).nullable() })
const requestSchema = z.object({ inventoryItemId: z.string().min(2), requestedQuantity: z.number().positive().finite(), unitPrice: z.number().min(0).finite() })

export const shortagesService = {
  listSuppliers: repository.listSuppliers,
  saveSupplier(input: SupplierInput) { const parsed=supplierSchema.safeParse(input); if(!parsed.success) throw new Error(parsed.error.issues[0]?.message); return repository.saveSupplier(parsed.data) },
  listRequests: repository.listRequests,
  saveRequest(input: PurchaseRequestInput) { const parsed=requestSchema.safeParse(input); if(!parsed.success) throw new Error(parsed.error.issues[0]?.message); return repository.saveRequest(parsed.data) },
  deleteRequest(id: string) { if(!id) throw new Error('معرّف الطلب غير صالح.'); repository.deleteRequest(id) },
  getSupplier: repository.getSupplier
}
