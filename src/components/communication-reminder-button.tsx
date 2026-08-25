import { useQuery } from '@tanstack/react-query'
import { BellRing, CalendarClock, ChevronRight, Mail } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'

import { getCommunicationReminderSummary } from '@/components/communication-reminder'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import type { ScheduledCommunication } from '@/data/repository'
import { useRepository } from '@/data/use-repository'

export function CommunicationReminderButton() {
  const repository = useRepository()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ right: 16, top: 72 })
  const [initialReferenceTime] = useState(() => Date.now())
  const communications = useQuery({
    queryKey: ['communications'],
    queryFn: () => repository.listCommunications(),
    refetchInterval: 60_000,
    staleTime: 0,
  })
  const referenceTime = communications.dataUpdatedAt || initialReferenceTime
  const summary = getCommunicationReminderSummary(communications.data ?? [], referenceTime)
  const pending = summary.pending.length

  useEffect(() => {
    if (!open) return

    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const closeOnResize = () => setOpen(false)

    document.addEventListener('pointerdown', closeOutside)
    window.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', closeOnResize)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', closeOnResize)
    }
  }, [open])

  const toggle = () => {
    if (!open && buttonRef.current) {
      const bounds = buttonRef.current.getBoundingClientRect()
      setPosition({
        right: Math.max(12, window.innerWidth - bounds.right),
        top: bounds.bottom + 10,
      })
    }
    setOpen((current) => !current)
  }

  return (
    <>
      <button
        aria-controls="communication-reminder-panel"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={pending ? `${pending} comunicaciones pendientes de enviar` : 'Consultar comunicaciones'}
        className={pending
          ? 'relative grid min-h-11 min-w-11 place-items-center rounded-full border border-amber-300 bg-amber-100 text-amber-800 transition hover:bg-amber-200'
          : 'relative grid min-h-11 min-w-11 place-items-center rounded-full border border-black/10 bg-white text-ink-800/55 transition hover:border-brand-300 hover:text-brand-600'}
        onClick={toggle}
        ref={buttonRef}
        title={pending ? `${pending} pendientes de enviar` : 'Comunicaciones'}
        type="button"
      >
        <BellRing className="size-4" />
        {pending > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[9px] font-black text-white">{pending > 99 ? '99+' : pending}</span>}
      </button>

      {open && createPortal(
        <div
          aria-label="Resumen de comunicaciones pendientes"
          className="fixed z-[100] w-[min(25rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl shadow-black/20"
          id="communication-reminder-panel"
          ref={panelRef}
          role="dialog"
          style={{ right: position.right, top: position.top }}
        >
          <header className="flex items-start justify-between gap-4 bg-ink-950 px-4 py-3.5 text-white">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-300">Comunicaciones</p>
              <h2 className="mt-1 text-base font-black">{pending ? `${pending} pendientes de enviar` : 'Todo está al día'}</h2>
            </div>
            {summary.due > 0 && (
              <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[9px] font-black text-amber-950">
                {summary.due} POR ATENDER
              </span>
            )}
          </header>

          <div className="max-h-[22rem] overflow-y-auto p-3">
            {communications.isPending && <ReminderStatus text="Consultando pendientes…" />}
            {communications.isError && <ReminderStatus error text="No fue posible consultar las comunicaciones." />}
            {!communications.isPending && !communications.isError && summary.preview.length === 0 && (
              <ReminderStatus text="No tienes mensajes pendientes. Desde el módulo de Comunicaciones puedes consultar el historial completo." />
            )}
            {summary.preview.map((communication) => (
              <ReminderItem
                communication={communication}
                key={communication.communicationUuid}
                referenceTime={referenceTime}
              />
            ))}
            {pending > summary.preview.length && (
              <p className="px-2 py-2 text-center text-[11px] font-bold text-ink-800/45">
                Y {pending - summary.preview.length} comunicaciones pendientes más.
              </p>
            )}
          </div>

          <footer className="border-t border-black/5 bg-brand-50 p-3">
            <Link
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-xs font-black text-[#191919] transition hover:bg-brand-400"
              onClick={() => setOpen(false)}
              to="/comunicaciones"
            >
              IR AL MÓDULO DE COMUNICACIONES <ChevronRight className="size-4" />
            </Link>
            <p className="mt-2 text-center text-[10px] font-semibold text-ink-800/45">
              Ahí podrás abrir, confirmar, cancelar y revisar todo el historial.
            </p>
          </footer>
        </div>,
        document.body,
      )}
    </>
  )
}

function ReminderItem({ communication, referenceTime }: {
  readonly communication: ScheduledCommunication
  readonly referenceTime: number
}) {
  const due = new Date(communication.scheduledAt).getTime() <= referenceTime
  const ChannelIcon = communication.channel === 'WHATSAPP' ? WhatsAppIcon : Mail

  return (
    <article className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-brand-50">
      <span className={communication.channel === 'WHATSAPP'
        ? 'grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#128c4a]'
        : 'grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600'}>
        <ChannelIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-xs font-black text-ink-950">{communication.entityTitle || communication.recipient}</p>
          <span className={due
            ? 'shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-black text-amber-800'
            : 'shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[8px] font-black text-sky-800'}>
            {due ? 'PENDIENTE' : 'PROGRAMADO'}
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1 truncate text-[10px] font-semibold text-ink-800/50">
          <CalendarClock className="size-3" /> {formatScheduledAt(communication.scheduledAt)}
        </p>
      </div>
    </article>
  )
}

function ReminderStatus({ error = false, text }: { readonly error?: boolean; readonly text: string }) {
  return (
    <p className={error
      ? 'rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700'
      : 'rounded-xl bg-brand-50 p-3 text-xs font-semibold leading-relaxed text-ink-800/55'}>
      {text}
    </p>
  )
}

function formatScheduledAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
