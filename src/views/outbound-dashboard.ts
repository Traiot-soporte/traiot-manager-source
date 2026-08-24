import type { RowData } from '@/schema'

export type OutboundCategory = 'GPS' | 'SENSOR' | 'ACCESORIO'

export interface OutboundVolumeMetric {
  readonly name: string
  readonly units: number
}

export interface CategoryOutboundMetrics {
  readonly mostDispatched: OutboundVolumeMetric | undefined
  readonly leastDispatched: OutboundVolumeMetric | undefined
}

export interface OutboundDashboardMetrics {
  readonly exits: number
  readonly categories: Readonly<Record<OutboundCategory, CategoryOutboundMetrics>>
}

export function outboundDashboardMetrics(
  orders: readonly RowData[],
  products: readonly RowData[],
): OutboundDashboardMetrics {
  const productIndex = new Map<string, RowData>()
  for (const product of products) {
    const uuid = normalizedKey(product._uuid)
    const businessId = normalizedKey(product['ID PRODUCTO'])
    if (uuid) productIndex.set(uuid, product)
    if (businessId) productIndex.set(businessId, product)
  }

  const volumes = new Map<OutboundCategory, Map<string, OutboundVolumeMetric>>([
    ['GPS', new Map()],
    ['SENSOR', new Map()],
    ['ACCESORIO', new Map()],
  ])
  let exits = 0

  for (const order of orders) {
    if (normalizeText(order['ESTATUS PEDIDO']) !== 'APROBADO') continue
    exits += 1
    const productKey = normalizedKey(order.producto_uuid || order['ID PRODUCTO'])
    const product = productIndex.get(productKey) ?? order
    const category = outboundCategory(order.CATEGORIA || product.CATEGORIA)
    if (!category) continue
    const units = numericValue(order['EQUIPOS A VENDER'])
    if (units <= 0) continue
    const name = String(product.NOMBRE ?? order.NOMBRE ?? product['ID PRODUCTO'] ?? productKey).trim()
    const canonicalKey = normalizedKey(product._uuid || product['ID PRODUCTO'] || productKey)
    const target = volumes.get(category)!
    const current = target.get(canonicalKey)
    target.set(canonicalKey, { name, units: (current?.units ?? 0) + units })
  }

  return {
    exits,
    categories: {
      GPS: categoryMetrics(volumes.get('GPS')!),
      SENSOR: categoryMetrics(volumes.get('SENSOR')!),
      ACCESORIO: categoryMetrics(volumes.get('ACCESORIO')!),
    },
  }
}

function categoryMetrics(values: ReadonlyMap<string, OutboundVolumeMetric>): CategoryOutboundMetrics {
  return {
    mostDispatched: extremeMetric(values, 'most'),
    leastDispatched: extremeMetric(values, 'least'),
  }
}

function extremeMetric(
  values: ReadonlyMap<string, OutboundVolumeMetric>,
  direction: 'most' | 'least',
): OutboundVolumeMetric | undefined {
  return [...values.values()].sort((left, right) =>
    (direction === 'most' ? right.units - left.units : left.units - right.units) ||
    left.name.localeCompare(right.name, 'es-MX'),
  )[0]
}

function outboundCategory(value: unknown): OutboundCategory | undefined {
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
