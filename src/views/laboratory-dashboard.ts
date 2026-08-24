import type { RowData } from '@/schema'

export interface LaboratoryDashboardMetrics {
  readonly total: number
  readonly damaged: number
  readonly functional: number
  readonly urgent: number
  readonly dueSoon: number
  readonly onTime: number
  readonly closed: number
}

export function laboratoryDashboardMetrics(rows: readonly RowData[]): LaboratoryDashboardMetrics {
  const normalized = rows.map((row) => ({
    status: normalizeLaboratoryValue(row.ESTATUS),
    semaphore: normalizeLaboratoryValue(row.SEMAFORO),
  }))
  return {
    total: rows.length,
    damaged: normalized.filter((row) => row.status.includes('DANADO')).length,
    functional: normalized.filter((row) => row.status.includes('FUNCIONAL')).length,
    urgent: normalized.filter((row) => row.semaphore.includes('URGENTE')).length,
    dueSoon: normalized.filter((row) => row.semaphore.includes('POR VENCER')).length,
    onTime: normalized.filter((row) => row.semaphore.includes('EN TIEMPO')).length,
    closed: normalized.filter((row) => row.semaphore.includes('CERRADO')).length,
  }
}

function normalizeLaboratoryValue(value: unknown): string {
  const text = Array.isArray(value)
    ? value.join(' ')
    : typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : ''
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}
