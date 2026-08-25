import type { RowData } from '@/schema'

export type WarehouseCategory = 'GPS' | 'SENSOR' | 'ACCESORIO' | 'CCTV'

export interface WarehouseStockMetric {
  readonly name: string
  readonly units: number
}

export interface WarehouseDashboardMetrics {
  readonly products: number
  readonly categories: Readonly<Record<WarehouseCategory, WarehouseStockMetric | undefined>>
  readonly alerts: Readonly<Record<WarehouseStockAlertKind, readonly WarehouseStockAlert[]>>
}

export type WarehouseStockAlertKind = 'REABASTECER' | 'SOBRESTOCK'

export interface WarehouseStockAlert {
  readonly rowUuid: string
  readonly productId: string
  readonly name: string
  readonly category: string
  readonly stock: number
  readonly minimum: number
  readonly maximum: number
}

const warehouseCategories: readonly WarehouseCategory[] = ['GPS', 'SENSOR', 'ACCESORIO', 'CCTV']

export function warehouseDashboardMetrics(rows: readonly RowData[]): WarehouseDashboardMetrics {
  const grouped = new Map<WarehouseCategory, WarehouseStockMetric[]>(
    warehouseCategories.map((category) => [category, []]),
  )
  const alerts: Record<WarehouseStockAlertKind, WarehouseStockAlert[]> = {
    REABASTECER: [],
    SOBRESTOCK: [],
  }

  for (const row of rows) {
    const category = warehouseCategory(row.CATEGORIA)
    const units = numericValue(row.STOCK)
    const name = String(row.NOMBRE ?? row['ID PRODUCTO'] ?? 'Producto sin nombre').trim()
    if (category) grouped.get(category)!.push({ name, units })

    const notice = warehousePurchaseNotice(row)
    if (notice !== 'NIVEL ADECUADO') {
      alerts[notice].push({
        rowUuid: String(row._uuid ?? ''),
        productId: String(row['ID PRODUCTO'] ?? '').trim(),
        name,
        category: String(row.CATEGORIA ?? 'Sin categoria').trim(),
        stock: units,
        minimum: numericValue(row['STOCK MINIMO']),
        maximum: numericValue(row['STOCK MAXIMO']),
      })
    }
  }

  return {
    products: rows.length,
    categories: {
      GPS: highestStock(grouped.get('GPS')!),
      SENSOR: highestStock(grouped.get('SENSOR')!),
      ACCESORIO: highestStock(grouped.get('ACCESORIO')!),
      CCTV: highestStock(grouped.get('CCTV')!),
    },
    alerts: {
      REABASTECER: sortStockAlerts(alerts.REABASTECER),
      SOBRESTOCK: sortStockAlerts(alerts.SOBRESTOCK),
    },
  }
}

export function warehousePurchaseNotice(row: RowData): 'REABASTECER' | 'SOBRESTOCK' | 'NIVEL ADECUADO' {
  const stock = numericValue(row.STOCK)
  const minimum = numericValue(row['STOCK MINIMO'])
  const maximum = numericValue(row['STOCK MAXIMO'])
  if (minimum > 0 && stock <= minimum) return 'REABASTECER'
  if (maximum > 0 && stock > maximum) return 'SOBRESTOCK'
  return 'NIVEL ADECUADO'
}

function sortStockAlerts(values: readonly WarehouseStockAlert[]): readonly WarehouseStockAlert[] {
  return [...values].sort((left, right) =>
    left.stock - right.stock || left.name.localeCompare(right.name, 'es-MX'),
  )
}

function highestStock(values: readonly WarehouseStockMetric[]): WarehouseStockMetric | undefined {
  return [...values].sort((left, right) =>
    right.units - left.units || left.name.localeCompare(right.name, 'es-MX'),
  )[0]
}

function warehouseCategory(value: unknown): WarehouseCategory | undefined {
  const text = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : ''
  const category = text
    .trim()
    .toLocaleUpperCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  return warehouseCategories.find((candidate) => candidate === category)
}

function numericValue(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
