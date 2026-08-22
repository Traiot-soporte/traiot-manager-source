import { getTableDefinition, tableDefinitions } from '@/schema'
import type { FormulaContext, RowData, TableSummary, UserContext } from '@/schema'
import { mockRows } from '@/data/mock-data'
import type {
  CreateRowInput,
  DeleteRowInput,
  Repository,
  UpdateRowInput,
} from '@/data/repository'

/* eslint-disable @typescript-eslint/require-await -- La implementación mock conserva el contrato asíncrono del Repository real. */

const mockUser: UserContext = {
  email: 'manuel@traiot.mx',
  role: 'ADMIN',
  permissions: new Set(['*']),
}

function copyRow(row: RowData): RowData {
  return { ...row }
}

export class MockRepository implements Repository {
  readonly source = 'mock' as const
  readonly sourceLabel = 'MockRepository'
  readonly writable = true
  readonly #tables = new Map<string, Map<string, RowData>>()
  readonly #now: () => Date
  readonly #createUuid: () => string

  constructor(
    seed: Readonly<Record<string, readonly RowData[]>> = mockRows,
    now: () => Date = () => new Date(),
    createUuid: () => string = () => globalThis.crypto.randomUUID(),
  ) {
    this.#now = now
    this.#createUuid = createUuid

    for (const table of tableDefinitions) {
      const rows = seed[table.name] ?? []
      this.#tables.set(
        table.name,
        new Map(
          rows.map((row) => {
            const uuid = row._uuid
            if (typeof uuid !== 'string') {
              throw new Error('La fila mock de ' + table.name + ' no tiene _uuid.')
            }
            return [uuid, copyRow(row)]
          }),
        ),
      )
    }
  }

  async getCurrentUser(): Promise<UserContext> {
    return mockUser
  }

  async getSummaries(): Promise<readonly TableSummary[]> {
    return tableDefinitions.map((table) => ({
      name: table.name,
      module: table.module,
      description: table.description,
      icon: table.icon,
      rowCount: this.#activeRows(table.name).length,
    }))
  }

  async list(table: string): Promise<readonly RowData[]> {
    this.#assertTable(table)
    return this.#activeRows(table).map(copyRow)
  }

  async get(table: string, rowUuid: string): Promise<RowData | undefined> {
    this.#assertTable(table)
    const row = this.#tables.get(table)?.get(rowUuid)
    return row && row._deleted !== true ? copyRow(row) : undefined
  }

  async create(input: CreateRowInput): Promise<RowData> {
    this.#assertTable(input.table)
    const rowUuid =
      typeof input.values._uuid === 'string' ? input.values._uuid : this.#createUuid()

    if (this.#tables.get(input.table)?.has(rowUuid)) {
      throw new Error('Ya existe una fila con el identificador ' + rowUuid + '.')
    }

    const row = this.#applyFormulas(input.table, {
      ...copyRow(input.values),
      _uuid: rowUuid,
      _updatedAt: this.#now().toISOString(),
      _deleted: false,
    })
    this.#tables.get(input.table)?.set(rowUuid, row)
    return copyRow(row)
  }

  async update(input: UpdateRowInput): Promise<RowData> {
    this.#assertTable(input.table)
    const current = this.#tables.get(input.table)?.get(input.rowUuid)
    if (!current || current._deleted === true) {
      throw new Error('No se encontró la fila solicitada.')
    }

    const row = this.#applyFormulas(input.table, {
      ...current,
      ...copyRow(input.changes),
      _uuid: input.rowUuid,
      _updatedAt: this.#now().toISOString(),
    })
    this.#tables.get(input.table)?.set(input.rowUuid, row)
    return copyRow(row)
  }

  async delete(input: DeleteRowInput): Promise<RowData> {
    this.#assertTable(input.table)
    const current = this.#tables.get(input.table)?.get(input.rowUuid)
    if (!current || current._deleted === true) {
      throw new Error('No se encontró la fila solicitada.')
    }

    const row: RowData = {
      ...current,
      _deleted: true,
      _updatedAt: this.#now().toISOString(),
    }
    this.#tables.get(input.table)?.set(input.rowUuid, row)
    return copyRow(row)
  }

  #activeRows(table: string): readonly RowData[] {
    return [...(this.#tables.get(table)?.values() ?? [])].filter(
      (row) => row._deleted !== true,
    )
  }

  #assertTable(table: string): void {
    if (!getTableDefinition(table)) {
      throw new Error('Tabla no registrada: ' + table)
    }
  }

  #applyFormulas(tableName: string, row: RowData): RowData {
    const table = getTableDefinition(tableName)
    if (!table) {
      return row
    }

    const context: FormulaContext = {
      now: this.#now(),
      user: mockUser,
      can: () => true,
      lookup: (targetTable, rowUuid) => this.#tables.get(targetTable)?.get(rowUuid),
    }
    const calculated = copyRow(row)

    for (const column of table.columns) {
      if (!column.formula) {
        continue
      }

      const value = column.formula(calculated, context)
      if (value !== undefined) {
        calculated[column.name] = value
      }
    }

    return calculated
  }
}

export const mockRepository = new MockRepository()
