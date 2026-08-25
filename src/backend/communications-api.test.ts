import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

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

function loadSandbox(): CommunicationSandbox {
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
  })
  runInContext(readFileSync('apps-script/86_Communications.gs', 'utf8'), sandbox)
  return sandbox as CommunicationSandbox
}

describe('agenda privada de comunicaciones', () => {
  it('normaliza canales y valida destinatarios', () => {
    const api = loadSandbox()
    expect(api.normalizeCommunicationChannel_('correo')).toBe('EMAIL')
    expect(api.normalizeCommunicationChannel_('WhatsApp')).toBe('WHATSAPP')
    expect(api.isValidCommunicationRecipient_('EMAIL', 'ventas@traiot.com.mx')).toBe(true)
    expect(api.isValidCommunicationRecipient_('WHATSAPP', '+52 81 1234 5678')).toBe(true)
    expect(api.isValidCommunicationRecipient_('WHATSAPP', '123')).toBe(false)
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
      Subject: 'Seguimiento',
      Message: 'Hola',
      ScheduledAt: '2026-08-24T18:00:00.000Z',
      Status: 'PROGRAMADO',
      CreatedByUuid: '33333333-3333-4333-8333-333333333333',
      CreatedByEmail: 'ventas@traiot.com.mx',
      CreatedAt: '2026-08-24T17:00:00.000Z',
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
  })
})
