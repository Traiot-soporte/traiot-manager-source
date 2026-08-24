import type { RowData } from '@/schema'

export type SalesCategory = 'GPS' | 'SENSOR' | 'ACCESORIO'

export interface PurchaseSalesMetric {
  readonly name: string
  readonly units: number
}

export interface CategorySalesMetrics {
  readonly mostSold: PurchaseSalesMetric | undefined
  readonly leastSold: PurchaseSalesMetric | undefined
}

export interface PurchaseDashboardMetrics {
  readonly purchases: number
  readonly categories: Readonly<Record<SalesCategory, CategorySalesMetrics>>
}

export function purchaseDashboardMetrics(
  purchases: readonly RowData[],
  orders: readonly RowData[],
  products: readonly RowData[],
): PurchaseDashboardMetrics {
  const productIndex = new Map<string, RowData>()
  for (const product of products) {
    const uuid = normalizedKey(product._uuid)
    const businessId = normalizedKey(product['ID PRODUCTO'])
    if (uuid) productIndex.set(uuid, product)
    if (businessId) productIndex.set(businessId, product)
  }

  const sales = new Map<SalesCategory, Map<string, PurchaseSalesMetric>>([
    ['GPS', new Map()],
    ['SENSOR', new Map()],
    ['ACCESORIO', new Map()],
  ])

  for (const order of orders) {
    if (!isCompletedSale(order['ESTATUS PEDIDO'])) continue
    const productKey = normalizedKey(order.producto_uuid || order['ID PRODUCTO'])
    const product = productIndex.get(productKey)
    if (!product) continue
    const category = salesCategory(product.CATEGORIA)
    if (!category) continue
    const units = numericValue(order['EQUIPOS A VENDER'])
    if (units <= 0) continue
    const name = String(product.NOMBRE ?? product['ID PRODUCTO'] ?? productKey).trim()
    const canonicalKey = normalizedKey(product._uuid || product['ID PRODUCTO'])
    const target = sales.get(category)!
    const current = target.get(canonicalKey)
    target.set(canonicalKey, { name, units: (current?.units ?? 0) + units })
  }

  return {
    purchases: purchases.length,
    categories: {
      GPS: categoryMetrics(sales.get('GPS')!),
      SENSOR: categoryMetrics(sales.get('SENSOR')!),
      ACCESORIO: categoryMetrics(sales.get('ACCESORIO')!),
    },
  }
}

function categoryMetrics(values: ReadonlyMap<string, PurchaseSalesMetric>): CategorySalesMetrics {
  return {
    mostSold: extremeSalesMetric(values, 'most'),
    leastSold: extremeSalesMetric(values, 'least'),
  }
}

function extremeSalesMetric(
  values: ReadonlyMap<string, PurchaseSalesMetric>,
  direction: 'most' | 'least',
): PurchaseSalesMetric | undefined {
  return [...values.values()].sort((left, right) =>
    (direction === 'most' ? right.units - left.units : left.units - right.units) ||
    left.name.localeCompare(right.name, 'es-MX'),
  )[0]
}

function salesCategory(value: unknown): SalesCategory | undefined {
  const category = normalizeText(value)
  if (category === 'GPS' || category === 'SENSOR' || category === 'ACCESORIO') return category
  return undefined
}

function isCompletedSale(value: unknown): boolean {
  const status = normalizeText(value)
  return !status || (status.includes('APROBADO') && !status.includes('NO APROBADO'))
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
