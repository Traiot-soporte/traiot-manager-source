import { CalendarDays } from 'lucide-react'
import { Link } from 'react-router'

import type { RowData } from '@/schema'
import type { CollectionViewProps } from '@/views/types'
import { getRowTitle } from '@/views/view-utils'

function dateKey(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length < 10) return undefined
  const date = new Date(value.length === 10 ? value + 'T12:00:00-06:00' : value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString().slice(0, 10)
}

export function CalendarView({ basePath, rows, table }: CollectionViewProps) {
  const dateColumn = table.columns.find((column) => column.type === 'Date' || column.type === 'DateTime')
  if (!dateColumn) {
    return <ViewMessage text="Esta tabla no contiene una columna de fecha para construir el calendario." />
  }

  const grouped = new Map<string, RowData[]>()
  for (const row of rows) {
    const key = dateKey(row[dateColumn.name])
    if (key) grouped.set(key, [...(grouped.get(key) ?? []), row])
  }
  const days = [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right))
  if (days.length === 0) return <ViewMessage text="No hay registros con una fecha válida." />

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {days.map(([day, dayRows]) => (
        <section className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm" key={day}>
          <header className="flex items-center gap-3 bg-ink-950 px-5 py-4 text-white">
            <CalendarDays className="size-5 text-brand-400" />
            <h2 className="font-black capitalize">{new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'America/Mexico_City' }).format(new Date(day + 'T12:00:00-06:00'))}</h2>
          </header>
          <div className="divide-y divide-black/5">
            {dayRows.map((row) => (
              <Link className="flex min-h-14 items-center justify-between gap-4 px-5 py-3 text-sm font-bold text-ink-800 hover:bg-brand-50" key={String(row._uuid)} to={basePath + '/' + encodeURIComponent(String(row._uuid))}>
                <span>{getRowTitle(table, row)}</span>
                <span className="text-brand-600">Abrir</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function ViewMessage({ text }: { readonly text: string }) {
  return <div className="rounded-3xl border border-dashed border-black/15 bg-white/60 p-10 text-center text-sm font-semibold text-ink-800/55">{text}</div>
}
