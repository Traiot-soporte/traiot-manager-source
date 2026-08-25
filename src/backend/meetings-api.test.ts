import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

interface MeetingSandbox {
  readonly normalizeMeetingUrl_: (value: unknown) => string
  readonly uniqueMeetingValues_: (values: readonly unknown[]) => readonly string[]
  readonly serializeMeetingRecord_: (record: Readonly<Record<string, unknown>>) => Readonly<Record<string, unknown>>
}

function loadSandbox(): MeetingSandbox {
  const stringify = (value: unknown) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
    return JSON.stringify(value)
  }
  const sandbox = createContext({
    normalizeCell_: (value: unknown) => stringify(value).trim(),
    normalizeApiEmail_: (value: unknown) => stringify(value).trim().toLowerCase(),
  })
  runInContext(readFileSync('apps-script/84_Meetings.gs', 'utf8'), sandbox)
  return sandbox as MeetingSandbox
}

describe('reuniones empresariales', () => {
  it('acepta solamente enlaces de Google Meet y elimina destinatarios repetidos', () => {
    const api = loadSandbox()
    expect(api.normalizeMeetingUrl_('https://meet.google.com/abc-defg-hij')).toBe('https://meet.google.com/abc-defg-hij')
    expect(api.normalizeMeetingUrl_('https://example.com/reunion')).toBe('')
    expect(api.uniqueMeetingValues_([' 81 1234 5678 ', '81 1234 5678', '55 9876 5432']))
      .toEqual(['81 1234 5678', '55 9876 5432'])
  })

  it('serializa participantes sin exponer campos internos de la hoja', () => {
    const api = loadSandbox()
    const meeting = api.serializeMeetingRecord_({
      MeetingUuid: '11111111-1111-4111-8111-111111111111',
      Title: 'Revisión semanal',
      StartAt: '2026-08-25T16:00:00.000Z',
      EndAt: '2026-08-25T17:00:00.000Z',
      MeetUrl: 'https://meet.google.com/abc-defg-hij',
      ParticipantsJson: JSON.stringify([{ userUuid: 'u1', name: 'Manuel', email: 'soporte@traiot.com.mx', role: 'Administrador' }]),
      OrganizerEmail: 'SOPORTE@TRAIOT.COM.MX',
      OrganizerUuid: 'interno',
      Status: 'PROGRAMADA',
    })
    expect(meeting.participants).toHaveLength(1)
    expect(meeting.organizerEmail).toBe('soporte@traiot.com.mx')
    expect(meeting).not.toHaveProperty('OrganizerUuid')
  })
})
