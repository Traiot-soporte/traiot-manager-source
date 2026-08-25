import type { ScheduledCommunication } from '@/data/repository'

export interface CommunicationReminderSummary {
  readonly pending: readonly ScheduledCommunication[]
  readonly preview: readonly ScheduledCommunication[]
  readonly due: number
}

export function getCommunicationReminderSummary(
  communications: readonly ScheduledCommunication[],
  referenceTime: number,
  previewLimit = 4,
): CommunicationReminderSummary {
  const pending = communications
    .filter((item) => item.status === 'PROGRAMADO' || item.status === 'ABIERTO')
    .sort((left, right) => scheduledTime(left) - scheduledTime(right))

  return {
    pending,
    preview: pending.slice(0, previewLimit),
    due: pending.filter((item) => scheduledTime(item) <= referenceTime).length,
  }
}

function scheduledTime(communication: ScheduledCommunication): number {
  const time = new Date(communication.scheduledAt).getTime()
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER
}
