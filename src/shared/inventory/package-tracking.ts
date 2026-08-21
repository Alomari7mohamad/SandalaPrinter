export function packageReorderPoint(packageCount: number, unitsPerPackage: number): number {
  if (!Number.isFinite(packageCount) || !Number.isFinite(unitsPerPackage) || packageCount <= 0 || unitsPerPackage <= 0) return 0
  return Math.max(0, packageCount * unitsPerPackage - 1)
}

export function splitPackageStock(quantity: number, unitsPerPackage: number): { fullPackages: number; looseUnits: number } {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitsPerPackage) || unitsPerPackage <= 0) return { fullPackages: 0, looseUnits: quantity }
  const fullPackages = Math.floor(quantity / unitsPerPackage)
  return { fullPackages, looseUnits: quantity - fullPackages * unitsPerPackage }
}
