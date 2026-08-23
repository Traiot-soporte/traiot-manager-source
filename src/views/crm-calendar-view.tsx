import { useQuery } from '@tanstack/react-query'
import { Building2, ChevronLeft, ChevronRight, Plus, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useRepository } from '@/data/use-repository'
import { cn } from '@/lib/utils'
import type { RowData } from '@/schema'
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
] as const

export function CrmCalendarView({ basePath, rows }: CollectionViewProps) {
  const repository = useRepository()
  const currentUser = useQuery({ queryKey: ['current-user'], queryFn: () => repository.getCurrentUser() })
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
  const calendarDays = buildMonthCells(month)
  const today = mexicoDateKey(new Date())
  const responsibles = [...new Set(
    visibleRows.map((row) => responsibleName(row)).filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, 'es-MX'))

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
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-500 px-3 text-[11px] font-black text-[#191919] hover:bg-brand-400" to={basePath + '/nuevo?calendario=' + (scope === 'personal' ? 'Personal' : 'Empresarial')}>
            <Plus className="size-4" /> AGREGAR {scope === 'personal' ? 'PERSONAL' : 'EMPRESARIAL'}
          </Link>
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
          <span className="text-xs font-bold text-ink-800/45">{visibleRows.length} evento{visibleRows.length === 1 ? '' : 's'} visibles</span>
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
                return (
                  <div className={cn('min-h-32 border-b border-r border-black/5 p-2', day.key === today && 'bg-brand-50/60')} key={day.key}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className={cn('grid size-7 place-items-center rounded-full text-xs font-black', day.key === today ? 'bg-brand-500 text-[#191919]' : 'text-ink-800/55')}>{day.number}</span>
                      {dayEvents.length > 0 && <span className="text-[10px] font-black text-ink-800/30">{dayEvents.length}</span>}
                    </div>
                    <div className="space-y-1.5">
                      {dayEvents.slice(0, 3).map((row) => <CalendarEvent basePath={basePath} key={String(row._uuid)} row={row} />)}
                      {dayEvents.length > 3 && <p className="px-1 text-[10px] font-black text-brand-700">+{dayEvents.length - 3} más</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {scope === 'personal' && !currentUser.isPending && visibleRows.length === 0 && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">Tu calendario personal está vacío. Usa “Agregar personal” para crear un evento privado para tu cuenta.</p>
      )}

      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <span className="mr-2 text-[10px] font-black uppercase tracking-wide text-ink-800/40">Responsables</span>
        {responsibles.length > 0 ? responsibles.map((responsible) => {
          const color = colorForResponsible(responsible)
          return <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black" key={responsible} style={{ backgroundColor: color.background, color: color.text }}><span className="size-2 rounded-full" style={{ backgroundColor: color.border }} />{responsible}</span>
        }) : <span className="text-xs font-semibold text-ink-800/35">Sin responsables visibles.</span>}
      </section>
    </div>
  )
}

function ScopeButton({ active, icon: Icon, label, onClick }: { readonly active: boolean; readonly icon: typeof UserRound; readonly label: string; readonly onClick: () => void }) {
  return <button className={cn('inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-[11px] font-black transition', active ? 'bg-ink-950 text-white' : 'text-ink-800/50 hover:bg-white')} onClick={onClick} type="button"><Icon className="size-4" />{label}</button>
}

function CalendarEvent({ basePath, row }: { readonly basePath: string; readonly row: RowData }) {
  const responsible = responsibleName(row)
  const color = colorForResponsible(responsible)
  const action = String(row.Accion ?? 'Seguimiento')
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
    const key = eventDateKey(row.Fecha_contacto)
    if (key) grouped.set(key, [...(grouped.get(key) ?? []), row])
  }
  return grouped
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
  return String(row.Responsable ?? '').trim() || 'Sin responsable'
}

function calendarScope(row: RowData): 'Personal' | 'Empresarial' {
  return normalizeName(row.Calendario) === 'PERSONAL' ? 'Personal' : 'Empresarial'
}

function normalizeName(value: unknown): string {
  return typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()
    : ''
}

function colorForResponsible(responsible: string) {
  let hash = 0
  for (const character of normalizeName(responsible)) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0
  return responsibleColors[Math.abs(hash) % responsibleColors.length]!
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
