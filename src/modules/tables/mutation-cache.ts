import type { RowData } from '@/schema'

export function upsertMutationResult(
  rows: readonly RowData[] | undefined,
  saved: RowData,
): readonly RowData[] {
  const savedUuid = String(saved._uuid ?? '')
  const currentRows = rows ?? []
  const existingIndex = currentRows.findIndex(
    (row) => String(row._uuid ?? '') === savedUuid,
  )

  if (existingIndex < 0) return [...currentRows, saved]
  return currentRows.map((row, index) => index === existingIndex ? saved : row)
}
