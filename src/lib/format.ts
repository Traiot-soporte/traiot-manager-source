import type { CellValue, ColumnType } from '@/schema'

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat('es-MX', {
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Mexico_City',
})

export function formatCell(value: CellValue | undefined, type: ColumnType): string {
  if (value === undefined || value === null || value === '') {
    return '—'
  }

  if (Array.isArray(value)) {
    return value.join(', ')
  }

  if (type === 'Price' && typeof value === 'number') {
    return currencyFormatter.format(value)
  }

  if (type === 'Number' && typeof value === 'number') {
    return numberFormatter.format(value)
  }

  if ((type === 'Date' || type === 'DateTime') && typeof value === 'string') {
    const date = type === 'Date' ? new Date(value + 'T12:00:00-06:00') : new Date(value)
    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No'
  }

  return String(value)
}
