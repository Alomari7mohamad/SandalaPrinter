import type { ZodError } from 'zod'

const fieldNames: Record<string, string> = {
  nameAr: 'الاسم بالعربية', nameHe: 'الاسم بالعبرية', code: 'الرمز', categoryId: 'التصنيف',
  parentId: 'الفئة الرئيسية', itemType: 'نوع العنصر', unit: 'الوحدة', unitCost: 'تكلفة الوحدة',
  regularSalePrice: 'سعر البيع', offerSalePrice: 'سعر العرض', size: 'الحجم', colorMode: 'نوع الطباعة',
  paperType: 'نوع الورق', coverage: 'التفصيل المحفوظ سابقًا', notes: 'الملاحظات المحفوظة سابقًا',
  minQuantity: 'من كمية', maxQuantity: 'إلى كمية', unitPrice: 'سعر الوحدة', fixedPrice: 'السعر الثابت',
  exactQuantity: 'الكمية المحددة', priority: 'الأولوية', active: 'التفعيل'
}

export function catalogValidationError(error: ZodError): Error {
  const details = error.issues.map((issue) => {
    const path = issue.path.join('.')
    const field = fieldNames[String(issue.path[0])] ?? path
    return path ? `${field} (${path}): ${issue.message}` : issue.message
  })
  return new Error(details.join('\n') || 'البيانات المدخلة غير صحيحة.')
}
