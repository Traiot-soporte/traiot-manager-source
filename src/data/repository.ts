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

export interface AuthSecurityUser {
  readonly userUuid: string
  readonly userId: string
  readonly name: string
  readonly email: string
  readonly role: string
  readonly active: boolean
  readonly credentialConfigured: boolean
  readonly mustChangePassword: boolean
  readonly failedAttempts: number
  readonly locked: boolean
  readonly lockedUntil: string
  readonly lastLoginAt: string
  readonly passwordUpdatedAt: string
  readonly activeSessions: number
}

export interface RolePermissionSyncResult {
  readonly ok: boolean
  readonly profilesUpdated: number
  readonly profilesCreated: number
  readonly duplicateOrUnknownProfilesDisabled: number
  readonly usersUpdated: number
  readonly invalidUsers: readonly string[]
}

export type CommunicationChannel = 'EMAIL' | 'WHATSAPP'
export type CommunicationStatus = 'PROGRAMADO' | 'ABIERTO' | 'ENVIADO' | 'CANCELADO'

export interface ScheduledCommunication {
  readonly communicationUuid: string
  readonly entityTable: 'CLIENTES' | 'Gestion Clientes'
  readonly entityUuid: string
  readonly entityTitle: string
  readonly channel: CommunicationChannel
  readonly recipient: string
  readonly subject: string
  readonly message: string
  readonly scheduledAt: string
  readonly status: CommunicationStatus
  readonly createdAt: string
  readonly openedAt: string
  readonly sentAt: string
  readonly cancelledAt: string
}

export interface CreateCommunicationInput {
  readonly entityTable: 'CLIENTES' | 'Gestion Clientes'
  readonly entityUuid: string
  readonly entityTitle: string
  readonly channel: CommunicationChannel
  readonly recipient: string
  readonly subject: string
  readonly message: string
  readonly scheduledAt: string
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
  listAuthSecurityUsers(): Promise<readonly AuthSecurityUser[]>
  setTemporaryPassword(userUuid: string, password: string): Promise<void>
  unlockAuthUser(userUuid: string): Promise<void>
  revokeAuthUserSessions(userUuid: string): Promise<void>
  setAuthUserActive(userUuid: string, active: boolean): Promise<void>
  syncRolePermissions(): Promise<RolePermissionSyncResult>
  activateAuthentication(): Promise<void>
  listCommunications(): Promise<readonly ScheduledCommunication[]>
  createCommunication(input: CreateCommunicationInput): Promise<ScheduledCommunication>
  updateCommunicationStatus(
    communicationUuid: string,
    status: Extract<CommunicationStatus, 'ABIERTO' | 'ENVIADO' | 'CANCELADO'>,
  ): Promise<ScheduledCommunication>
  getCurrentUser(): Promise<UserContext>
  getSummaries(): Promise<readonly TableSummary[]>
  list(table: string): Promise<readonly RowData[]>
  get(table: string, rowUuid: string): Promise<RowData | undefined>
  getMedia(table: string, value: string): Promise<string | undefined>
  create(input: CreateRowInput): Promise<RowData>
  update(input: UpdateRowInput): Promise<RowData>
  delete(input: DeleteRowInput): Promise<RowData>
}
