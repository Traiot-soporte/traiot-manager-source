import type { CellValue, ColumnDef } from '@/schema'

export interface FieldComponentProps {
  readonly column: ColumnDef
  readonly value: CellValue | undefined
  readonly onChange: (value: CellValue | undefined) => void
  readonly error?: string | undefined
  readonly disabled?: boolean
}
