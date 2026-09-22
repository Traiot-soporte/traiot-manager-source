import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Mail, MapPin, Phone, Send } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'

import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { useRepository } from '@/data/use-repository'
import type { CommunicationChannel } from '@/data/repository'
import type { RowData } from '@/schema'
import { CommunicationList } from '@/views/communication-list'
import {
  defaultCommunicationMessage,
  defaultCommunicationSubject,
  resolveCommunicationTarget,
} from '@/views/communication-target'
import { callHref, emailHref, visitHref, whatsappHref } from '@/views/communication-utils'
import { getRowTitle } from '@/views/view-utils'
import type { TableDef } from '@/schema'

export function CommunicationPanel({ row, table }: { readonly row: RowData; readonly table: TableDef }) {
  const repository = useRepository()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [initialChannel, setInitialChannel] = useState<CommunicationChannel | undefined>()
  const clients = useQuery({
    queryKey: ['table', 'CLIENTES'],
    queryFn: () => repository.list('CLIENTES'),
    enabled: table.name === 'Gestion Clientes',
  })
  const clientUuid = String(row.cliente_uuid ?? '')
  const client = clients.data?.find((candidate) => String(candidate._uuid ?? '') === clientUuid)
  const target = useMemo(
    () => resolveCommunicationTarget(table.name, row, client),
    [client, row, table.name],
  )
  const communications = useQuery({
    queryKey: ['communications'],
    queryFn: () => repository.listCommunications(),
    refetchInterval: 60_000,
    staleTime: 0,
  })
  const entityUuid = String(row._uuid ?? '')
  const entityCommunications = (communications.data ?? []).filter(
    (item) => item.entityTable === table.name && item.entityUuid === entityUuid,
  )
  const defaultMessage = defaultCommunicationMessage(target)
  const defaultSubject = defaultCommunicationSubject(target)
  const quickEmail = emailHref(target.email, { subject: defaultSubject, body: defaultMessage })
  const quickWhatsApp = whatsappHref(target.phone, defaultMessage)

  return (
    <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600">Comunicación</p>
          <h2 className="mt-1 text-xl font-black text-ink-950">Contactar y programar</h2>
          <p className="mt-1 text-sm font-medium text-ink-800/55">Programa mensajes, llamadas y visitas; confirma el envío o la realización de cada actividad.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickWhatsApp && <a className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#128c4a] px-4 text-sm font-black text-white transition hover:bg-[#0f773f]" href={quickWhatsApp} rel="noopener noreferrer" target="_blank"><WhatsAppIcon className="size-5" /> WHATSAPP</a>}
          {quickEmail && <a className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 text-sm font-black text-brand-700 transition hover:bg-brand-100" href={quickEmail}><Mail className="size-5" /> CORREO</a>}
          <button className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-brand-200 px-4 text-sm font-black text-brand-700" onClick={() => { setInitialChannel('LLAMADA'); setFormOpen(true) }} type="button"><Phone className="size-5" /> LLAMADA</button>
          <button className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-brand-200 px-4 text-sm font-black text-brand-700" onClick={() => { setInitialChannel('VISITA'); setFormOpen(true) }} type="button"><MapPin className="size-5" /> VISITA</button>
          <button className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-ink-950 px-4 text-sm font-black text-white hover:bg-ink-900" onClick={() => { setInitialChannel(undefined); setFormOpen((current) => !current) }} type="button"><CalendarClock className="size-5" /> PROGRAMAR</button>
        </div>
      </div>

      {formOpen && (
        <CommunicationForm
          key={initialChannel ?? 'default'}
          initialChannel={initialChannel}
          email={target.email}
          entityTable={table.name as 'CLIENTES' | 'Gestion Clientes'}
          entityTitle={target.title || getRowTitle(table, row)}
          entityUuid={entityUuid}
          initialMessage={defaultMessage}
          initialSubject={defaultSubject}
          onCreated={async () => {
            setFormOpen(false)
            await queryClient.invalidateQueries({ queryKey: ['communications'] })
          }}
          phone={target.phone}
          recipientName={target.contactName || target.title}
        />
      )}

      <div className="mt-5 border-t border-black/5 pt-5">
        <h3 className="mb-3 text-sm font-black text-ink-950">Historial programado</h3>
        {communications.isPending
          ? <p className="text-sm font-semibold text-ink-800/45">Consultando comunicaciones…</p>
          : <CommunicationList communications={entityCommunications} compact referenceTime={communications.dataUpdatedAt} />}
      </div>
    </section>
  )
}

export function CommunicationForm({
  email,
  entityTable,
  entityTitle,
  entityUuid,
  initialMessage,
  initialSubject,
  onCreated,
  phone,
  recipientName,
  initialChannel,
}: {
  readonly initialChannel?: CommunicationChannel | undefined
  readonly email: string
  readonly entityTable: 'CLIENTES' | 'Gestion Clientes'
  readonly entityTitle: string
  readonly entityUuid: string
  readonly initialMessage: string
  readonly initialSubject: string
  readonly onCreated: () => Promise<void>
  readonly phone: string
  readonly recipientName: string
}) {
  const repository = useRepository()
  const [channel, setChannel] = useState<CommunicationChannel>(initialChannel ?? (whatsappHref(phone) ? 'WHATSAPP' : 'EMAIL'))
  const [recipients, setRecipients] = useState<Record<CommunicationChannel, string>>({
    EMAIL: email,
    WHATSAPP: phone,
    LLAMADA: phone,
    VISITA: '',
  })
  const [subject, setSubject] = useState(initialSubject)
  const [message, setMessage] = useState(initialMessage)
  const [taskMessage, setTaskMessage] = useState('')
  const [scheduledAt, setScheduledAt] = useState(defaultLocalDateTime())
  const recipient = recipients[channel]
  const task = channel === 'LLAMADA' || channel === 'VISITA'
  const validRecipient = Boolean(channel === 'WHATSAPP' ? whatsappHref(recipient)
    : channel === 'LLAMADA' ? callHref(recipient)
      : channel === 'VISITA' ? visitHref(recipient) : emailHref(recipient))
  const content = task ? taskMessage : message
  const create = useMutation({
    mutationFn: () => repository.createCommunication({
      entityTable,
      entityUuid,
      entityTitle,
      channel,
      recipient,
      recipientName,
      subject: channel === 'EMAIL' ? subject : '',
      message: content,
      scheduledAt: new Date(scheduledAt).toISOString(),
    }),
    onSuccess: onCreated,
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (validRecipient && content.trim() && scheduledAt) create.mutate()
  }

  return (
    <form className="mt-5 rounded-2xl border border-brand-200 bg-brand-50/60 p-4 sm:p-5" onSubmit={submit}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <span className="text-xs font-black text-ink-950">TIPO DE ACTIVIDAD</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <ChannelButton active={channel === 'WHATSAPP'} icon={<WhatsAppIcon className="size-5" />} label="WhatsApp" onClick={() => setChannel('WHATSAPP')} tone="whatsapp" />
            <ChannelButton active={channel === 'EMAIL'} icon={<Mail className="size-5" />} label="Correo" onClick={() => setChannel('EMAIL')} tone="email" />
            <ChannelButton active={channel === 'LLAMADA'} icon={<Phone className="size-5" />} label="Llamada" onClick={() => setChannel('LLAMADA')} tone="email" />
            <ChannelButton active={channel === 'VISITA'} icon={<MapPin className="size-5" />} label="Visita" onClick={() => setChannel('VISITA')} tone="email" />
          </div>
        </div>
        <label className="text-xs font-black text-ink-950">FECHA Y HORA
          <input className="mt-2 min-h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm font-bold outline-none focus:border-brand-500" min={minimumLocalDateTime()} onChange={(event) => setScheduledAt(event.target.value)} required type="datetime-local" value={scheduledAt} />
        </label>
        <label className="text-xs font-black text-ink-950">{channel === 'VISITA' ? 'DIRECCIÓN COMPLETA O LIGA DE UBICACIÓN' : channel === 'LLAMADA' ? 'TELÉFONO A MARCAR' : 'DESTINATARIO'}
          <input
            aria-invalid={!validRecipient}
            className="mt-2 min-h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm font-bold outline-none focus:border-brand-500 aria-invalid:border-red-300 aria-invalid:ring-2 aria-invalid:ring-red-100"
            onChange={(event) => setRecipients((current) => ({ ...current, [channel]: event.target.value }))}
            placeholder={channel === 'VISITA' ? 'Calle, número, colonia, ciudad o https://maps…' : channel === 'EMAIL' ? 'correo@empresa.com' : 'Ej. +52 81 1234 5678'}
            maxLength={channel === 'VISITA' ? 2000 : 254}
            required
            type={channel === 'VISITA' ? 'text' : channel === 'EMAIL' ? 'email' : 'tel'}
            value={recipient}
          />
          {!validRecipient && <span className="mt-1.5 block text-[11px] font-bold text-red-600">{channel === 'VISITA' ? 'Captura una dirección o una liga HTTP/HTTPS válida.' : channel === 'EMAIL' ? 'Captura un correo electrónico válido.' : 'Captura un teléfono válido de al menos 10 dígitos.'}</span>}
          {channel === 'VISITA' && validRecipient && <a className="mt-2 block text-sm underline" href={visitHref(recipient)} rel="noopener noreferrer" target="_blank">Ver ubicación antes de guardar</a>}
          {channel === 'LLAMADA' && <span className="mt-2 block text-xs font-medium normal-case">Abrirá el marcador del celular o la app de llamadas configurada en tu PC. Si no tienes una, podrás copiar el número.</span>}
          <span className="mt-1 block text-[10px] font-semibold normal-case text-ink-800/40">Puedes reemplazarlo solo para esta programación; el registro del cliente no se modifica.</span>
        </label>
        {channel === 'EMAIL' && <label className="text-xs font-black text-ink-950">ASUNTO
          <input className="mt-2 min-h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm font-bold outline-none focus:border-brand-500" maxLength={180} onChange={(event) => setSubject(event.target.value)} required value={subject} />
        </label>}
        <label className="text-xs font-black text-ink-950 lg:col-span-2">{task ? 'OBJETIVO Y DETALLES DE LA ACTIVIDAD' : 'MENSAJE'}
          <textarea className="mt-2 min-h-32 w-full resize-y rounded-xl border border-black/10 bg-white p-4 text-sm font-medium leading-relaxed outline-none focus:border-brand-500" maxLength={3000} onChange={(event) => task ? setTaskMessage(event.target.value) : setMessage(event.target.value)} required value={content} />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-ink-800/50">{task ? 'Abrir el marcador o la ubicación no completa la tarea. Confirma cuando la hayas realizado.' : 'Al llegar la hora, abrirás el mensaje preparado y confirmarás el envío.'}</p>
        <button className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-ink-950 px-5 text-sm font-black text-white disabled:opacity-50" disabled={create.isPending || !validRecipient} type="submit"><Send className="size-4" />{create.isPending ? 'GUARDANDO…' : 'GUARDAR PROGRAMACIÓN'}</button>
      </div>
      {create.isError && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{create.error instanceof Error ? create.error.message : 'No fue posible guardar la programación.'}</p>}
    </form>
  )
}

function ChannelButton({ active, icon, label, onClick, tone }: {
  readonly active: boolean
  readonly icon: ReactNode
  readonly label: string
  readonly onClick: () => void
  readonly tone: 'email' | 'whatsapp'
}) {
  const activeStyle = tone === 'whatsapp' ? 'border-[#128c4a] bg-[#128c4a] text-white' : 'border-brand-500 bg-brand-500 text-[#191919]'
  return <button className={'inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black ' + (active ? activeStyle : 'border-black/10 bg-white text-ink-800/65')} onClick={onClick} type="button">{icon}{label.toLocaleUpperCase('es-MX')}</button>
}

function localDateTime(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function minimumLocalDateTime(): string {
  return localDateTime(new Date())
}

function defaultLocalDateTime(): string {
  return localDateTime(new Date(Date.now() + 60 * 60_000))
}
