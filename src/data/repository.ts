import type { RowData, TableSummary, UserContext } from '@/schema'

export interface CreateRowInput {
  readonly table: string
  readonly values: RowData
}

export interface UpdateRowInput {
  readonly table: string
  readonly rowUuid: string
  readonly changes: RowData
}

export interface DeleteRowInput {
  readonly table: string
  readonly rowUuid: string
}

export interface Repository {
  readonly source: 'mock' | 'apps-script'
  readonly sourceLabel: string
  readonly writable: boolean
  getCurrentUser(): Promise<UserContext>
  getSummaries(): Promise<readonly TableSummary[]>
  list(table: string): Promise<readonly RowData[]>
  get(table: string, rowUuid: string): Promise<RowData | undefined>
  create(input: CreateRowInput): Promise<RowData>
  update(input: UpdateRowInput): Promise<RowData>
  delete(input: DeleteRowInput): Promise<RowData>
}
