import type { RowData, TableDef } from '@/schema'

export interface CollectionViewProps {
  readonly basePath: string
  readonly rows: readonly RowData[]
  readonly table: TableDef
}
