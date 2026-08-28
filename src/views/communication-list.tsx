import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Check, Mail, X } from 'lucide-react'

import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { useRepository } from '@/data/use-repository'
import type { ScheduledCommunication } from '@/data/repository'
import { emailHref, whatsappHref } from '@/views/communication-utils'

interface CommunicationListProps {
  readonly communications: readonly ScheduledCommunication[]
  readonly compact?: boolean
  readonly emptyText?: string
  readonly referenceTime?: number
}

export function CommunicationList({ communications, compact = false, emptyText = 'No hay comunicaciones programadas.', referenceTime = 0 }: CommunicationListProps) {
  if (communications.length === 0) {
    return <p className="rounded-2xl border border-dashed border-black/10 bg-black/[0.015] p-5 text-sm font-semibold text-ink-800/45">{emptyText}</p>
  }

  return (
    <div className="grid gap-3">
      {communications.map((communication) => (
        <CommunicationItem communication={communication} compact={compact} key={communication.communicationUuid} referenceTime={referenceTime} />
      ))}
    </div>
  )
}

function CommunicationItem({ communication, compact, referenceTime }: {
  readonly communication: ScheduledCommunication
  readonly compact: boolean
  readonly referenceTime: number
}) {
  const repository = useRepository()
  const queryClient = useQueryClient()
  const updateStatus = useMutation({
    mutationFn: (status: 'ABIERTO' | 'ENVIADO' | 'CANCELADO') =>
      repository.updateCommunicationStatus(communication.communicationUuid, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['communications'] })
    },
  })
  const isClosed = communication.status === 'ENVIADO' || communication.status === 'CANCELADO'
  const due = new Date(communication.scheduledAt).getTime() <= referenceTime
  const href = communication.channel === 'WHATSAPP'
    ? whatsappHref(communication.recipient, communication.message)
    : emailHref(communication.recipient, {
      subject: communication.subject,
      body: communication.message,
    })
  const ChannelIcon = communication.channel === 'WHATSAPP' ? WhatsAppIcon : Mail
  const hasWhatsAppName = communication.channel === 'WHATSAPP' && Boolean(communication.recipientName)
  const displayTitle = hasWhatsAppName
    ? communication.recipientName
    : communication.entityTitle || communication.recipient

  return (
    <article className={compact ? 'rounded-2xl border border-black/5 bg-white p-4' : 'rounded-3xl border border-black/5 bg-white p-5 shadow-sm'}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={communication.channel === 'WHATSAPP'
              ? 'grid size-9 place-items-center rounded-xl bg-emerald-50 text-[#128c4a]'
              : 'grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600'}>
              <ChannelIcon className="size-5" />
            </span>
            <span className="text-sm font-black text-ink-950">{displayTitle}</span>
            <StatusBadge due={due} status={communication.status} />
          </div>
          {hasWhatsAppName && communication.entityTitle && (
            <p className="mt-1 truncate text-xs font-bold text-ink-800/65">{communication.entityTitle}</p>
          )}
          <p className="mt-2 truncate text-xs font-bold text-ink-800/55">{communication.recipient}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-ink-800/55">
            <CalendarClock className="size-3.5" /> {formatScheduledAt(communication.scheduledAt)}
          </p>
          {!compact && <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-ink-800/70">{communication.message}</p>}
        </div>
        {!isClosed && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {href && (
              <a
                className={communication.channel === 'WHATSAPP'
                  ? 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#128c4a] px-4 text-xs font-black text-white transition hover:bg-[#0f773f]'
                  : 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-500 px-4 text-xs font-black text-[#191919] transition hover:bg-brand-400'}
                href={href}
                onClick={() => updateStatus.mutate('ABIERTO')}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ChannelIcon className="size-4" /> {communication.channel === 'WHATSAPP' ? 'ABRIR WHATSAPP' : 'ABRIR CORREO'}
              </a>
            )}
            <button
              aria-label="Confirmar que la comunicación ya fue enviada"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 px-3 text-xs font-black text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate('ENVIADO')}
              type="button"
            >
              <Check className="size-4" /> CONFIRMAR ENVÍO
            </button>
            <button
              aria-label="Cancelar comunicación"
              className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50 disabled:opacity-50"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate('CANCELADO')}
              title="Cancelar programación"
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>
      {updateStatus.isError && <p className="mt-3 text-xs font-bold text-red-700">No fue posible actualizar la comunicación.</p>}
    </article>
  )
}

function StatusBadge({ due, status }: { readonly due: boolean; readonly status: ScheduledCommunication['status'] }) {
  const styles = status === 'ENVIADO'
    ? 'bg-emerald-100 text-emerald-800'
    : status === 'CANCELADO'
      ? 'bg-red-100 text-red-700'
      : due
        ? 'bg-amber-100 text-amber-800'
        : 'bg-sky-100 text-sky-800'
  const label = status === 'PROGRAMADO' && due ? 'PENDIENTE' : status
  return <span className={'rounded-full px-2.5 py-1 text-[9px] font-black ' + styles}>{label}</span>
}

function formatScheduledAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
