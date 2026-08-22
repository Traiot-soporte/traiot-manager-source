export type PrimitiveValue = string | number | boolean | null
export type CellValue = PrimitiveValue | readonly string[]
export type RowData = Record<string, CellValue | undefined>

export type ColumnType =
  | 'Text'
  | 'LongText'
  | 'Number'
  | 'Price'
  | 'Date'
  | 'DateTime'
  | 'Enum'
  | 'EnumList'
  | 'Ref'
  | 'Image'
  | 'Signature'
  | 'Email'
  | 'Phone'
  | 'Url'
  | 'Address'
  | 'Color'
  | 'Bool'
  | 'Name'
  | 'LatLong'
  | 'List'
  | 'Show'

export type DataOrigin = 'appsheet' | 'migration' | 'system'
export type ViewKind =
  | 'table'
  | 'deck'
  | 'card'
  | 'detail'
  | 'form'
  | 'calendar'
  | 'chart'
  | 'dashboard'

export interface UserContext {
  readonly email: string
  readonly role: string
  readonly permissions: ReadonlySet<string>
}

export interface FormulaContext {
  readonly now: Date
  readonly user: UserContext
  can(permission: string): boolean
  lookup(table: string, rowUuid: string): RowData | undefined
}

export interface ColumnDef<T extends RowData = RowData> {
  readonly name: string
  readonly label?: string
  readonly type: ColumnType
  readonly key?: boolean
  readonly labelColumn?: boolean
  readonly required?: boolean
  readonly hidden?: boolean
  readonly readOnly?: boolean
  readonly virtual?: boolean
  readonly origin?: DataOrigin
  readonly values?: readonly string[]
  readonly ref?: {
    readonly table: string
    readonly keyColumn: string
  }
  readonly syncTo?: string
  readonly formula?: (row: T, context: FormulaContext) => CellValue | undefined
  readonly defaultValue?: (row: T, context: FormulaContext) => CellValue | undefined
  readonly showIf?: (row: T, context: FormulaContext) => boolean
  readonly editableIf?: (row: T, context: FormulaContext) => boolean
  readonly section?: string
  readonly description?: string
}

export interface ChildTableDef {
  readonly table: string
  readonly foreignKey: string
}

export interface TableDef<T extends RowData = RowData> {
  readonly name: string
  readonly sheet: string
  readonly key: string
  readonly label: string
  readonly legacyBusinessKey?: string
  readonly permissionView: string
  readonly module: string
  readonly icon: string
  readonly description: string
  readonly defaultView: ViewKind
  readonly columns: readonly ColumnDef<T>[]
  readonly childTables?: readonly ChildTableDef[]
}

export interface TableSummary {
  readonly name: string
  readonly module: string
  readonly description: string
  readonly icon: string
  readonly rowCount: number
}
