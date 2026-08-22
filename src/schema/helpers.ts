import type { ColumnDef, ColumnType, RowData, TableDef } from '@/schema/types'

const syncColumns: readonly ColumnDef[] = [
  {
    name: '_uuid',
    label: 'Identificador interno',
    type: 'Text',
    key: true,
    required: true,
    hidden: true,
    origin: 'system',
  },
  {
    name: '_updatedAt',
    label: 'Última actualización',
    type: 'DateTime',
    readOnly: true,
    hidden: true,
    origin: 'system',
  },
  {
    name: '_deleted',
    label: 'Eliminado',
    type: 'Bool',
    readOnly: true,
    hidden: true,
    origin: 'system',
  },
]

export function defineTable<T extends RowData = RowData>(
  definition: Omit<TableDef<T>, 'key' | 'columns'> & {
    readonly key?: string
    readonly columns: readonly ColumnDef<T>[]
  },
): TableDef<T> {
  const { columns, key = '_uuid', ...table } = definition

  return {
    ...table,
    key,
    columns: [...syncColumns, ...columns],
  }
}

export function migrationRef(
  name: string,
  label: string,
  table: string,
): ColumnDef {
  return {
    name,
    label,
    type: 'Ref',
    hidden: true,
    origin: 'migration',
    ref: { table, keyColumn: '_uuid' },
  }
}

export function repeatedColumns(
  prefix: string,
  amount: number,
  type: ColumnType,
  options: Omit<ColumnDef, 'name' | 'type'> = {},
): readonly ColumnDef[] {
  return Array.from({ length: amount }, (_, index) => ({
    ...options,
    name: prefix + ' ' + String(index + 1),
    type,
  }))
}

export function namedColumns(
  names: readonly string[],
  type: ColumnType = 'Text',
  options: Omit<ColumnDef, 'name' | 'type'> = {},
): readonly ColumnDef[] {
  return names.map((name) => ({ ...options, name, type }))
}

export function appsheetColumnCount(table: TableDef): number {
  return table.columns.filter((column) => (column.origin ?? 'appsheet') === 'appsheet').length
}
