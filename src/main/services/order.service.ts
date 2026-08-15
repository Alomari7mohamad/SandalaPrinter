import Decimal from 'decimal.js'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { CreateOrderInput, CreateOrderResult } from '../../shared/contracts'
import type { OrderListQuery } from '../../shared/contracts'
import { calculateInventoryConsumption } from '../../shared/inventory/inventory-consumption'
import { calculatePrice } from '../../shared/pricing/pricing-engine'
import * as catalogRepository from '../database/catalog.repository'
import { getSqlite } from '../database/client'
import * as orderRepository from '../database/order.repository'

const createOrderSchema = z.object({
  items: z.array(z.object({ serviceId: z.string().min(2), quantity: z.number().positive().finite() })).min(1, 'أضف خدمة واحدة على الأقل إلى الطلب.'),
  customerName: z.string().trim().max(150).nullable(),
  customerPhone: z.string().trim().max(50).nullable(),
  deliveryAddress: z.string().trim().max(500).nullable(),
  businessLogoDataUrl: z.string().max(3_000_000).regex(/^data:image\/(png|jpe?g|webp);base64,/i, 'ملف شعار العمل غير صالح.').nullable(),
  notes: z.string().trim().max(1000).nullable()
})

const orderQuerySchema = z.object({
  search: z.string().trim().max(150).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentStatus: z.enum(['PAID', 'UNPAID']).optional(),
  sort: z.enum(['NEWEST', 'HIGHEST_VALUE']).optional()
})

interface PreparedItem {
  id: string
  service: NonNullable<ReturnType<typeof catalogRepository.getService>>
  quantity: number
  salePrice: number
  unitSalePrice: number
  cost: number
  profit: number
  profitMargin: number
  pricingRuleSnapshot: string
  pricingRuleId: string
}

function prepareItem(serviceId: string, quantity: number): PreparedItem {
  const service = catalogRepository.getService(serviceId)
  if (!service) throw new Error('إحدى الخدمات المختارة غير موجودة.')
  const result = calculatePrice(service, catalogRepository.listPricingRules(serviceId), quantity)
  if (result.requiresManualPricing || result.salePrice === null || result.unitSalePrice === null) throw new Error(`لا توجد قاعدة سعر تلقائية صالحة لخدمة: ${service.nameAr}.`)
  if (result.cost === null || result.profit === null || result.profitMargin === null || !result.matchedRule) throw new Error(`تكلفة خدمة ${service.nameAr} غير محددة.`)
  return {
    id: randomUUID(), service, quantity, salePrice: result.salePrice, unitSalePrice: result.unitSalePrice,
    cost: result.cost, profit: result.profit, profitMargin: result.profitMargin,
    pricingRuleSnapshot: JSON.stringify(result.matchedRule), pricingRuleId: result.matchedRule.id
  }
}

export const orderService = {
  list(query: OrderListQuery) {
    const parsed = orderQuerySchema.safeParse(query)
    if (!parsed.success) throw new Error('مرشح الطلبات غير صالح.')
    return orderRepository.listOrders(parsed.data)
  },
  get(id: string) {
    if (!id || id.length > 100) throw new Error('رقم تعريف الطلب غير صالح.')
    const order = orderRepository.getOrder(id)
    if (!order) throw new Error('الطلب المطلوب غير موجود.')
    return order
  },
  setPaymentStatus(id: string, paid: boolean) {
    if (!id || id.length > 100 || typeof paid !== 'boolean') throw new Error('بيانات حالة الدفع غير صحيحة.')
    if (!paid) throw new Error('لا يمكن إعادة الطلب المدفوع إلى غير مدفوع.')
    const order = orderRepository.setOrderPaymentStatus(id, paid)
    if (!order) throw new Error('الطلب المطلوب غير موجود.')
    return order
  },
  create(input: CreateOrderInput): CreateOrderResult {
    const parsed = createOrderSchema.safeParse(input)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'بيانات الطلب غير صحيحة.')
    const preparedItems = parsed.data.items.map((item) => prepareItem(item.serviceId, item.quantity))
    const total = preparedItems.reduce((sum, item) => sum.plus(item.salePrice), new Decimal(0))
    const totalCost = preparedItems.reduce((sum, item) => sum.plus(item.cost), new Decimal(0))
    const profit = total.minus(totalCost)
    const profitMargin = total.isZero() ? new Decimal(0) : profit.dividedBy(total).times(100)
    const database = getSqlite()
    const id = randomUUID()
    const customerName = parsed.data.customerName || 'زبون عام'
    let orderNumber = ''

    database.transaction(() => {
      const lastSequence = database.prepare("SELECT COALESCE(MAX(CAST(SUBSTR(order_number, 5) AS INTEGER)), 0) FROM orders WHERE order_number LIKE 'ORD-%'").pluck().get() as number
      orderNumber = `ORD-${String(lastSequence + 1).padStart(6, '0')}`
      const now = new Date().toISOString()
      database.prepare(`
        INSERT INTO orders (id, order_number, customer_id, status, payment_status, subtotal, discount_type, discount_value, discount_amount, total, total_cost, profit, profit_margin, paid_amount, remaining_amount, customer_name_snapshot, customer_phone_snapshot, delivery_address, business_logo_data_url, notes, ordered_at)
        VALUES (?, ?, 'cash-customer', 'NEW', 'UNPAID', ?, 'NONE', 0, 0, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, orderNumber, total.toNumber(), total.toNumber(), totalCost.toNumber(), profit.toNumber(), profitMargin.toDecimalPlaces(4).toNumber(), total.toNumber(), customerName, parsed.data.customerPhone, parsed.data.deliveryAddress, parsed.data.businessLogoDataUrl, parsed.data.notes, now)

      const insertItem = database.prepare(`
        INSERT INTO order_items (id, order_id, service_id, service_code_snapshot, service_name_snapshot, service_name_he_snapshot, category_snapshot, material_type_snapshot, size_snapshot, color_mode_snapshot, unit_snapshot, quantity, unit_cost_snapshot, total_cost, pricing_rule_id_snapshot, pricing_rule_snapshot, unit_sale_price, total_sale_price, profit, profit_margin, manual_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `)
      for (const item of preparedItems) {
        const effectiveUnitCost = new Decimal(item.cost).dividedBy(item.quantity).toDecimalPlaces(6).toNumber()
        insertItem.run(item.id, id, item.service.id, item.service.code, item.service.nameAr, item.service.nameHe, item.service.categoryName, item.service.paperType, item.service.size, item.service.colorMode, item.service.unit, item.quantity, effectiveUnitCost, item.cost, item.pricingRuleId, item.pricingRuleSnapshot, item.unitSalePrice, item.salePrice, item.profit, item.profitMargin)
      }

      const inventoryConsumption = calculateInventoryConsumption(preparedItems.map((item) => ({
        serviceId: item.service.id,
        categoryId: item.service.categoryId,
        size: item.service.size,
        coverage: item.service.coverage,
        quantity: item.quantity
      })))
      const consumeInventory = database.prepare(`UPDATE inventory_items SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND active = 1`)
      const recordConsumption = database.prepare(`
        INSERT INTO inventory_transactions (id, inventory_item_id, type, quantity, reference_type, reference_id, notes, occurred_at)
        VALUES (?, ?, 'OUT', ?, 'ORDER', ?, 'استهلاك تلقائي عند تأكيد الطلب', ?)
      `)
      for (const consumption of inventoryConsumption) {
        const result = consumeInventory.run(consumption.quantity, consumption.inventoryItemId)
        if (result.changes > 0) recordConsumption.run(randomUUID(), consumption.inventoryItemId, consumption.quantity, id, now)
      }
    })()

    return { id, orderNumber, customerName, total: total.toNumber(), totalCost: totalCost.toNumber(), profit: profit.toNumber(), profitMargin: profitMargin.toDecimalPlaces(4).toNumber(), itemsCount: preparedItems.length }
  }
}
