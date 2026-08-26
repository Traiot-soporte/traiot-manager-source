import type { RowData, TableDef } from '@/schema'

export function getDisplayColumns(table: TableDef) {
  const columns = table.columns.filter(
    (column) =>
      !column.hidden &&
      !column.virtual &&
      column.type !== 'List' &&
      column.type !== 'Show',
  )

  if (table.name !== 'Gestion Clientes') return columns

  return crmContactColumnNames.flatMap((name) => {
    const column = columns.find((candidate) => candidate.name === name)
    return column ? [column] : []
  })
}

export function getListColumns(table: TableDef, limit = 6) {
  return getDisplayColumns(table)
    .filter((column) => column.type !== 'Image' && column.type !== 'Signature')
    .slice(0, limit)
}

export function getNamedListColumns(table: TableDef, names: readonly string[]) {
  const columns = getListColumns(table, table.columns.length)

  return names.flatMap((name) => {
    const column = columns.find((candidate) => candidate.name === name)
    return column ? [column] : []
  })
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

export const warehouseCardColumnNames = [
  'NOMBRE',
  'CATEGORIA',
  'PROVEEDOR',
  'STOCK',
] as const

export const warehouseDeckColumnNames = [
  'NOMBRE',
  'CATEGORIA',
  'STOCK',
  'PROVEEDOR',
] as const

export const supplierTableColumnNames = [
  'ID',
  'RAZON_SOCIAL',
  'CALLE',
  'TELEFONO',
  'CORREO_E',
  'CIUDAD',
] as const

export const supplierPreviewColumnNames = [
  'RAZON_SOCIAL',
  'CALLE',
  'TELEFONO',
  'CORREO_E',
  'CIUDAD',
] as const

export const crmContactColumnNames = [
  'ID',
  'Nombre',
  'Cargo',
  'Compañía',
  'Tipo de Contacto',
  'Responsable',
  'Teléfono del trabajo',
  'Móvil',
  'Sitio web Corporativo',
  'E-mail del trabajo',
  'Última actualización en',
  'Origen',
  'Información de origen',
  'Creado por',
  'Creado',
  'Modificado por',
  'Modificado',
  'Comentarios',
] as const

export const crmContactPreviewColumnNames = [
  'ID',
  'Compañía',
  'Nombre',
  'Teléfono del trabajo',
  'Móvil',
  'Responsable',
] as const

export function getTableViewColumns(table: TableDef) {
  if (table.name === 'ALMACEN') {
    return getNamedListColumns(table, warehouseTableColumnNames)
  }

  if (table.name === 'PROVEEDORES') {
    return getNamedListColumns(table, supplierTableColumnNames)
  }

  if (table.name === 'Gestion Clientes') {
    return getNamedListColumns(table, crmContactPreviewColumnNames)
  }

  return getListColumns(table, 7)
}

export function getRowTitle(table: TableDef, row: RowData): string {
  const value = row[table.label] ?? row[table.legacyBusinessKey ?? ''] ?? row._uuid
  return String(value ?? 'Registro')
}
