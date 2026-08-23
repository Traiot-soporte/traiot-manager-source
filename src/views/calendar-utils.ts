import type { ColumnDef, RowData, TableDef } from '@/schema'

export function findCalendarDateColumn(table: TableDef): ColumnDef | undefined {
  return table.columns.find((column) =>
    column.origin !== 'system' &&
    !column.hidden &&
    (column.type === 'Date' || column.type === 'DateTime'),
  )
}

export function calendarDateKey(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : mexicoDateKey(date)
}

export function buildCalendarMonthCells(month: Date): readonly ({ key: string; number: number } | null)[] {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const leading = (new Date(year, monthIndex, 1, 12).getDay() + 6) % 7
  const daysInMonth = new Date(year, monthIndex + 1, 0, 12).getDate()
  const cellCount = Math.max(35, Math.ceil((leading + daysInMonth) / 7) * 7)

  return Array.from({ length: cellCount }, (_, index) => {
    const number = index - leading + 1
    if (number < 1 || number > daysInMonth) return null
    return {
      key: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(number).padStart(2, '0')}`,
      number,
    }
  })
}

export function groupCalendarRowsByDate(rows: readonly RowData[], columnName: string): Map<string, RowData[]> {
  const grouped = new Map<string, RowData[]>()
  for (const row of rows) {
    const key = calendarDateKey(row[columnName])
    if (key) grouped.set(key, [...(grouped.get(key) ?? []), row])
  }
  return grouped
}

export function mexicoDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Mexico_City',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}
