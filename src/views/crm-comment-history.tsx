import { Clock3, MessageSquareText } from 'lucide-react'

import { parseCrmCommentHistory } from '@/lib/crm-comments'

interface CrmCommentHistoryProps {
  readonly emptyText?: string
  readonly value: unknown
}

export function CrmCommentHistory({ emptyText = 'Aún no hay comentarios.', value }: CrmCommentHistoryProps) {
  const entries = parseCrmCommentHistory(value)

  if (entries.length === 0) {
    return <p className="rounded-2xl border border-dashed border-black/10 bg-white/45 p-4 text-sm font-semibold text-ink-800/45">{emptyText}</p>
  }

  return (
    <ol className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
      {entries.map((entry, index) => (
        <li
          className="rounded-2xl border border-black/5 bg-ink-950/[0.025] p-4"
          key={`${entry.timestamp ?? 'legacy'}-${index}`}
        >
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-black uppercase tracking-wide text-ink-800/45">
            {entry.timestamp ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-3.5" /> {entry.timestamp}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <MessageSquareText className="size-3.5" /> Comentario anterior
              </span>
            )}
            {entry.author && <span>Por {entry.author}</span>}
          </div>
          <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-ink-800">
            {entry.body}
          </p>
        </li>
      ))}
    </ol>
  )
}
