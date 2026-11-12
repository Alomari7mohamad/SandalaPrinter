import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { catalogValidationError } from './catalog-validation'

describe('catalog validation diagnostics', () => {
  it('reports every invalid field with its label, key and exact reason', () => {
    const result = z.object({ nameAr: z.string().min(2), unitCost: z.number().nonnegative() }).safeParse({ nameAr: '', unitCost: -1 })
    if (result.success) throw new Error('Expected validation to fail')
    const message = catalogValidationError(result.error).message
    expect(message).toContain('الاسم بالعربية (nameAr)')
    expect(message).toContain('تكلفة الوحدة (unitCost)')
    for (const issue of result.error.issues) expect(message).toContain(issue.message)
  })
})
