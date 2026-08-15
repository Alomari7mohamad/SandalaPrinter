import type { OrderDetailDto, OrderItemDto, OrderListQuery, OrderSummaryDto } from '../../shared/contracts'
import { getSqlite } from './client'

interface OrderRow extends OrderSummaryDto { deliveryAddress?: string | null; businessLogoDataUrl?: string | null; notes?: string | null }

const summarySelect = `
  SELECT o.id, o.order_number orderNumber, o.customer_name_snapshot customerName,
    o.customer_phone_snapshot customerPhone, o.total, o.total_cost totalCost, o.profit,
    o.profit_margin profitMargin, o.status, o.payment_status paymentStatus,
    COUNT(oi.id) itemsCount, o.ordered_at orderedAt
  FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
`

export function listOrders(query: OrderListQuery): OrderSummaryDto[] {
  const clauses: string[] = []
  const parameters: unknown[] = []
  const search = query.search?.trim()
  if (search) {
    clauses.push(`(o.order_number LIKE ? OR o.customer_name_snapshot LIKE ? OR COALESCE(o.customer_phone_snapshot, '') LIKE ?)`)
    const pattern = `%${search}%`
    parameters.push(pattern, pattern, pattern)
  }
  if (query.from) { clauses.push(`date(o.ordered_at, 'localtime') >= date(?)`); parameters.push(query.from) }
  if (query.to) { clauses.push(`date(o.ordered_at, 'localtime') <= date(?)`); parameters.push(query.to) }
  if (query.paymentStatus === 'PAID') clauses.push(`o.payment_status = 'PAID'`)
  if (query.paymentStatus === 'UNPAID') clauses.push(`o.payment_status != 'PAID'`)
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const orderBy = query.sort === 'HIGHEST_VALUE' ? 'o.total DESC, o.ordered_at DESC' : 'o.ordered_at DESC, o.order_number DESC'
  return getSqlite().prepare(`${summarySelect} ${where} GROUP BY o.id ORDER BY ${orderBy}`).all(...parameters) as OrderSummaryDto[]
}

export function getOrder(id: string): OrderDetailDto | undefined {
  const order = getSqlite().prepare(`
    SELECT o.id, o.order_number orderNumber, o.customer_name_snapshot customerName,
      o.customer_phone_snapshot customerPhone, o.delivery_address deliveryAddress, o.business_logo_data_url businessLogoDataUrl, o.notes,
      o.total, o.total_cost totalCost, o.profit, o.profit_margin profitMargin, o.status,
      o.payment_status paymentStatus, COUNT(oi.id) itemsCount, o.ordered_at orderedAt
    FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.id = ? GROUP BY o.id
  `).get(id) as OrderRow | undefined
  if (!order) return undefined
  const items = getSqlite().prepare(`
    SELECT id, service_name_snapshot serviceName, service_name_he_snapshot serviceNameHe, category_snapshot categoryName,
      material_type_snapshot materialType, size_snapshot size, color_mode_snapshot colorMode,
      unit_snapshot unit, quantity, unit_sale_price unitSalePrice, total_sale_price totalSalePrice,
      total_cost totalCost, profit
    FROM order_items WHERE order_id = ? ORDER BY created_at, id
  `).all(id) as OrderItemDto[]
  return { ...order, deliveryAddress: order.deliveryAddress ?? null, businessLogoDataUrl: order.businessLogoDataUrl ?? null, notes: order.notes ?? null, items }
}

export function setOrderPaymentStatus(id: string, paid: boolean): OrderSummaryDto | undefined {
  const database = getSqlite()
  const order = database.prepare(`SELECT total, payment_status paymentStatus FROM orders WHERE id = ?`).get(id) as { total: number; paymentStatus: string } | undefined
  if (!order) return undefined
  if (!paid) throw new Error('لا يمكن إعادة الطلب المدفوع إلى غير مدفوع.')
  if (order.paymentStatus === 'PAID') return listOrders({}).find((item) => item.id === id)
  database.prepare(`
    UPDATE orders SET payment_status = 'PAID', paid_amount = ?, remaining_amount = 0, paid_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(order.total, new Date().toISOString(), id)
  return listOrders({}).find((item) => item.id === id)
}
