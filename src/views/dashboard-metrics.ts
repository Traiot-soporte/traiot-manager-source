import type { RowData } from '@/schema'
import { safeExternalUrl } from '@/views/url-utils'

export interface DashboardMetricValue {
  readonly label: string
  readonly value: number
}

export function matrixDeviceMetrics(rows: readonly RowData[]): readonly DashboardMetricValue[] {
  return [
    { label: 'Registros', value: rows.length },
    { label: 'Familias', value: countDistinctValues(rows, 'Familia') },
    { label: 'Marcas', value: countDistinctValues(rows, 'Marca') },
    {
      label: 'Fichas técnicas',
      value: rows.filter((row) => Boolean(safeExternalUrl(row.Ficha_Tecnica))).length,
    },
  ]
}

function countDistinctValues(rows: readonly RowData[], columnName: string): number {
  const values = new Set<string>()

  for (const row of rows) {
    const normalized = normalizeCategory(row[columnName])
    if (normalized) values.add(normalized)
  }

  return values.size
}

function normalizeCategory(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return String(value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('es-MX')
}
