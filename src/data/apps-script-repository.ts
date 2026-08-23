import { callAppsScript } from '@/data/apps-script-bridge'
import {
  clearAuthSession,
  readAuthSession,
  saveAuthSession,
  type StoredAuthSession,
} from '@/data/auth-session'
import type {
  AuthAdminStatus,
  AuthSecurityUser,
  AuthStatus,
  ChangePasswordInput,
  CreateRowInput,
  DeleteRowInput,
  LoginInput,
  Repository,
  RolePermissionSyncResult,
  UpdateRowInput,
} from '@/data/repository'
import type { RowData, TableSummary, UserContext } from '@/schema'

interface ApiUser {
  readonly userUuid: string
  readonly email: string
  readonly name: string
  readonly role: string
  readonly mustChangePassword: boolean
  readonly permissions: readonly string[]
}

interface ApiLoginResult {
  readonly token: string
  readonly expiresAt: string
  readonly mustChangePassword: boolean
  readonly user: ApiUser
}

interface AuthSessionAdapter {
  get(): StoredAuthSession | undefined
  save(session: StoredAuthSession): void
  clear(): void
}

const browserSessionAdapter: AuthSessionAdapter = {
  get: readAuthSession,
  save: saveAuthSession,
  clear: clearAuthSession,
}

type ApiCaller = (request: Readonly<Record<string, unknown>>) => Promise<unknown>

export class AppsScriptRepository implements Repository {
  readonly source = 'apps-script' as const
  readonly sourceLabel = 'Servidor'
  readonly writable = true
  readonly #call: ApiCaller
  readonly #createMutationId: () => string
  readonly #session: AuthSessionAdapter

  constructor(
    call: ApiCaller = callAppsScript,
    createMutationId: () => string = () => globalThis.crypto.randomUUID(),
    session: AuthSessionAdapter = browserSessionAdapter,
  ) {
    this.#call = call
    this.#createMutationId = createMutationId
    this.#session = session
  }

  async getAuthStatus(): Promise<AuthStatus> {
    return await this.#call({ action: 'auth-status' }) as AuthStatus
  }

  hasSession(): boolean {
    return Boolean(this.#session.get()?.token)
  }

  async login(input: LoginInput): Promise<UserContext> {
    const result = await this.#call({
      action: 'login',
      email: input.email,
      password: input.password,
      remember: input.remember,
    }) as ApiLoginResult
    this.#session.save({
      token: result.token,
      expiresAt: result.expiresAt,
      remember: input.remember,
    })
    return mapApiUser(result.user)
  }

  async logout(): Promise<void> {
    const session = this.#session.get()
    try {
      if (session) await this.#call({ action: 'logout', sessionToken: session.token })
    } finally {
      this.#session.clear()
    }
  }

  async changePassword(input: ChangePasswordInput): Promise<UserContext> {
    const previousSession = this.#session.get()
    const result = await this.#authenticatedCall({
      action: 'change-password',
      currentPassword: input.currentPassword,
      nextPassword: input.nextPassword,
    }) as ApiLoginResult
    this.#session.save({
      token: result.token,
      expiresAt: result.expiresAt,
      remember: previousSession?.remember ?? false,
    })
    return mapApiUser(result.user)
  }

  async getAuthAdminStatus(): Promise<AuthAdminStatus> {
    return await this.#authenticatedCall({ action: 'auth-admin-status' }) as AuthAdminStatus
  }

  async initializeAuthentication(): Promise<AuthAdminStatus> {
    return await this.#authenticatedCall({ action: 'auth-initialize' }) as AuthAdminStatus
  }

  async listAuthSecurityUsers(): Promise<readonly AuthSecurityUser[]> {
    return await this.#authenticatedCall({ action: 'auth-security-users' }) as readonly AuthSecurityUser[]
  }

  async setTemporaryPassword(userUuid: string, password: string): Promise<void> {
    await this.#authenticatedCall({ action: 'auth-set-password', userUuid, password })
  }

  async unlockAuthUser(userUuid: string): Promise<void> {
    await this.#authenticatedCall({ action: 'auth-unlock-user', userUuid })
  }

  async revokeAuthUserSessions(userUuid: string): Promise<void> {
    await this.#authenticatedCall({ action: 'auth-revoke-sessions', userUuid })
  }

  async setAuthUserActive(userUuid: string, active: boolean): Promise<void> {
    await this.#authenticatedCall({ action: 'auth-set-user-active', userUuid, active })
  }

  async syncRolePermissions(): Promise<RolePermissionSyncResult> {
    return await this.#authenticatedCall({
      action: 'auth-sync-role-matrix',
    }) as RolePermissionSyncResult
  }

  async activateAuthentication(): Promise<void> {
    await this.#authenticatedCall({ action: 'auth-activate' })
    this.#session.clear()
  }

  async getCurrentUser(): Promise<UserContext> {
    const user = await this.#authenticatedCall({ action: 'current-user' }) as ApiUser
    return mapApiUser(user)
  }

  async getSummaries(): Promise<readonly TableSummary[]> {
    return await this.#authenticatedCall({ action: 'summaries' }) as readonly TableSummary[]
  }

  async list(table: string): Promise<readonly RowData[]> {
    return await this.#authenticatedCall({ action: 'list', table }) as readonly RowData[]
  }

  async get(table: string, rowUuid: string): Promise<RowData | undefined> {
    const row = await this.#authenticatedCall({ action: 'get', table, rowUuid }) as RowData | null
    return row ?? undefined
  }

  async getMedia(table: string, value: string): Promise<string | undefined> {
    const media = await this.#authenticatedCall({ action: 'media', table, value }) as string | null
    return media ?? undefined
  }

  async create(input: CreateRowInput): Promise<RowData> {
    return await this.#authenticatedCall({
      action: 'create',
      table: input.table,
      values: input.values,
      mutationId: this.#createMutationId(),
    }) as RowData
  }

  async update(input: UpdateRowInput): Promise<RowData> {
    return await this.#authenticatedCall({
      action: 'update',
      table: input.table,
      rowUuid: input.rowUuid,
      changes: input.changes,
      mutationId: this.#createMutationId(),
    }) as RowData
  }

  async delete(input: DeleteRowInput): Promise<RowData> {
    return await this.#authenticatedCall({
      action: 'delete',
      table: input.table,
      rowUuid: input.rowUuid,
      mutationId: this.#createMutationId(),
    }) as RowData
  }

  #authenticatedCall(request: Readonly<Record<string, unknown>>): Promise<unknown> {
    const token = this.#session.get()?.token
    return this.#call(token ? { ...request, sessionToken: token } : request)
  }
}

function mapApiUser(user: ApiUser): UserContext {
  return {
    userUuid: user.userUuid,
    email: user.email,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    permissions: new Set(user.permissions),
  }
}

export const appsScriptRepository = new AppsScriptRepository()
