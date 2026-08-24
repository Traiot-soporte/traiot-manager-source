import type { RowData } from '@/schema'

export interface AdjacentRecords {
  readonly previous: RowData | undefined
  readonly next: RowData | undefined
  readonly position: number
  readonly total: number
}

export function getAdjacentRecords(rows: readonly RowData[], rowUuid: string): AdjacentRecords {
  const index = rows.findIndex((row) => String(row._uuid ?? '') === rowUuid)
  if (index < 0) return { previous: undefined, next: undefined, position: 0, total: rows.length }
  return {
    previous: index > 0 ? rows[index - 1] : undefined,
    next: index < rows.length - 1 ? rows[index + 1] : undefined,
    position: index + 1,
    total: rows.length,
  }
}
