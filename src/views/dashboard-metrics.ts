import type { RowData } from '@/schema'
import { safeExternalUrl } from '@/views/url-utils'

export interface DashboardMetricValue {
  readonly label: string
  readonly value: number
}

export type MatrixBreakdownColumn = 'Familia' | 'Marca'

export interface MatrixBreakdownItem {
  readonly label: string
  readonly total: number
}

export function matrixDeviceMetrics(rows: readonly RowData[]): readonly DashboardMetricValue[] {
  return [
    { label: 'Registros', value: rows.length },
    { label: 'Familias', value: matrixDeviceBreakdown(rows, 'Familia').length },
    { label: 'Marcas', value: matrixDeviceBreakdown(rows, 'Marca').length },
    {
      label: 'Fichas técnicas',
      value: rows.filter((row) => Boolean(safeExternalUrl(row.Ficha_Tecnica))).length,
    },
  ]
}

export function matrixDeviceBreakdown(
  rows: readonly RowData[],
  columnName: MatrixBreakdownColumn,
): readonly MatrixBreakdownItem[] {
  const values = new Map<string, MatrixBreakdownItem>()

  for (const row of rows) {
    const rawValue = row[columnName]
    const normalized = normalizeCategory(rawValue)
    if (!normalized) continue

    const current = values.get(normalized)
    values.set(normalized, {
      label: current?.label ?? String(rawValue).trim(),
      total: (current?.total ?? 0) + 1,
    })
  }

  return [...values.values()].sort((left, right) =>
    right.total - left.total || left.label.localeCompare(right.label, 'es-MX'),
  )
}

function normalizeCategory(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return String(value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('es-MX')
}
