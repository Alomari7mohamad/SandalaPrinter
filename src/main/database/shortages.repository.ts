import { randomUUID } from 'node:crypto'
import type { PurchaseRequestDto, PurchaseRequestInput, SupplierDto, SupplierInput } from '../../shared/contracts'
import { getSqlite } from './client'

interface SupplierRow extends Omit<SupplierDto, 'active'> { active: number }

export function listSuppliers(): SupplierDto[] {
  return (getSqlite().prepare(`SELECT s.id, s.name, s.company_name companyName, s.whatsapp_phone whatsappPhone, s.product_types productTypes, s.active,
    COUNT(i.id) productCount FROM suppliers s LEFT JOIN inventory_items i ON i.supplier_id = s.id AND i.active = 1
    WHERE s.active = 1 GROUP BY s.id ORDER BY s.company_name, s.name`).all() as SupplierRow[])
    .map((row) => ({ ...row, active: Boolean(row.active) }))
}

export function saveSupplier(input: SupplierInput): SupplierDto {
  const database = getSqlite()
  const id = input.id ?? randomUUID()
  database.prepare(`INSERT INTO suppliers (id, name, company_name, whatsapp_phone, product_types) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, company_name=excluded.company_name, whatsapp_phone=excluded.whatsapp_phone, product_types=excluded.product_types, updated_at=CURRENT_TIMESTAMP`)
    .run(id, input.name, input.companyName, input.whatsappPhone, input.productTypes)
  return listSuppliers().find((supplier) => supplier.id === id)!
}

function syncAutomaticRequests(): void {
  const database = getSqlite()
  database.transaction(() => {
    database.prepare(`INSERT OR IGNORE INTO purchase_requests (id, inventory_item_id, supplier_id, requested_quantity, unit_price, source)
      SELECT lower(hex(randomblob(16))), id, supplier_id, minimum_order_quantity, purchase_cost, 'AUTO'
      FROM inventory_items WHERE active=1 AND supplier_id IS NOT NULL AND quantity <= reorder_point`).run()
    database.prepare(`DELETE FROM purchase_requests WHERE source='AUTO' AND inventory_item_id IN
      (SELECT id FROM inventory_items WHERE quantity > reorder_point OR active=0 OR supplier_id IS NULL)`).run()
    database.prepare(`UPDATE purchase_requests SET supplier_id=(SELECT supplier_id FROM inventory_items WHERE id=inventory_item_id),
      requested_quantity=CASE WHEN source='AUTO' THEN (SELECT minimum_order_quantity FROM inventory_items WHERE id=inventory_item_id) ELSE requested_quantity END,
      unit_price=CASE WHEN source='AUTO' THEN (SELECT purchase_cost FROM inventory_items WHERE id=inventory_item_id) ELSE unit_price END,
      updated_at=CURRENT_TIMESTAMP`).run()
  })()
}

export function listRequests(): PurchaseRequestDto[] {
  syncAutomaticRequests()
  return getSqlite().prepare(`SELECT r.id, r.inventory_item_id inventoryItemId, i.name itemName, i.sku, i.unit, i.quantity currentQuantity,
    r.supplier_id supplierId, s.name supplierName, s.company_name companyName, s.whatsapp_phone whatsappPhone,
    r.requested_quantity requestedQuantity, r.unit_price unitPrice, r.requested_quantity*r.unit_price totalPrice, r.source
    FROM purchase_requests r JOIN inventory_items i ON i.id=r.inventory_item_id JOIN suppliers s ON s.id=r.supplier_id
    ORDER BY s.company_name, i.name`).all() as PurchaseRequestDto[]
}

export function saveRequest(input: PurchaseRequestInput): PurchaseRequestDto {
  const database = getSqlite()
  const item = database.prepare(`SELECT supplier_id supplierId FROM inventory_items WHERE id=? AND active=1`).get(input.inventoryItemId) as { supplierId: string | null } | undefined
  if (!item) throw new Error('منتج المخزون غير موجود.')
  if (!item.supplierId) throw new Error('حدد التاجر لهذا المنتج أولًا من صفحة المخزون.')
  database.prepare(`INSERT INTO purchase_requests (id, inventory_item_id, supplier_id, requested_quantity, unit_price, source) VALUES (?, ?, ?, ?, ?, 'MANUAL')
    ON CONFLICT(inventory_item_id) DO UPDATE SET supplier_id=excluded.supplier_id, requested_quantity=excluded.requested_quantity, unit_price=excluded.unit_price, source='MANUAL', updated_at=CURRENT_TIMESTAMP`)
    .run(randomUUID(), input.inventoryItemId, item.supplierId, input.requestedQuantity, input.unitPrice)
  return listRequests().find((request) => request.inventoryItemId === input.inventoryItemId)!
}

export function deleteRequest(id: string): void { getSqlite().prepare('DELETE FROM purchase_requests WHERE id=?').run(id) }
export function getSupplier(id: string): SupplierDto | undefined { return listSuppliers().find((supplier) => supplier.id === id) }
