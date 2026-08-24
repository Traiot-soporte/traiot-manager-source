import type { RowData } from '@/schema'

export type PurchaseCategory = 'GPS' | 'SENSOR' | 'ACCESORIO'

export interface PurchaseVolumeMetric {
  readonly name: string
  readonly units: number
}

export interface CategoryPurchaseMetrics {
  readonly mostPurchased: PurchaseVolumeMetric | undefined
  readonly leastPurchased: PurchaseVolumeMetric | undefined
}

export interface PurchaseDashboardMetrics {
  readonly purchases: number
  readonly categories: Readonly<Record<PurchaseCategory, CategoryPurchaseMetrics>>
}

export function purchaseDashboardMetrics(
  purchases: readonly RowData[],
  products: readonly RowData[],
): PurchaseDashboardMetrics {
  const productIndex = new Map<string, RowData>()
  for (const product of products) {
    const uuid = normalizedKey(product._uuid)
    const businessId = normalizedKey(product['ID PRODUCTO'])
    if (uuid) productIndex.set(uuid, product)
    if (businessId) productIndex.set(businessId, product)
  }

  const volumes = new Map<PurchaseCategory, Map<string, PurchaseVolumeMetric>>([
    ['GPS', new Map()],
    ['SENSOR', new Map()],
    ['ACCESORIO', new Map()],
  ])

  for (const purchase of purchases) {
    const productKey = normalizedKey(purchase.producto_uuid || purchase['ID PRODUCTO'])
    const product = productIndex.get(productKey) ?? purchase
    const category = purchaseCategory(purchase.CATEGORIA || product.CATEGORIA)
    if (!category) continue
    const units = numericValue(purchase.CANTIDAD)
    if (units <= 0) continue
    const name = String(product.NOMBRE ?? purchase.NOMBRE ?? product['ID PRODUCTO'] ?? productKey).trim()
    const canonicalKey = normalizedKey(product._uuid || product['ID PRODUCTO'] || productKey)
    const target = volumes.get(category)!
    const current = target.get(canonicalKey)
    target.set(canonicalKey, { name, units: (current?.units ?? 0) + units })
  }

  return {
    purchases: purchases.length,
    categories: {
      GPS: categoryMetrics(volumes.get('GPS')!),
      SENSOR: categoryMetrics(volumes.get('SENSOR')!),
      ACCESORIO: categoryMetrics(volumes.get('ACCESORIO')!),
    },
  }
}

function categoryMetrics(values: ReadonlyMap<string, PurchaseVolumeMetric>): CategoryPurchaseMetrics {
  return {
    mostPurchased: extremePurchaseMetric(values, 'most'),
    leastPurchased: extremePurchaseMetric(values, 'least'),
  }
}

function extremePurchaseMetric(
  values: ReadonlyMap<string, PurchaseVolumeMetric>,
  direction: 'most' | 'least',
): PurchaseVolumeMetric | undefined {
  return [...values.values()].sort((left, right) =>
    (direction === 'most' ? right.units - left.units : left.units - right.units) ||
    left.name.localeCompare(right.name, 'es-MX'),
  )[0]
}

function purchaseCategory(value: unknown): PurchaseCategory | undefined {
  const category = normalizeText(value)
  if (category === 'GPS' || category === 'SENSOR' || category === 'ACCESORIO') return category
  return undefined
}

function normalizedKey(value: unknown): string {
  const text = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : ''
  return text.trim().toLocaleUpperCase('es-MX')
}

function normalizeText(value: unknown): string {
  return normalizedKey(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function numericValue(value: unknown): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}
