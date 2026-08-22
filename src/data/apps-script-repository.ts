import { callAppsScript } from '@/data/apps-script-bridge'
import type {
  CreateRowInput,
  DeleteRowInput,
  Repository,
  UpdateRowInput,
} from '@/data/repository'
import type { RowData, TableSummary, UserContext } from '@/schema'

interface ApiUser {
  readonly email: string
  readonly role: string
  readonly permissions: readonly string[]
}

type ApiCaller = (request: Readonly<Record<string, unknown>>) => Promise<unknown>

export class AppsScriptRepository implements Repository {
  readonly source = 'apps-script' as const
  readonly sourceLabel = 'Google Sheets'
  readonly writable = true
  readonly #call: ApiCaller
  readonly #createMutationId: () => string

  constructor(
    call: ApiCaller = callAppsScript,
    createMutationId: () => string = () => globalThis.crypto.randomUUID(),
  ) {
    this.#call = call
    this.#createMutationId = createMutationId
  }

  async getCurrentUser(): Promise<UserContext> {
    const user = await this.#call({ action: 'current-user' }) as ApiUser
    return {
      email: user.email,
      role: user.role,
      permissions: new Set(user.permissions),
    }
  }

  async getSummaries(): Promise<readonly TableSummary[]> {
    return await this.#call({ action: 'summaries' }) as readonly TableSummary[]
  }

  async list(table: string): Promise<readonly RowData[]> {
    return await this.#call({ action: 'list', table }) as readonly RowData[]
  }

  async get(table: string, rowUuid: string): Promise<RowData | undefined> {
    const row = await this.#call({ action: 'get', table, rowUuid }) as RowData | null
    return row ?? undefined
  }

  async getMedia(table: string, value: string): Promise<string | undefined> {
    const media = await this.#call({ action: 'media', table, value }) as string | null
    return media ?? undefined
  }

  async create(input: CreateRowInput): Promise<RowData> {
    return await this.#call({
      action: 'create',
      table: input.table,
      values: input.values,
      mutationId: this.#createMutationId(),
    }) as RowData
  }

  async update(input: UpdateRowInput): Promise<RowData> {
    return await this.#call({
      action: 'update',
      table: input.table,
      rowUuid: input.rowUuid,
      changes: input.changes,
      mutationId: this.#createMutationId(),
    }) as RowData
  }

  async delete(input: DeleteRowInput): Promise<RowData> {
    return await this.#call({
      action: 'delete',
      table: input.table,
      rowUuid: input.rowUuid,
      mutationId: this.#createMutationId(),
    }) as RowData
  }
}

export const appsScriptRepository = new AppsScriptRepository()
