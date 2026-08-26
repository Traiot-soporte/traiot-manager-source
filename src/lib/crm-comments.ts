const crmTimeZone = 'America/Mexico_City'

export interface CrmCommentEntry {
  readonly author?: string
  readonly body: string
  readonly timestamp?: string
}

function cleanComment(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim()
  return ''
}

export function formatCrmCommentTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    timeZone: crmTimeZone,
    year: 'numeric',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ''

  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`
}

export function appendCrmCommentHistory(
  previousValue: unknown,
  submittedValue: unknown,
  date: Date,
  author: string,
): string {
  const previous = cleanComment(previousValue)
  let submitted = cleanComment(submittedValue)

  if (!submitted || submitted === previous) return previous

  // Compatibilidad con formularios anteriores que enviaban el historial completo.
  if (previous && submitted.startsWith(previous)) {
    submitted = submitted.slice(previous.length).trim()
  }
  if (!submitted) return previous

  const entry = `[${formatCrmCommentTimestamp(date)} · ${cleanComment(author) || 'Sistema'}]\n${submitted}`
  return previous ? `${previous}\n\n${entry}` : entry
}

export function parseCrmCommentHistory(value: unknown): readonly CrmCommentEntry[] {
  const history = cleanComment(value)
  if (!history) return []

  return history
    .split(/\n{2,}(?=\[\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} · )/u)
    .map((block) => {
      const match = block.match(/^\[(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}) · ([^\]]+)\]\n([\s\S]*)$/u)
      if (!match) return { body: block }
      return {
        timestamp: match[1] ?? '',
        author: match[2] ?? '',
        body: match[3]?.trim() ?? '',
      }
    })
    .filter((entry) => entry.body)
}
