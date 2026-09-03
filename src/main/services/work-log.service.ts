import { z } from 'zod'
import type { ReportRangeInput, WorkLogInput } from '../../shared/contracts'
import * as repository from '../database/work-log.repository'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ غير صالح.')
const inputSchema = z.object({
  workDate: date,
  regularHours: z.number().int('الساعات العادية يجب أن تكون رقمًا صحيحًا.').min(0).max(24).finite(),
  increasedHours: z.number().int('ساعات الزيادة يجب أن تكون رقمًا صحيحًا.').min(0).max(24).finite(),
  hourlyRate: z.number().int('أجر الساعة يجب أن يكون رقمًا صحيحًا.').positive('أدخل قيمة صحيحة لأجر الساعة.').max(100000).finite(),
  additionPercentage: z.number().min(0).max(1000).finite()
}).refine((value) => value.regularHours + value.increasedHours > 0, { message: 'أدخل عدد ساعات العمل.' })
  .refine((value) => value.regularHours + value.increasedHours <= 24, { message: 'مجموع ساعات اليوم لا يمكن أن يتجاوز 24 ساعة.' })

const rangeSchema = z.object({ from: date, to: date }).refine((value) => value.from <= value.to, { message: 'تاريخ البداية يجب أن يسبق تاريخ النهاية.' })

export const workLogService = {
  save(input: WorkLogInput) {
    const parsed = inputSchema.safeParse(input)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'بيانات الدوام غير صحيحة.')
    return repository.saveWorkLog(parsed.data)
  },
  getReport(range: ReportRangeInput) {
    const parsed = rangeSchema.safeParse(range)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'فترة الدوام غير صحيحة.')
    return repository.getWorkLogReport(parsed.data.from, parsed.data.to)
  }
}
