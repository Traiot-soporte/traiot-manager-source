import { useQuery } from '@tanstack/react-query'
import { Building2, ChevronLeft, ChevronRight, UserRound, Video } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useRepository } from '@/data/use-repository'
import type { CompanyMeeting } from '@/data/repository'
import { cn } from '@/lib/utils'
import type { RowData } from '@/schema'
import { crmResponsibles } from '@/schema/catalogs'
import type { CollectionViewProps } from '@/views/types'

type CalendarScope = 'personal' | 'company'

const weekDays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'] as const
const responsibleColors = [
  { background: '#fee2e2', border: '#f97360', text: '#9f2d1f' },
  { background: '#dbeafe', border: '#60a5fa', text: '#1e40af' },
  { background: '#dcfce7', border: '#4ade80', text: '#166534' },
  { background: '#fef3c7', border: '#fbbf24', text: '#92400e' },
  { background: '#ede9fe', border: '#a78bfa', text: '#5b21b6' },
  { background: '#cffafe', border: '#22d3ee', text: '#155e75' },
  { background: '#fce7f3', border: '#f472b6', text: '#9d174d' },
  { background: '#ecfccb', border: '#84cc16', text: '#3f6212' },
  { background: '#e0e7ff', border: '#818cf8', text: '#3730a3' },
  { background: '#ccfbf1', border: '#2dd4bf', text: '#115e59' },
  { background: '#ffedd5', border: '#fb923c', text: '#9a3412' },
  { background: '#fae8ff', border: '#d946ef', text: '#86198f' },
] as const
const unassignedColor = { background: '#f1f5f9', border: '#64748b', text: '#334155' } as const

export function CrmCalendarView({ basePath, rows }: CollectionViewProps) {
  const repository = useRepository()
  const currentUser = useQuery({ queryKey: ['current-user'], queryFn: () => repository.getCurrentUser() })
  const meetings = useQuery({
    queryKey: ['company-meetings'],
    queryFn: () => repository.listCompanyMeetings(),
    staleTime: 30_000,
  })
  const [scope, setScope] = useState<CalendarScope>('personal')
  const [month, setMonth] = useState(() => mexicoCurrentMonth())
  const currentUserUuid = currentUser.data?.userUuid ?? ''
  const visibleRows = useMemo(
    () => scope === 'company'
      ? rows.filter((row) => calendarScope(row) === 'Empresarial')
      : rows.filter((row) => calendarScope(row) === 'Personal' && row._calendarOwnerUuid === currentUserUuid),
    [currentUserUuid, rows, scope],
  )
  const eventsByDay = useMemo(() => groupEventsByDay(visibleRows), [visibleRows])
  const companyMeetings = useMemo(
    () => scope === 'company' ? meetings.data ?? [] : [],
    [meetings.data, scope],
  )
  const meetingsByDay = useMemo(() => groupMeetingsByDay(companyMeetings), [companyMeetings])
  const calendarDays = buildMonthCells(month)
  const today = mexicoDateKey(new Date())
  const responsibles = useMemo(() => uniqueResponsibles(visibleRows), [visibleRows])
  const colorByResponsible = useMemo(() => assignResponsibleColors(responsibles), [responsibles])

  const moveMonth = (offset: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12))

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-600">Agenda CRM</p>
          <h2 className="mt-1 text-lg font-black text-ink-950">CALENDARIO DE SEGUIMIENTOS</h2>
          <p className="mt-1 text-xs text-ink-800/50">El color identifica al responsable de cada evento.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <div className="inline-flex rounded-xl border border-black/5 bg-[#f7f3f1] p-1">
            <ScopeButton active={scope === 'personal'} icon={UserRound} label="MI CALENDARIO" onClick={() => setScope('personal')} />
            <ScopeButton active={scope === 'company'} icon={Building2} label="EMPRESARIAL" onClick={() => setScope('company')} />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-black/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button aria-label="Mes anterior" className="grid size-10 place-items-center rounded-xl border border-black/5 hover:bg-brand-50" onClick={() => moveMonth(-1)} type="button"><ChevronLeft className="size-4" /></button>
            <h3 className="min-w-48 text-center text-base font-black capitalize text-ink-950">{formatMonth(month)}</h3>
            <button aria-label="Mes siguiente" className="grid size-10 place-items-center rounded-xl border border-black/5 hover:bg-brand-50" onClick={() => moveMonth(1)} type="button"><ChevronRight className="size-4" /></button>
            <button className="ml-1 min-h-10 rounded-xl px-3 text-xs font-black text-brand-700 hover:bg-brand-50" onClick={() => setMonth(mexicoCurrentMonth())} type="button">HOY</button>
          </div>
          <span className="text-xs font-bold text-ink-800/45">{visibleRows.length + companyMeetings.length} evento{visibleRows.length + companyMeetings.length === 1 ? '' : 's'} visibles</span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7 border-b border-black/5 bg-ink-950 text-white">
              {weekDays.map((day) => <div className="px-3 py-2 text-center text-[10px] font-black tracking-wide" key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                if (!day) return <div className="min-h-32 border-b border-r border-black/5 bg-black/[0.015]" key={'blank-' + index} />
                const dayEvents = eventsByDay.get(day.key) ?? []
                const dayMeetings = meetingsByDay.get(day.key) ?? []
                const totalEvents = dayEvents.length + dayMeetings.length
                const crmLimit = Math.max(0, 3 - dayMeetings.length)
                return (
                  <div className={cn('min-h-32 border-b border-r border-black/5 p-2', day.key === today && 'bg-brand-50/60')} key={day.key}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className={cn('grid size-7 place-items-center rounded-full text-xs font-black', day.key === today ? 'bg-brand-500 text-[#191919]' : 'text-ink-800/55')}>{day.number}</span>
                      {totalEvents > 0 && <span className="text-[10px] font-black text-ink-800/30">{totalEvents}</span>}
                    </div>
                    <div className="space-y-1.5">
                      {dayMeetings.slice(0, 3).map((meeting) => <MeetingCalendarEvent key={meeting.meetingUuid} meeting={meeting} />)}
                      {dayEvents.slice(0, crmLimit).map((row) => <CalendarEvent basePath={basePath} colorByResponsible={colorByResponsible} key={String(row._uuid)} row={row} />)}
                      {totalEvents > 3 && <p className="px-1 text-[10px] font-black text-brand-700">+{totalEvents - 3} más</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {scope === 'company' && meetings.isError && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible consultar las reuniones empresariales.</p>
      )}

      {scope === 'personal' && !currentUser.isPending && visibleRows.length === 0 && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">Tu calendario personal no tiene eventos registrados.</p>
      )}

      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <span className="mr-2 text-[10px] font-black uppercase tracking-wide text-ink-800/40">Responsables</span>
        {responsibles.length > 0 ? responsibles.map((responsible) => {
          const color = colorForResponsible(responsible, colorByResponsible)
          return <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black" key={responsible} style={{ backgroundColor: color.background, color: color.text }}><span className="size-2 rounded-full" style={{ backgroundColor: color.border }} />{responsible}</span>
        }) : <span className="text-xs font-semibold text-ink-800/35">Sin responsables visibles.</span>}
      </section>
    </div>
  )
}

function MeetingCalendarEvent({ meeting }: { readonly meeting: CompanyMeeting }) {
  return (
    <a
      className="block rounded-md border-l-[3px] border-sky-500 bg-sky-50 px-2 py-1.5 text-[10px] font-black leading-4 text-sky-900 transition hover:bg-sky-100"
      href={meeting.meetUrl}
      rel="noopener noreferrer"
      target="_blank"
      title={`${meeting.title} · ${formatMeetingTime(meeting.startAt)}`}
    >
      <span className="flex items-center gap-1 truncate"><Video className="size-3 shrink-0" /> {meeting.title}</span>
      <span className="block truncate font-semibold opacity-70">{formatMeetingTime(meeting.startAt)} · {meeting.participants.length} invitados</span>
    </a>
  )
}

function ScopeButton({ active, icon: Icon, label, onClick }: { readonly active: boolean; readonly icon: typeof UserRound; readonly label: string; readonly onClick: () => void }) {
  return <button className={cn('inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-[11px] font-black transition', active ? 'bg-ink-950 text-white' : 'text-ink-800/50 hover:bg-white')} onClick={onClick} type="button"><Icon className="size-4" />{label}</button>
}

function CalendarEvent({ basePath, colorByResponsible, row }: { readonly basePath: string; readonly colorByResponsible: ReadonlyMap<string, ResponsibleColor>; readonly row: RowData }) {
  const responsible = responsibleName(row)
  const primaryResponsible = responsibleNames(row)[0] ?? 'Sin responsable'
  const color = colorForResponsible(primaryResponsible, colorByResponsible)
  const action = String(row['Tipo de Contacto'] ?? row.Accion ?? 'Seguimiento')
  return (
    <Link className="block truncate rounded-md border-l-[3px] px-2 py-1.5 text-[10px] font-black leading-4 transition hover:brightness-95" style={{ backgroundColor: color.background, borderLeftColor: color.border, color: color.text }} title={`${action} · ${responsible}`} to={basePath + '/' + encodeURIComponent(String(row._uuid))}>
      {action}
      <span className="block truncate font-semibold opacity-70">{responsible}</span>
    </Link>
  )
}

function groupEventsByDay(rows: readonly RowData[]): Map<string, RowData[]> {
  const grouped = new Map<string, RowData[]>()
  for (const row of rows) {
    const key = eventDateKey(row.Creado ?? row['Última actualización en'] ?? row._updatedAt)
    if (key) grouped.set(key, [...(grouped.get(key) ?? []), row])
  }
  return grouped
}

function groupMeetingsByDay(meetings: readonly CompanyMeeting[]): Map<string, CompanyMeeting[]> {
  const grouped = new Map<string, CompanyMeeting[]>()
  for (const meeting of meetings) {
    const key = meetingDateKey(meeting.startAt)
    if (key) grouped.set(key, [...(grouped.get(key) ?? []), meeting])
  }
  return grouped
}

function meetingDateKey(value: string): string | undefined {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return mexicoDateKey(date)
}

function formatMeetingTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Hora pendiente'
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  }).format(date)
}

function eventDateKey(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : mexicoDateKey(date)
}

function buildMonthCells(month: Date): readonly ({ key: string; number: number } | null)[] {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const leading = (new Date(year, monthIndex, 1, 12).getDay() + 6) % 7
  const daysInMonth = new Date(year, monthIndex + 1, 0, 12).getDate()
  const cellCount = Math.max(35, Math.ceil((leading + daysInMonth) / 7) * 7)
  return Array.from({ length: cellCount }, (_, index) => {
    const number = index - leading + 1
    if (number < 1 || number > daysInMonth) return null
    return { key: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(number).padStart(2, '0')}`, number }
  })
}

function responsibleName(row: RowData): string {
  return responsibleNames(row).join(' / ') || 'Sin responsable'
}

function responsibleNames(row: RowData): readonly string[] {
  const rawValues = Array.isArray(row.Responsable)
    ? row.Responsable.map(String)
    : String(row.Responsable ?? '').split(/\s*(?:,|\/)\s*/)

  return [...new Set(rawValues.map((value) => {
    const normalized = normalizeName(value)
    return crmResponsibles.find((responsible) => normalizeName(responsible) === normalized) ?? value.trim()
  }).filter(Boolean))]
}

function calendarScope(row: RowData): 'Personal' | 'Empresarial' {
  return normalizeName(row.Calendario) === 'PERSONAL' ? 'Personal' : 'Empresarial'
}

function normalizeName(value: unknown): string {
  return typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()
    : ''
}

type ResponsibleColor = (typeof responsibleColors)[number] | typeof unassignedColor

function uniqueResponsibles(rows: readonly RowData[]): readonly string[] {
  const labels = new Map<string, string>()
  for (const row of rows) {
    const names = responsibleNames(row)
    for (const label of names.length > 0 ? names : ['Sin responsable']) {
      const key = normalizeName(label)
      if (!labels.has(key)) labels.set(key, label)
    }
  }
  return [...labels.values()].sort((left, right) => left.localeCompare(right, 'es-MX'))
}

function assignResponsibleColors(responsibles: readonly string[]): ReadonlyMap<string, ResponsibleColor> {
  const assignments = new Map<string, ResponsibleColor>()
  const usedIndexes = new Set<number>()

  for (const responsible of responsibles) {
    const key = normalizeName(responsible)
    if (key === 'SIN RESPONSABLE') {
      assignments.set(key, unassignedColor)
      continue
    }

    let index = stableColorIndex(key)
    for (let offset = 0; offset < responsibleColors.length; offset += 1) {
      const candidate = (index + offset) % responsibleColors.length
      if (!usedIndexes.has(candidate)) {
        index = candidate
        break
      }
    }
    usedIndexes.add(index)
    assignments.set(key, responsibleColors[index]!)
  }

  return assignments
}

function stableColorIndex(value: string): number {
  let hash = 0
  for (const character of value) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0
  return Math.abs(hash) % responsibleColors.length
}

function colorForResponsible(responsible: string, assignments: ReadonlyMap<string, ResponsibleColor>): ResponsibleColor {
  return assignments.get(normalizeName(responsible)) ?? unassignedColor
}

function mexicoCurrentMonth(): Date {
  const parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', timeZone: 'America/Mexico_City' }).formatToParts(new Date())
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  return new Date(year, month - 1, 1, 12)
}

function mexicoDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Mexico_City' }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function formatMonth(month: Date): string {
  return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' }).format(month)
}
