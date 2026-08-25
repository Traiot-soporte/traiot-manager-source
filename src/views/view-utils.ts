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

const warehouseTableColumnNames = [
  'No. Item',
  'ID PRODUCTO',
  'PROVEEDOR',
  'NOMBRE',
  'CATEGORIA',
  'STOCK',
  'STOCK MINIMO',
  'STOCK MAXIMO',
  'AVISO DE COMPRA',
]

export function getTableViewColumns(table: TableDef) {
  if (table.name === 'ALMACEN') {
    const columns = getListColumns(table, table.columns.length)

    return warehouseTableColumnNames.flatMap((name) => {
      const column = columns.find((candidate) => candidate.name === name)
      return column ? [column] : []
    })
  }

  if (table.name === 'Gestion Clientes') {
    return getListColumns(table, 8)
      .filter((column) => column.name !== 'Pagina_empresa')
      .slice(0, 6)
  }

  return getListColumns(table, 7)
}

export function getRowTitle(table: TableDef, row: RowData): string {
  const value = row[table.label] ?? row[table.legacyBusinessKey ?? ''] ?? row._uuid
  return String(value ?? 'Registro')
}
