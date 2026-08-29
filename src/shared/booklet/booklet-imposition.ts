export type BookletFace = 'OUTSIDE' | 'INSIDE'
export type BookletDirection = 'PAGE_ONE_LEFT' | 'PAGE_ONE_RIGHT'

export interface BookletSide { left: number | null; right: number | null }
export interface BookletSheet { sheetNumber: number; signatureNumber: number; sheetInSignature: number; outside: BookletSide; inside: BookletSide }
export interface BookletSignature { signatureNumber: number; firstPage: number; lastPage: number; paddedLastPage: number; sheets: BookletSheet[] }
export interface BookletPlan { pageCount: number; paddedPageCount: number; blankPageCount: number; sheetCount: number; signatures: BookletSignature[] }

const visiblePage = (page: number, pageCount: number) => page <= pageCount ? page : null
const mirror = (side: BookletSide): BookletSide => ({ left: side.right, right: side.left })

export function createBookletPlan(pageCount: number, signaturePageLimit: number | null = null, pageOneFace: BookletFace = 'OUTSIDE', direction: BookletDirection = 'PAGE_ONE_LEFT'): BookletPlan {
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 2000) throw new Error('عدد الصفحات يجب أن يكون رقمًا صحيحًا من 1 إلى 2000.')
  if (signaturePageLimit !== null && (!Number.isInteger(signaturePageLimit) || signaturePageLimit < 4 || signaturePageLimit % 4 !== 0)) throw new Error('حجم الملزمة يجب أن يكون من مضاعفات 4.')
  const signatures: BookletSignature[] = []
  let firstPage = 1
  let globalSheetNumber = 1
  while (firstPage <= pageCount) {
    const actualPages = Math.min(signaturePageLimit ?? pageCount, pageCount - firstPage + 1)
    const paddedPages = Math.ceil(actualPages / 4) * 4
    const lastPage = firstPage + actualPages - 1
    const paddedLastPage = firstPage + paddedPages - 1
    const signatureNumber = signatures.length + 1
    const sheets: BookletSheet[] = []
    for (let index = 0; index < paddedPages / 4; index += 1) {
      let outside: BookletSide = { left: visiblePage(firstPage + index * 2, pageCount), right: visiblePage(paddedLastPage - index * 2, pageCount) }
      let inside: BookletSide = { left: visiblePage(paddedLastPage - (index * 2 + 1), pageCount), right: visiblePage(firstPage + index * 2 + 1, pageCount) }
      if (pageOneFace === 'INSIDE') [outside, inside] = [inside, outside]
      if (direction === 'PAGE_ONE_RIGHT') { outside = mirror(outside); inside = mirror(inside) }
      sheets.push({ sheetNumber: globalSheetNumber, signatureNumber, sheetInSignature: index + 1, outside, inside })
      globalSheetNumber += 1
    }
    signatures.push({ signatureNumber, firstPage, lastPage, paddedLastPage, sheets })
    firstPage += actualPages
  }
  const paddedPageCount = signatures.reduce((total, signature) => total + signature.sheets.length * 4, 0)
  return { pageCount, paddedPageCount, blankPageCount: paddedPageCount - pageCount, sheetCount: paddedPageCount / 4, signatures }
}
