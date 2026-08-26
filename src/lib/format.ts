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

const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Mexico_City',
})

export function formatCell(value: CellValue | undefined, type: ColumnType): string {
  if (value === undefined || value === null || value === '') {
    return '—'
  }

  if (typeof value === 'string' && /^#(?:ERROR|REF|VALUE|NAME|N\/A|DIV\/0)/i.test(value.trim())) {
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
    const datePart = type === 'Date' ? value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] : undefined
    const date = type === 'Date' && datePart
      ? new Date(datePart + 'T12:00:00-06:00')
      : new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return type === 'DateTime' ? dateTimeFormatter.format(date) : dateFormatter.format(date)
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No'
  }

  return String(value)
}
