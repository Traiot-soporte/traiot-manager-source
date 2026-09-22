import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

import { describe, expect, it } from 'vitest'
import type { ScheduledCommunication } from '@/data/repository'

interface CommunicationSandbox {
  readonly normalizeCommunicationChannel_: (value: unknown) => string
  readonly isValidCommunicationRecipient_: (channel: string, recipient: string) => boolean
  readonly isCommunicationOwnedBy_: (
    record: Readonly<Record<string, unknown>>,
    user: Readonly<Record<string, unknown>>,
  ) => boolean
  readonly serializeCommunicationRecord_: (
    record: Readonly<Record<string, unknown>>,
  ) => Readonly<Record<string, unknown>>
}

function loadSandbox(overrides: Record<string, unknown> = {}): CommunicationSandbox {
  const stringify = (value: unknown) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    return JSON.stringify(value)
  }
  const sandbox = createContext({
    normalizeCell_: (value: unknown) => stringify(value).trim(),
    normalizeLookupValue_: (value: unknown) => stringify(value).trim().toUpperCase(),
    normalizeApiEmail_: (value: unknown) => stringify(value).trim().toLowerCase(),
    ...overrides,
  })
  runInContext(readFileSync('apps-script/86_Communications.gs', 'utf8'), sandbox)
  return sandbox as CommunicationSandbox
}

describe('agenda privada de comunicaciones', () => {
  it('normaliza canales y valida destinatarios', () => {
    const api = loadSandbox()
    expect(api.normalizeCommunicationChannel_('correo')).toBe('EMAIL')
    expect(api.normalizeCommunicationChannel_('WhatsApp')).toBe('WHATSAPP')
    expect(api.normalizeCommunicationChannel_('llamada')).toBe('LLAMADA')
    expect(api.normalizeCommunicationChannel_('visita')).toBe('VISITA')
    expect(api.isValidCommunicationRecipient_('LLAMADA', '+52 (81) 1234-5678')).toBe(true)
    expect(api.isValidCommunicationRecipient_('LLAMADA', 'abc8112345678')).toBe(false)
    expect(api.isValidCommunicationRecipient_('VISITA', 'Reforma 10, CDMX')).toBe(true)
    expect(api.isValidCommunicationRecipient_('VISITA', 'https://maps.app.goo.gl/abc123')).toBe(true)
    for (const invalid of ['', 'javascript:alert(1)', 'data:text/html,test', '//evil.test', 'https://', 'https://user:pass@example.com', 'á'.repeat(1000)]) {
      expect(api.isValidCommunicationRecipient_('VISITA', invalid)).toBe(false)
    }
    expect(api.isValidCommunicationRecipient_('INVALID', '8112345678')).toBe(false)
    expect(api.isValidCommunicationRecipient_('EMAIL', 'ventas@traiot.com.mx')).toBe(true)
    expect(api.isValidCommunicationRecipient_('EMAIL', 'ventas@traiot.com.mx, soporte@traiot.com.mx')).toBe(true)
    expect(api.isValidCommunicationRecipient_('WHATSAPP', '+52 81 1234 5678')).toBe(true)
    expect(api.isValidCommunicationRecipient_('WHATSAPP', '123')).toBe(false)
  })

  it('guarda llamadas y visitas, confirma realización y conserva cancelación sin perder la programación', () => {
    const rows: unknown[][] = []
    const sheet = {
      getDataRange: () => ({ getValues: () => rows }),
      appendRow: (row: unknown[]) => rows.push(row),
      getRange: (row: number, column: number) => ({
        setValue: (value: unknown) => { const target = rows[row - 1]; if (target) target[column - 1] = value },
        getValues: () => [rows[row - 1]],
      }),
    }
    const user = { userUuid: 'owner', email: 'owner@example.com', name: 'Responsable' }
    let sequence = 0
    const api = loadSandbox({
      isUuid_: () => true,
      requireApiTable_: () => ({}),
      assertApiTableAccess_: () => undefined,
      canApiRoleAccessSection_: () => true,
      getApiRow_: () => ({}),
      runIdempotentApiMutation_: (_id: string, operation: () => unknown) => operation(),
      openConfiguredSpreadsheet_: () => ({}),
      Utilities: { getUuid: () => `task-${++sequence}` },
      SpreadsheetApp: { flush: () => undefined },
    }) as CommunicationSandbox & {
      TRAIOT_COMMUNICATION_HEADERS: string[]
      ensureCommunicationsSheet_: () => typeof sheet
      createScheduledCommunication_: (user: object, input: object) => ScheduledCommunication
      updateScheduledCommunicationStatus_: (user: object, uuid: string, status: string, reason?: string) => ScheduledCommunication
    }
    api.ensureCommunicationsSheet_ = () => sheet
    rows.push([...api.TRAIOT_COMMUNICATION_HEADERS])
    for (const channel of ['LLAMADA', 'VISITA']) {
      const task = api.createScheduledCommunication_(user, {
        entityTable: 'CLIENTES', entityUuid: 'client', entityTitle: 'Empresa',
        channel, recipient: channel === 'LLAMADA' ? '8112345678' : 'Reforma 10, CDMX',
        recipientName: 'Contacto', message: 'Revisar propuesta', scheduledAt: '2026-09-25T18:00:00.000Z',
      })
      expect(task).toMatchObject({ channel, status: 'PROGRAMADO', recipientName: 'Contacto', message: 'Revisar propuesta' })
      expect(() => api.updateScheduledCommunicationStatus_({ userUuid: 'other' }, task.communicationUuid, 'REALIZADO')).toThrow(/otra cuenta/)
      expect(() => api.updateScheduledCommunicationStatus_(user, task.communicationUuid, 'ENVIADO')).toThrow(/tipo de actividad/)
      const opened = api.updateScheduledCommunicationStatus_(user, task.communicationUuid, 'ABIERTO')
      expect(opened.status).toBe('ABIERTO')
      expect(opened.completedAt).toBe('')
      if (channel === 'LLAMADA') {
        const completed = api.updateScheduledCommunicationStatus_(user, task.communicationUuid, 'REALIZADO')
        expect(completed.status).toBe('REALIZADO')
        expect(completed.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
        expect(completed.sentAt).toBe('')
        expect(() => api.updateScheduledCommunicationStatus_(user, task.communicationUuid, 'ABIERTO')).toThrow(/cerrada/)
      } else {
        expect(() => api.updateScheduledCommunicationStatus_(user, task.communicationUuid, 'CANCELADO', '')).toThrow(/motivo/)
        const cancelled = api.updateScheduledCommunicationStatus_(user, task.communicationUuid, 'CANCELADO', 'Cliente solicitó reprogramar')
        expect(cancelled).toMatchObject({ status: 'CANCELADO', cancellationReason: 'Cliente solicitó reprogramar', cancelledByName: 'Responsable', scheduledAt: task.scheduledAt })
      }
    }
    const email = api.createScheduledCommunication_(user, { entityTable: 'CLIENTES', entityUuid: 'client', channel: 'EMAIL', recipient: 'a@example.com', message: 'Hola', scheduledAt: '2026-09-25T18:00:00.000Z' })
    expect(() => api.updateScheduledCommunicationStatus_(user, email.communicationUuid, 'REALIZADO')).toThrow(/tipo de actividad/)
    expect(api.updateScheduledCommunicationStatus_(user, email.communicationUuid, 'ENVIADO').status).toBe('ENVIADO')
  })

  it('solo entrega la agenda a su propietario y omite campos internos', () => {
    const api = loadSandbox()
    const record = {
      CommunicationUuid: '11111111-1111-4111-8111-111111111111',
      EntityTable: 'CLIENTES',
      EntityUuid: '22222222-2222-4222-8222-222222222222',
      EntityTitle: 'Cliente Demo',
      Channel: 'EMAIL',
      Recipient: 'cliente@example.com',
      RecipientName: 'Cliente Demo',
      Subject: 'Seguimiento',
      Message: 'Hola',
      ScheduledAt: '2026-08-24T18:00:00.000Z',
      Status: 'PROGRAMADO',
      CreatedByUuid: '33333333-3333-4333-8333-333333333333',
      CreatedByEmail: 'ventas@traiot.com.mx',
      CreatedAt: '2026-08-24T17:00:00.000Z',
      CompletedAt: '2026-08-24T18:20:00.000Z',
      CancelledAt: '2026-08-24T18:30:00.000Z',
      CancellationReason: 'El cliente solicitó reprogramar la llamada.',
      CancelledByUuid: '33333333-3333-4333-8333-333333333333',
      CancelledByEmail: 'ventas@traiot.com.mx',
      CancelledByName: 'Manuel Soto',
    }
    expect(api.isCommunicationOwnedBy_(record, {
      userUuid: '33333333-3333-4333-8333-333333333333',
      email: 'ventas@traiot.com.mx',
    })).toBe(true)
    expect(api.isCommunicationOwnedBy_(record, {
      userUuid: '44444444-4444-4444-8444-444444444444',
      email: 'otra@traiot.com.mx',
    })).toBe(false)
    expect(api.serializeCommunicationRecord_(record)).not.toHaveProperty('CreatedByEmail')
    expect(api.serializeCommunicationRecord_(record)).not.toHaveProperty('CancelledByUuid')
    expect(api.serializeCommunicationRecord_(record)).toMatchObject({
      recipientName: 'Cliente Demo',
      completedAt: '2026-08-24T18:20:00.000Z',
      cancellationReason: 'El cliente solicitó reprogramar la llamada.',
      cancelledByEmail: 'ventas@traiot.com.mx',
      cancelledByName: 'Manuel Soto',
    })
  })
})
