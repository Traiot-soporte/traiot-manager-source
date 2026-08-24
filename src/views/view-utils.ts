import type { RowData, TableDef } from '@/schema'

export function getDisplayColumns(table: TableDef) {
  return table.columns.filter(
    (column) =>
      !column.hidden &&
      !column.virtual &&
      column.type !== 'List' &&
      column.type !== 'Show',
  )
}

export function getListColumns(table: TableDef, limit = 6) {
  return getDisplayColumns(table)
    .filter((column) => column.type !== 'Image' && column.type !== 'Signature')
    .slice(0, limit)
}

export function getRowTitle(table: TableDef, row: RowData): string {
  const value = row[table.label] ?? row[table.legacyBusinessKey ?? ''] ?? row._uuid
  return String(value ?? 'Registro')
}
