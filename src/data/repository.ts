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

export interface AuthStatus {
  readonly mode: string
  readonly passwordLoginActive: boolean
  readonly configured: boolean
}

export interface LoginInput {
  readonly email: string
  readonly password: string
  readonly remember: boolean
}

export interface ChangePasswordInput {
  readonly currentPassword: string
  readonly nextPassword: string
}

export interface AuthAdminStatus {
  readonly configured: boolean
  readonly mode: string
  readonly activeUsers: number
  readonly credentialsReady: number
  readonly duplicates: readonly string[]
  readonly usersMissingPassword: readonly {
    readonly userUuid: string
    readonly name: string
    readonly email: string
  }[]
}

export interface Repository {
  readonly source: 'mock' | 'apps-script'
  readonly sourceLabel: string
  readonly writable: boolean
  getAuthStatus(): Promise<AuthStatus>
  hasSession(): boolean
  login(input: LoginInput): Promise<UserContext>
  logout(): Promise<void>
  changePassword(input: ChangePasswordInput): Promise<UserContext>
  getAuthAdminStatus(): Promise<AuthAdminStatus>
  initializeAuthentication(): Promise<AuthAdminStatus>
  setTemporaryPassword(userUuid: string, password: string): Promise<void>
  activateAuthentication(): Promise<void>
  getCurrentUser(): Promise<UserContext>
  getSummaries(): Promise<readonly TableSummary[]>
  list(table: string): Promise<readonly RowData[]>
  get(table: string, rowUuid: string): Promise<RowData | undefined>
  getMedia(table: string, value: string): Promise<string | undefined>
  create(input: CreateRowInput): Promise<RowData>
  update(input: UpdateRowInput): Promise<RowData>
  delete(input: DeleteRowInput): Promise<RowData>
}
