import { getTableDefinition, tableDefinitions } from '@/schema'
import type { FormulaContext, RowData, TableSummary, UserContext } from '@/schema'
import { mockRows } from '@/data/mock-data'
import { appendCrmCommentHistory } from '@/lib/crm-comments'
import type {
  AuthAdminStatus,
  AuthSecurityUser,
  AuthStatus,
  ChangePasswordInput,
  CompanyMeeting,
  CreateCompanyMeetingInput,
  CreateCompanyMeetingResult,
  CommunicationStatus,
  CreateCommunicationInput,
  CreateRowInput,
  DeleteRowInput,
  LoginInput,
  MeetingParticipant,
  Repository,
  ScheduledCommunication,
  UpdateRowInput,
} from '@/data/repository'

/* eslint-disable @typescript-eslint/require-await -- La implementación mock conserva el contrato asíncrono del Repository real. */

const mockUser: UserContext = {
  userUuid: 'mock-user-001',
  email: 'manuel@traiot.mx',
  role: 'ADMIN',
  permissions: new Set(['*']),
}

function copyRow(row: RowData): RowData {
  return { ...row }
}

export class MockRepository implements Repository {
  readonly source = 'mock' as const
  readonly sourceLabel = 'Demostración'
  readonly writable = true
  readonly #tables = new Map<string, Map<string, RowData>>()
  readonly #communications = new Map<string, ScheduledCommunication>()
  readonly #meetings = new Map<string, CompanyMeeting>()
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

  async getAuthStatus(): Promise<AuthStatus> {
    return { mode: 'OWNER_ONLY', passwordLoginActive: false, configured: false }
  }

  hasSession(): boolean {
    return true
  }

  async login(input: LoginInput): Promise<UserContext> {
    void input
    return mockUser
  }

  async logout(): Promise<void> {}

  async changePassword(input: ChangePasswordInput): Promise<UserContext> {
    void input
    return mockUser
  }

  async getAuthAdminStatus(): Promise<AuthAdminStatus> {
    return {
      configured: false,
      mode: 'OWNER_ONLY',
      activeUsers: 0,
      credentialsReady: 0,
      duplicates: [],
      usersMissingPassword: [],
    }
  }

  async initializeAuthentication(): Promise<AuthAdminStatus> {
    return await this.getAuthAdminStatus()
  }

  async listAuthSecurityUsers(): Promise<readonly AuthSecurityUser[]> {
    return []
  }

  async setTemporaryPassword(userUuid: string, password: string): Promise<void> {
    void userUuid
    void password
  }

  async unlockAuthUser(userUuid: string): Promise<void> {
    void userUuid
  }

  async revokeAuthUserSessions(userUuid: string): Promise<void> {
    void userUuid
  }

  async setAuthUserActive(userUuid: string, active: boolean): Promise<void> {
    void userUuid
    void active
  }

  async syncRolePermissions() {
    return {
      ok: true,
      profilesUpdated: 5,
      profilesCreated: 0,
      duplicateOrUnknownProfilesDisabled: 0,
      usersUpdated: 0,
      invalidUsers: [],
    }
  }

  async activateAuthentication(): Promise<void> {}

  async listMeetingParticipants(): Promise<readonly MeetingParticipant[]> {
    return this.#activeRows('Usuarios').map((row) => ({
      userUuid: String(row._uuid ?? ''),
      name: String(row.UserName ?? row.UserID ?? 'Usuario'),
      email: String(row.UserEmail ?? ''),
      role: String(row.UserRole ?? ''),
      phone: String(row.UserPhone ?? ''),
    })).filter((participant) => participant.email.includes('@'))
  }

  async listCompanyMeetings(): Promise<readonly CompanyMeeting[]> {
    return [...this.#meetings.values()].sort((left, right) => left.startAt.localeCompare(right.startAt))
  }

  async createCompanyMeeting(input: CreateCompanyMeetingInput): Promise<CreateCompanyMeetingResult> {
    const available = await this.listMeetingParticipants()
    const selected = available.filter((participant) => input.participantUuids.includes(participant.userUuid))
    const meetingUuid = this.#createUuid()
    const now = this.#now().toISOString()
    const meeting: CompanyMeeting = {
      meetingUuid,
      title: input.title,
      description: input.description,
      startAt: input.startAt,
      endAt: input.endAt,
      meetUrl: input.meetUrl,
      participants: selected,
      organizerName: mockUser.name ?? 'Usuario',
      organizerEmail: mockUser.email,
      createdAt: now,
    }
    this.#meetings.set(meetingUuid, meeting)
    const invitation = meetingInvitationText(meeting)
    if (selected.length > 0) {
      await this.createMeetingCommunication(
        meeting,
        'EMAIL',
        selected.map((participant) => participant.email).join(', '),
        invitation,
        now,
      )
    }
    const whatsappRecipients = selected
      .filter((participant) => input.whatsappParticipantUuids.includes(participant.userUuid) && participant.phone)
      .filter((participant, index, all) => all.findIndex((candidate) => candidate.phone === participant.phone) === index)
    for (const recipient of whatsappRecipients) {
      await this.createMeetingCommunication(meeting, 'WHATSAPP', recipient.phone, invitation, now, recipient.name)
    }
    return {
      meeting: { ...meeting },
      emailInvitations: selected.length > 0 ? 1 : 0,
      emailRecipients: selected.length,
      whatsappInvitations: whatsappRecipients.length,
    }
  }

  async listCommunications(): Promise<readonly ScheduledCommunication[]> {
    return [...this.#communications.values()]
      .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))
  }

  async createCommunication(input: CreateCommunicationInput): Promise<ScheduledCommunication> {
    const communicationUuid = this.#createUuid()
    const record: ScheduledCommunication = {
      ...input,
      communicationUuid,
      status: 'PROGRAMADO',
      createdAt: this.#now().toISOString(),
      openedAt: '',
      sentAt: '',
      cancelledAt: '',
    }
    this.#communications.set(communicationUuid, record)
    return { ...record }
  }

  async updateCommunicationStatus(
    communicationUuid: string,
    status: Extract<CommunicationStatus, 'ABIERTO' | 'ENVIADO' | 'CANCELADO'>,
  ): Promise<ScheduledCommunication> {
    const current = this.#communications.get(communicationUuid)
    if (!current) throw new Error('No se encontrÃ³ la comunicaciÃ³n programada.')
    const timestamp = this.#now().toISOString()
    const next: ScheduledCommunication = {
      ...current,
      status,
      openedAt: status === 'ABIERTO' ? timestamp : current.openedAt,
      sentAt: status === 'ENVIADO' ? timestamp : current.sentAt,
      cancelledAt: status === 'CANCELADO' ? timestamp : current.cancelledAt,
    }
    this.#communications.set(communicationUuid, next)
    return { ...next }
  }

  private async createMeetingCommunication(
    meeting: CompanyMeeting,
    channel: 'EMAIL' | 'WHATSAPP',
    recipient: string,
    message: string,
    scheduledAt: string,
    recipientName?: string,
  ): Promise<void> {
    const communicationUuid = this.#createUuid()
    this.#communications.set(communicationUuid, {
      communicationUuid,
      entityTable: 'Reuniones',
      entityUuid: meeting.meetingUuid,
      entityTitle: 'Reunión · ' + meeting.title,
      channel,
      recipient,
      ...(recipientName ? { recipientName } : {}),
      subject: channel === 'EMAIL' ? 'Invitación a reunión · ' + meeting.title : '',
      message,
      scheduledAt,
      status: 'PROGRAMADO',
      createdAt: scheduledAt,
      openedAt: '',
      sentAt: '',
      cancelledAt: '',
    })
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

  async getMedia(table: string, value: string): Promise<string | undefined> {
    this.#assertTable(table)
    return value.startsWith('data:image/') || value.startsWith('https://')
      ? value
      : undefined
  }

  async create(input: CreateRowInput): Promise<RowData> {
    this.#assertTable(input.table)
    const rowUuid =
      typeof input.values._uuid === 'string' ? input.values._uuid : this.#createUuid()

    if (this.#tables.get(input.table)?.has(rowUuid)) {
      throw new Error('Ya existe una fila con el identificador ' + rowUuid + '.')
    }

    const submitted = copyRow(input.values)
    const now = this.#now()
    if (input.table === 'ALMACEN') submitted['No. Item'] = this.#nextWarehouseItem()
    if (input.table === 'Gestion Clientes') {
      submitted.Comentarios = appendCrmCommentHistory(
        '',
        submitted.Comentarios,
        now,
        mockUser.email,
      )
    }
    const row = this.#applyFormulas(input.table, {
      ...submitted,
      _uuid: rowUuid,
      _updatedAt: now.toISOString(),
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

    const changes = copyRow(input.changes)
    const now = this.#now()
    if (input.table === 'Gestion Clientes') {
      changes.Comentarios = appendCrmCommentHistory(
        current.Comentarios,
        changes.Comentarios,
        now,
        mockUser.email,
      )
    }
    const row = this.#applyFormulas(input.table, {
      ...current,
      ...changes,
      _uuid: input.rowUuid,
      _updatedAt: now.toISOString(),
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

  #nextWarehouseItem(): number {
    return [...(this.#tables.get('ALMACEN')?.values() ?? [])].reduce((maximum, row) => {
      const value = Number(row['No. Item'])
      return Number.isFinite(value) ? Math.max(maximum, Math.floor(value)) : maximum
    }, 0) + 1
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

function meetingInvitationText(meeting: CompanyMeeting): string {
  return [
    'Reunión TRAIOT: ' + meeting.title,
    'Inicio: ' + meeting.startAt,
    'Google Meet: ' + meeting.meetUrl,
    meeting.description,
  ].filter(Boolean).join('\n\n')
}
