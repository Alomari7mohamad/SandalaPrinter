import { z } from 'zod'
import type { ReportRangeInput } from '../../shared/contracts'
import { getBusinessReport } from '../database/reports.repository'

const rangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
}).refine((range) => range.from <= range.to, { message: 'تاريخ البداية يجب أن يسبق تاريخ النهاية.' })

export const reportsService = {
  get(range: ReportRangeInput) {
    const parsed = rangeSchema.safeParse(range)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'الفترة الزمنية غير صحيحة.')
    return getBusinessReport(parsed.data)
  }
}
