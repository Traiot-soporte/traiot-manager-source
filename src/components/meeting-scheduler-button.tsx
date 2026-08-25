import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, CheckCircle2, ExternalLink, Users, Video, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'

import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { useRepository } from '@/data/use-repository'
import type { CreateCompanyMeetingResult } from '@/data/repository'
import { normalizeWhatsAppPhone } from '@/views/communication-utils'

export function MeetingSchedulerButton() {
  const repository = useRepository()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [meetUrl, setMeetUrl] = useState('')
  const [startAt, setStartAt] = useState(() => defaultMeetingTimes().startAt)
  const [endAt, setEndAt] = useState(() => defaultMeetingTimes().endAt)
  const [selected, setSelected] = useState<ReadonlySet<string>>()
  const [whatsappText, setWhatsappText] = useState('')
  const [created, setCreated] = useState<CreateCompanyMeetingResult>()
  const participants = useQuery({
    queryKey: ['meeting-participants'],
    queryFn: () => repository.listMeetingParticipants(),
    enabled: open,
    staleTime: 60_000,
  })
  const selectedParticipants = useMemo(
    () => selected ?? new Set((participants.data ?? []).map((participant) => participant.userUuid)),
    [participants.data, selected],
  )
  const whatsapp = useMemo(() => parseWhatsAppRecipients(whatsappText), [whatsappText])
  const validMeetUrl = /^https:\/\/meet\.google\.com\/[a-z0-9-]+(?:\?.*)?$/i.test(meetUrl.trim())
  const validDates = Boolean(startAt && endAt && new Date(endAt).getTime() > new Date(startAt).getTime())
  const create = useMutation({
    mutationFn: () => repository.createCompanyMeeting({
      title: title.trim(),
      description: description.trim(),
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      meetUrl: meetUrl.trim(),
      participantUuids: [...selectedParticipants],
      whatsappRecipients: whatsapp.valid,
    }),
    onSuccess: async (result) => {
      setCreated(result)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['communications'] }),
        queryClient.invalidateQueries({ queryKey: ['company-meetings'] }),
      ])
    },
  })

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const openForm = () => {
    const defaults = defaultMeetingTimes()
    setTitle('')
    setDescription('')
    setMeetUrl('')
    setStartAt(defaults.startAt)
    setEndAt(defaults.endAt)
    setWhatsappText('')
    setSelected(undefined)
    setCreated(undefined)
    create.reset()
    setOpen(true)
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (title.trim() && validMeetUrl && validDates && selectedParticipants.size > 0 && whatsapp.invalid.length === 0) {
      create.mutate()
    }
  }

  return <>
    <button
      aria-label="Programar reunión empresarial"
      className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 text-brand-700 transition hover:border-brand-400 hover:bg-brand-100"
      onClick={openForm}
      title="Programar reunión empresarial"
      type="button"
    >
      <Video className="size-4" />
      <span className="hidden text-[10px] font-black sm:inline">REUNIÓN</span>
    </button>
    {open && createPortal(
      <div
        aria-label="Programar reunión empresarial"
        aria-modal="true"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6"
        onClick={() => setOpen(false)}
        role="dialog"
      >
        <section className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-[#f7f3f1] shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-black/5 bg-ink-950 p-5 text-white sm:p-6">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-500 text-[#191919]"><Video className="size-6" /></span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-300">Calendario empresarial</p>
                <h2 className="mt-1 text-2xl font-black">Programar reunión</h2>
                <p className="mt-1 text-xs font-semibold text-white/55">Invita a los colaboradores activos por correo y prepara recordatorios de WhatsApp.</p>
              </div>
            </div>
            <button aria-label="Cerrar" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-white/10 text-white/65 hover:bg-white/10" onClick={() => setOpen(false)} type="button"><X className="size-5" /></button>
          </header>

          {created ? (
            <MeetingCreated result={created} onClose={() => setOpen(false)} />
          ) : (
            <form className="space-y-5 p-4 sm:p-6" onSubmit={submit}>
              <section className="grid gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-2">
                <label className="text-xs font-black text-ink-950 lg:col-span-2">TÍTULO DE LA REUNIÓN
                  <input className="mt-2 min-h-12 w-full rounded-xl border border-black/10 px-4 text-sm font-bold outline-none focus:border-brand-500" maxLength={160} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Revisión semanal de operación" required value={title} />
                </label>
                <label className="text-xs font-black text-ink-950">INICIO
                  <input className="mt-2 min-h-12 w-full rounded-xl border border-black/10 px-4 text-sm font-bold outline-none focus:border-brand-500" min={minimumLocalDateTime()} onChange={(event) => setStartAt(event.target.value)} required type="datetime-local" value={startAt} />
                </label>
                <label className="text-xs font-black text-ink-950">TÉRMINO
                  <input aria-invalid={!validDates} className="mt-2 min-h-12 w-full rounded-xl border border-black/10 px-4 text-sm font-bold outline-none focus:border-brand-500 aria-invalid:border-red-300" min={startAt} onChange={(event) => setEndAt(event.target.value)} required type="datetime-local" value={endAt} />
                  {!validDates && <span className="mt-1 block text-[11px] font-bold text-red-600">El término debe ser posterior al inicio.</span>}
                </label>
                <label className="text-xs font-black text-ink-950 lg:col-span-2">ENLACE DE GOOGLE MEET
                  <span className="relative mt-2 block">
                    <Video className="pointer-events-none absolute left-4 top-4 size-4 text-ink-800/35" />
                    <input aria-invalid={Boolean(meetUrl) && !validMeetUrl} className="min-h-12 w-full rounded-xl border border-black/10 py-3 pl-11 pr-4 text-sm font-bold outline-none focus:border-brand-500 aria-invalid:border-red-300" onChange={(event) => setMeetUrl(event.target.value)} placeholder="https://meet.google.com/xxx-xxxx-xxx" required type="url" value={meetUrl} />
                  </span>
                  {meetUrl && !validMeetUrl && <span className="mt-1 block text-[11px] font-bold text-red-600">Utiliza un enlace válido de meet.google.com.</span>}
                </label>
                <label className="text-xs font-black text-ink-950 lg:col-span-2">AGENDA O MENSAJE
                  <textarea className="mt-2 min-h-28 w-full resize-y rounded-xl border border-black/10 p-4 text-sm font-medium outline-none focus:border-brand-500" maxLength={3000} onChange={(event) => setDescription(event.target.value)} placeholder="Temas que se revisarán durante la reunión…" value={description} />
                </label>
              </section>

              <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-black text-ink-950"><Users className="size-4 text-brand-600" /> COLABORADORES</p>
                    <p className="mt-1 text-xs font-semibold text-ink-800/50">Todos los usuarios activos quedan seleccionados inicialmente.</p>
                  </div>
                  {participants.data && <button className="min-h-10 rounded-xl border border-black/10 px-3 text-[10px] font-black text-ink-800/65 hover:bg-brand-50" onClick={() => setSelected(selectedParticipants.size === participants.data.length ? new Set() : new Set(participants.data.map((participant) => participant.userUuid)))} type="button">{selectedParticipants.size === participants.data.length ? 'QUITAR TODOS' : 'SELECCIONAR TODOS'}</button>}
                </div>
                {participants.isPending && <p className="mt-4 text-sm font-semibold text-ink-800/45">Consultando colaboradores…</p>}
                {participants.isError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">No fue posible consultar los usuarios activos.</p>}
                {participants.data && <div className="mt-4 grid gap-2 md:grid-cols-2">{participants.data.map((participant) => (
                  <label className="flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-black/5 bg-[#faf8f7] p-3 hover:border-brand-200" key={participant.userUuid}>
                    <input checked={selectedParticipants.has(participant.userUuid)} className="size-4 accent-[#e77c60]" onChange={() => setSelected((current) => toggleSetValue(current ?? selectedParticipants, participant.userUuid))} type="checkbox" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-black text-ink-950">{participant.name}</span>
                      <span className="block truncate text-[11px] font-semibold text-ink-800/45">{participant.email} · {participant.role}</span>
                    </span>
                  </label>
                ))}</div>}
                {participants.data && selectedParticipants.size === 0 && <p className="mt-3 text-xs font-bold text-red-600">Selecciona al menos un colaborador.</p>}
              </section>

              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:p-5">
                <p className="flex items-center gap-2 text-sm font-black text-ink-950"><WhatsAppIcon className="size-5 text-[#128c4a]" /> WHATSAPP OPCIONAL</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-ink-800/55">La hoja Usuarios todavía no contiene teléfonos. Pega aquí los números que recibirán el mismo enlace, separados por coma o por renglón.</p>
                <textarea className="mt-3 min-h-20 w-full resize-y rounded-xl border border-emerald-200 bg-white p-4 text-sm font-bold outline-none focus:border-[#128c4a]" onChange={(event) => setWhatsappText(event.target.value)} placeholder="Ej. 81 1234 5678, 55 9876 5432" value={whatsappText} />
                {whatsapp.valid.length > 0 && <p className="mt-2 text-[11px] font-black text-emerald-700">{whatsapp.valid.length} recordatorio{whatsapp.valid.length === 1 ? '' : 's'} de WhatsApp</p>}
                {whatsapp.invalid.length > 0 && <p className="mt-2 text-[11px] font-bold text-red-600">Revisa: {whatsapp.invalid.join(', ')}</p>}
              </section>

              <div className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-2xl text-xs font-semibold leading-relaxed text-ink-800/50">Se guardará en el calendario empresarial. La campana mostrará una tarea pendiente por cada correo y WhatsApp hasta que confirmes su envío.</p>
                <button className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-ink-950 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45" disabled={create.isPending || !title.trim() || !validMeetUrl || !validDates || selectedParticipants.size === 0 || whatsapp.invalid.length > 0} type="submit"><CalendarClock className="size-4" />{create.isPending ? 'PROGRAMANDO…' : 'CREAR REUNIÓN'}</button>
              </div>
              {create.isError && <p className="rounded-xl bg-red-50 p-4 text-xs font-bold text-red-700">{create.error instanceof Error ? create.error.message : 'No fue posible crear la reunión.'}</p>}
            </form>
          )}
        </section>
      </div>,
      document.body,
    )}
  </>
}

function MeetingCreated({ onClose, result }: { readonly onClose: () => void; readonly result: CreateCompanyMeetingResult }) {
  return <div className="p-6 sm:p-8">
    <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-8" /></span>
    <h3 className="mt-4 text-center text-2xl font-black text-ink-950">Reunión programada</h3>
    <p className="mx-auto mt-2 max-w-xl text-center text-sm font-semibold text-ink-800/55">Se agregó al calendario empresarial y se prepararon {result.emailInvitations} correos y {result.whatsappInvitations} WhatsApp.</p>
    <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-black/5 bg-white p-5">
      <p className="font-black text-ink-950">{result.meeting.title}</p>
      <p className="mt-2 text-xs font-semibold text-ink-800/55">{formatMeetingDate(result.meeting.startAt)} · {result.meeting.participants.length} colaboradores</p>
      <a className="mt-3 inline-flex items-center gap-2 text-xs font-black text-brand-600 hover:underline" href={result.meeting.meetUrl} rel="noopener noreferrer" target="_blank">ABRIR GOOGLE MEET <ExternalLink className="size-3.5" /></a>
    </div>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <button className="min-h-11 rounded-xl border border-black/10 bg-white px-5 text-sm font-black text-ink-950" onClick={onClose} type="button">CERRAR</button>
      <Link className="inline-flex min-h-11 items-center rounded-xl bg-ink-950 px-5 text-sm font-black text-white" onClick={onClose} to="/comunicaciones">VER ENVÍOS PENDIENTES</Link>
    </div>
  </div>
}

function toggleSetValue(current: ReadonlySet<string>, value: string): ReadonlySet<string> {
  const next = new Set(current)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

function parseWhatsAppRecipients(value: string): { readonly valid: readonly string[]; readonly invalid: readonly string[] } {
  const entries = [...new Set(value.split(/[\n,;]+/).map((entry) => entry.trim()).filter(Boolean))]
  const valid: string[] = []
  const invalid: string[] = []
  for (const entry of entries) {
    const normalized = normalizeWhatsAppPhone(entry)
    if (normalized) valid.push(normalized)
    else invalid.push(entry)
  }
  return { valid, invalid }
}

function localDateTime(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function defaultMeetingTimes(): { readonly startAt: string; readonly endAt: string } {
  const start = new Date(Date.now() + 60 * 60_000)
  start.setMinutes(0, 0, 0)
  const end = new Date(start.getTime() + 60 * 60_000)
  return { startAt: localDateTime(start), endAt: localDateTime(end) }
}

function minimumLocalDateTime(): string {
  return localDateTime(new Date())
}

function formatMeetingDate(value: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(new Date(value))
}
