import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CalendarClock, Check, Mail, UserRound, X } from 'lucide-react'

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
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const updateStatus = useMutation({
    mutationFn: ({ status, reason }: { readonly status: 'ABIERTO' | 'ENVIADO' | 'CANCELADO'; readonly reason?: string }) =>
      repository.updateCommunicationStatus(communication.communicationUuid, status, reason),
    onSuccess: async () => {
      setCancelOpen(false)
      setCancellationReason('')
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
                onClick={() => updateStatus.mutate({ status: 'ABIERTO' })}
                rel="noopener noreferrer"
                target={communication.channel === 'WHATSAPP' ? '_blank' : undefined}
              >
                <ChannelIcon className="size-4" /> {communication.channel === 'WHATSAPP' ? 'ABRIR WHATSAPP' : 'PREPARAR CORREO'}
              </a>
            )}
            <button
              aria-label="Confirmar que la comunicación ya fue enviada"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 px-3 text-xs font-black text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ status: 'ENVIADO' })}
              type="button"
            >
              <Check className="size-4" /> CONFIRMAR ENVÍO
            </button>
            <button
              aria-label="Cancelar comunicación"
              className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50 disabled:opacity-50"
              disabled={updateStatus.isPending}
              onClick={() => {
                updateStatus.reset()
                setCancelOpen(true)
              }}
              title="Cancelar programación"
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>
      {communication.status === 'CANCELADO' && <CancellationAudit communication={communication} />}
      {updateStatus.isError && !cancelOpen && <p className="mt-3 text-xs font-bold text-red-700">No fue posible actualizar la comunicación.</p>}
      {cancelOpen && (
        <div aria-modal="true" className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4 backdrop-blur-sm" role="dialog">
          <div className="w-full max-w-xl rounded-[2rem] border border-black/10 bg-surface p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-700">Auditoría de comunicación</p>
                <h2 className="mt-2 text-2xl font-black text-ink-950">Cancelar comunicación</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-800/60">
                  La programación no se eliminará: permanecerá en el historial junto con el motivo, la fecha y el usuario que la canceló.
                </p>
              </div>
              <button
                aria-label="Cerrar cancelación"
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-white text-ink-800/60 hover:bg-black/5"
                disabled={updateStatus.isPending}
                onClick={() => setCancelOpen(false)}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-xs font-black text-amber-900">
                <AlertTriangle className="size-4" /> PROGRAMADA PARA {formatScheduledAt(communication.scheduledAt).toUpperCase()}
              </p>
              <p className="mt-1 text-sm font-bold text-amber-950/75">{displayTitle}</p>
            </div>

            <label className="mt-6 block text-xs font-black text-ink-950" htmlFor={`cancellation-reason-${communication.communicationUuid}`}>
              MOTIVO DE CANCELACIÓN <span className="text-red-600">*</span>
            </label>
            <textarea
              autoFocus
              className="mt-2 min-h-36 w-full resize-y rounded-2xl border border-black/15 bg-white px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              id={`cancellation-reason-${communication.communicationUuid}`}
              maxLength={1000}
              onChange={(event) => setCancellationReason(event.target.value)}
              placeholder="Explica por qué se canceló esta comunicación..."
              value={cancellationReason}
            />
            <div className="mt-2 flex justify-between text-[11px] font-semibold text-ink-800/45">
              <span>Obligatorio, mínimo 3 caracteres.</span>
              <span>{cancellationReason.length}/1000</span>
            </div>

            {updateStatus.isError && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                No fue posible guardar la cancelación. Intenta nuevamente.
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="min-h-12 rounded-xl border border-black/10 bg-white px-5 text-xs font-black text-ink-800 hover:bg-black/5"
                disabled={updateStatus.isPending}
                onClick={() => setCancelOpen(false)}
                type="button"
              >
                CONSERVAR PROGRAMACIÓN
              </button>
              <button
                className="min-h-12 rounded-xl bg-red-600 px-5 text-xs font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={updateStatus.isPending || cancellationReason.trim().length < 3}
                onClick={() => updateStatus.mutate({ status: 'CANCELADO', reason: cancellationReason.trim() })}
                type="button"
              >
                {updateStatus.isPending ? 'GUARDANDO...' : 'CONFIRMAR CANCELACIÓN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

function CancellationAudit({ communication }: { readonly communication: ScheduledCommunication }) {
  const cancelledBy = communication.cancelledByName || communication.cancelledByEmail || 'Usuario no disponible'
  const legacyReason = 'Motivo no disponible: esta cancelación se registró antes de habilitar la auditoría de motivos.'

  return (
    <details className="mt-4 rounded-2xl border border-red-200 bg-red-50/70" open>
      <summary className="cursor-pointer list-none px-4 py-3 text-xs font-black text-red-800">
        DETALLE DE CANCELACIÓN
      </summary>
      <div className="grid gap-4 border-t border-red-200 px-4 py-4 sm:grid-cols-3">
        <AuditField label="PROGRAMADA PARA" value={formatScheduledAt(communication.scheduledAt)} />
        <AuditField label="CANCELADA EL" value={formatScheduledAt(communication.cancelledAt)} />
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-red-900/50">CANCELADA POR</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-red-950/80">
            <UserRound className="size-4" /> {cancelledBy}
          </p>
          {communication.cancelledByName && communication.cancelledByEmail && (
            <p className="mt-1 text-xs font-semibold text-red-900/55">{communication.cancelledByEmail}</p>
          )}
        </div>
        <div className="sm:col-span-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-red-900/50">MOTIVO</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-red-950/80">
            {communication.cancellationReason || legacyReason}
          </p>
        </div>
      </div>
    </details>
  )
}

function AuditField({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wide text-red-900/50">{label}</p>
      <p className="mt-1 text-sm font-bold text-red-950/80">{value}</p>
    </div>
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
    timeZone: 'America/Mexico_City',
  }).format(date)
}
