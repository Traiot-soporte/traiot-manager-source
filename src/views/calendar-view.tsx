import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { cn } from '@/lib/utils'
import type { RowData, TableDef } from '@/schema'
import {
  buildCalendarMonthCells,
  findCalendarDateColumn,
  groupCalendarRowsByDate,
  mexicoDateKey,
} from '@/views/calendar-utils'
import type { CollectionViewProps } from '@/views/types'
import { getRowTitle } from '@/views/view-utils'

const weekDays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'] as const

export function CalendarView({ basePath, rows, table }: CollectionViewProps) {
  const dateColumn = findCalendarDateColumn(table)
  const [month, setMonth] = useState(() => mexicoCurrentMonth())
  const grouped = useMemo(
    () => dateColumn ? groupCalendarRowsByDate(rows, dateColumn.name) : new Map<string, RowData[]>(),
    [dateColumn, rows],
  )

  if (!dateColumn) {
    return <ViewMessage text="Esta sección no contiene una fecha para construir el calendario." />
  }
  if (grouped.size === 0) {
    return <ViewMessage text="No hay registros con una fecha válida." />
  }

  const calendarDays = buildCalendarMonthCells(month)
  const today = mexicoDateKey(new Date())
  const datedRows = [...grouped.values()].reduce((total, dayRows) => total + dayRows.length, 0)
  const visibleRows = calendarDays.reduce(
    (total, day) => total + (day ? (grouped.get(day.key)?.length ?? 0) : 0),
    0,
  )
  const moveMonth = (offset: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12))
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-600">Agenda · {dateColumn.label ?? dateColumn.name}</p>
          <h2 className="mt-1 text-lg font-black text-ink-950">CALENDARIO DE {table.name.toLocaleUpperCase('es-MX')}</h2>
          <p className="mt-1 text-xs text-ink-800/50">Consulta los registros agregados en cada día y abre su detalle directamente.</p>
        </div>
        <span className="self-start rounded-full bg-brand-50 px-3 py-2 text-xs font-black text-brand-700">
          {datedRows} {datedRows === 1 ? 'registro con fecha' : 'registros con fecha'}
        </span>
      </section>

      <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-black/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button aria-label="Mes anterior" className="grid size-10 place-items-center rounded-xl border border-black/5 hover:bg-brand-50" onClick={() => moveMonth(-1)} type="button">
              <ChevronLeft className="size-4" />
            </button>
            <h3 className="min-w-48 text-center text-base font-black capitalize text-ink-950">{formatMonth(month)}</h3>
            <button aria-label="Mes siguiente" className="grid size-10 place-items-center rounded-xl border border-black/5 hover:bg-brand-50" onClick={() => moveMonth(1)} type="button">
              <ChevronRight className="size-4" />
            </button>
            <button className="ml-1 min-h-10 rounded-xl px-3 text-xs font-black text-brand-700 hover:bg-brand-50" onClick={() => setMonth(mexicoCurrentMonth())} type="button">HOY</button>
          </div>
          <span className="text-xs font-bold text-ink-800/45">{visibleRows} {visibleRows === 1 ? 'registro visible' : 'registros visibles'}</span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7 border-b border-black/5 bg-ink-950 text-white">
              {weekDays.map((day) => (
                <div className="px-3 py-2 text-center text-[10px] font-black tracking-wide" key={day}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div className="min-h-32 border-b border-r border-black/5 bg-black/[0.015]" key={'blank-' + index} />
                }
                const dayRows = grouped.get(day.key) ?? []
                return (
                  <div className={cn('min-h-32 border-b border-r border-black/5 p-2', day.key === today && 'bg-brand-50/60')} key={day.key}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className={cn('grid size-7 place-items-center rounded-full text-xs font-black', day.key === today ? 'bg-brand-500 text-[#191919]' : 'text-ink-800/55')}>{day.number}</span>
                      {dayRows.length > 0 && <span className="text-[10px] font-black text-ink-800/30">{dayRows.length}</span>}
                    </div>
                    <div className="space-y-1.5">
                      {dayRows.slice(0, 3).map((row) => (
                        <CalendarRecord basePath={basePath} key={String(row._uuid)} row={row} table={table} />
                      ))}
                      {dayRows.length > 3 && <p className="px-1 text-[10px] font-black text-brand-700">+{dayRows.length - 3} más</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function CalendarRecord({ basePath, row, table }: { readonly basePath: string; readonly row: RowData; readonly table: TableDef }) {
  const title = getRowTitle(table, row)
  const detail = calendarRecordDetail(row)
  return (
    <Link
      className="block truncate rounded-md border-l-[3px] border-brand-500 bg-brand-50 px-2 py-1.5 text-[10px] font-black leading-4 text-brand-800 transition hover:bg-brand-100"
      title={detail ? `${title} · ${detail}` : title}
      to={basePath + '/' + encodeURIComponent(String(row._uuid))}
    >
      {title}
      {detail && <span className="block truncate font-semibold text-ink-800/55">{detail}</span>}
    </Link>
  )
}

function calendarRecordDetail(row: RowData): string {
  const values = [row.MODELO, row.MARCA, row.ESTATUS]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
  return values.slice(0, 2).join(' · ')
}

function mexicoCurrentMonth(): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'numeric',
    timeZone: 'America/Mexico_City',
  }).formatToParts(new Date())
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  return new Date(year, month - 1, 1, 12)
}

function formatMonth(month: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Mexico_City',
  }).format(month)
}

function ViewMessage({ text }: { readonly text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-black/15 bg-white/60 p-10 text-center text-sm font-semibold text-ink-800/55">
      <CalendarDays className="mx-auto mb-3 size-7 text-brand-500" />
      {text}
    </div>
  )
}
