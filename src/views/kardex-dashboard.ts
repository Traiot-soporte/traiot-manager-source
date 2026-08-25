import type { RowData } from '@/schema'

export interface KardexDashboardMetrics {
  readonly movements: number
  readonly incomingUnits: number
  readonly outgoingUnits: number
  readonly movedProducts: number
}

export function kardexDashboardMetrics(rows: readonly RowData[]): KardexDashboardMetrics {
  let incomingUnits = 0
  let outgoingUnits = 0
  const products = new Set<string>()

  for (const row of rows) {
    const type = String(row.TIPO ?? '').trim().toLocaleUpperCase('es-MX')
    const quantity = Math.abs(numericValue(row.CANTIDAD))
    if (type === 'ENTRADA') incomingUnits += quantity
    if (type === 'SALIDA') outgoingUnits += quantity

    const product = scalarText(row.PRODUCTO) || scalarText(row.producto_uuid)
    if (product) products.add(product.toLocaleUpperCase('es-MX'))
  }

  return {
    movements: rows.length,
    incomingUnits,
    outgoingUnits,
    movedProducts: products.size,
  }
}

function scalarText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function numericValue(value: unknown): number {
  const parsed = Number(typeof value === 'string' ? value.replace(/,/g, '') : value)
  return Number.isFinite(parsed) ? parsed : 0
}
