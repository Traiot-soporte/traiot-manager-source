import type { RowData } from '@/schema'

export type WarehouseCategory = 'GPS' | 'SENSOR' | 'ACCESORIO' | 'CCTV'

export interface WarehouseStockMetric {
  readonly name: string
  readonly units: number
}

export interface WarehouseDashboardMetrics {
  readonly products: number
  readonly categories: Readonly<Record<WarehouseCategory, WarehouseStockMetric | undefined>>
}

const warehouseCategories: readonly WarehouseCategory[] = ['GPS', 'SENSOR', 'ACCESORIO', 'CCTV']

export function warehouseDashboardMetrics(rows: readonly RowData[]): WarehouseDashboardMetrics {
  const grouped = new Map<WarehouseCategory, WarehouseStockMetric[]>(
    warehouseCategories.map((category) => [category, []]),
  )

  for (const row of rows) {
    const category = warehouseCategory(row.CATEGORIA)
    if (!category) continue

    const units = numericValue(row.STOCK)
    const name = String(row.NOMBRE ?? row['ID PRODUCTO'] ?? 'Producto sin nombre').trim()
    grouped.get(category)!.push({ name, units })
  }

  return {
    products: rows.length,
    categories: {
      GPS: highestStock(grouped.get('GPS')!),
      SENSOR: highestStock(grouped.get('SENSOR')!),
      ACCESORIO: highestStock(grouped.get('ACCESORIO')!),
      CCTV: highestStock(grouped.get('CCTV')!),
    },
  }
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
