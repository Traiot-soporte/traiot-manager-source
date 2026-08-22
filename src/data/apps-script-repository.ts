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
  readonly writable = false
  readonly #call: ApiCaller

  constructor(call: ApiCaller = callAppsScript) {
    this.#call = call
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

  create(input: CreateRowInput): Promise<RowData> {
    void input
    return Promise.reject(readOnlyError())
  }

  update(input: UpdateRowInput): Promise<RowData> {
    void input
    return Promise.reject(readOnlyError())
  }

  delete(input: DeleteRowInput): Promise<RowData> {
    void input
    return Promise.reject(readOnlyError())
  }
}

function readOnlyError(): Error {
  return new Error('La conexion real se encuentra temporalmente en modo de solo lectura.')
}

export const appsScriptRepository = new AppsScriptRepository()
