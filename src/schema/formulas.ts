import type { CellValue, FormulaContext, RowData } from '@/schema/types'

export function asNumber(value: CellValue | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export function asString(value: CellValue | undefined): string {
  return typeof value === 'string' ? value : ''
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function refValue(
  row: RowData,
  refColumn: string,
  targetTable: string,
  targetColumn: string,
  context: FormulaContext,
): CellValue | undefined {
  const rowUuid = row[refColumn]
  if (typeof rowUuid !== 'string' || rowUuid.length === 0) {
    return undefined
  }

  return context.lookup(targetTable, rowUuid)?.[targetColumn]
}

export function isTruthyUserActive(value: CellValue | undefined): boolean {
  if (value === true || value === 1) {
    return true
  }

  if (typeof value !== 'string') {
    return false
  }

  return ['TRUE', 'VERDADERO', 'SI', 'SÍ', '1'].includes(value.trim().toUpperCase())
}

export function laboratoryDays(entryDate: CellValue | undefined, now: Date): number | null {
  if (typeof entryDate !== 'string' || entryDate.length === 0) {
    return null
  }

  const entryMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(entryDate)
  if (!entryMatch) {
    return null
  }

  const businessParts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  )

  const entryDay = Date.UTC(
    Number(entryMatch[1]),
    Number(entryMatch[2]) - 1,
    Number(entryMatch[3]),
  )
  const businessDay = Date.UTC(
    Number(businessParts.year),
    Number(businessParts.month) - 1,
    Number(businessParts.day),
  )

  return Math.max(0, (businessDay - entryDay) / 86_400_000)
}

const closedLaboratoryStatuses = new Set([
  '❌ DAÑADO',
  '🏬 ENVIADO A MATRIZ',
  '📦 ENTREGADO',
  '✅ FUNCIONAL',
])

export function laboratorySemaphore(status: CellValue | undefined, days: number | null): string {
  if (days === null) {
    return ''
  }

  if (typeof status === 'string' && closedLaboratoryStatuses.has(status)) {
    return '🔵 CERRADO'
  }

  if (days <= 3) {
    return '🟢 EN TIEMPO'
  }

  if (days <= 6) {
    return '🟡 POR VENCER'
  }

  return '🔴 URGENTE'
}
