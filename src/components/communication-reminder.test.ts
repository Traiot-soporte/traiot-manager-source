import { describe, expect, it } from 'vitest'

import { getCommunicationReminderSummary } from '@/components/communication-reminder'
import type { ScheduledCommunication } from '@/data/repository'

describe('recordatorio de comunicaciones', () => {
  it('cuenta pendientes, detecta vencidas y muestra primero las más próximas', () => {
    const communications = [
      communication('future', 'PROGRAMADO', '2026-08-26T16:00:00.000Z'),
      communication('sent', 'ENVIADO', '2026-08-20T16:00:00.000Z'),
      communication('due', 'ABIERTO', '2026-08-24T16:00:00.000Z'),
      communication('next', 'PROGRAMADO', '2026-08-25T20:00:00.000Z'),
    ]

    const summary = getCommunicationReminderSummary(
      communications,
      new Date('2026-08-25T18:00:00.000Z').getTime(),
      2,
    )

    expect(summary.pending.map((item) => item.communicationUuid)).toEqual(['due', 'next', 'future'])
    expect(summary.preview.map((item) => item.communicationUuid)).toEqual(['due', 'next'])
    expect(summary.due).toBe(1)
  })
})

function communication(
  communicationUuid: string,
  status: ScheduledCommunication['status'],
  scheduledAt: string,
): ScheduledCommunication {
  return {
    communicationUuid,
    entityTable: 'CLIENTES',
    entityUuid: 'client-1',
    entityTitle: 'Cliente',
    channel: 'EMAIL',
    recipient: 'cliente@example.com',
    subject: 'Seguimiento',
    message: 'Mensaje',
    scheduledAt,
    status,
    createdAt: '',
    openedAt: '',
    sentAt: '',
    cancelledAt: '',
  }
}
