import { useQuery } from '@tanstack/react-query'
import { Braces, Plus, Search } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { TableIcon } from '@/components/table-icon'
import { useRepository } from '@/data/use-repository'
import { getTableDefinition } from '@/schema'
import type { RowData, TableDef } from '@/schema'
import { CalendarView } from '@/views/calendar-view'
import { CardView } from '@/views/card-view'
import { DashboardView } from '@/views/dashboard-view'
import { DeckView } from '@/views/deck-view'
import { TableView } from '@/views/table-view'
import { isCollectionViewKind, type CollectionViewKind } from '@/views/view-kinds'
import { ViewSwitcher } from '@/views/view-switcher'

const ChartView = lazy(() =>
  import('@/views/chart-view').then((module) => ({ default: module.ChartView })),
)

function defaultCollectionView(table: TableDef): CollectionViewKind {
  return isCollectionViewKind(table.defaultView) ? table.defaultView : 'table'
}

export function TablePage() {
  const { tableName = '' } = useParams()
  const table = getTableDefinition(tableName)
  const repository = useRepository()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const rows = useQuery({
    queryKey: ['table', tableName],
    queryFn: () => repository.list(tableName),
    enabled: Boolean(table),
  })
  const requestedView = searchParams.get('vista')
  const view = table && isCollectionViewKind(requestedView) ? requestedView : table ? defaultCollectionView(table) : 'table'
  const filteredRows = useMemo(
    () => filterRows(rows.data ?? [], search),
    [rows.data, search],
  )

  if (!table) return <MissingTable />
  const basePath = '/tablas/' + encodeURIComponent(table.name)

  const changeView = (nextView: CollectionViewKind) => {
    const next = new URLSearchParams(searchParams)
    next.set('vista', nextView)
    setSearchParams(next)
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ink-950 text-mint-400"><TableIcon className="size-7" name={table.icon} /></span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-mint-600">{table.module}</p>
                <h1 className="mt-1 text-2xl font-black text-ink-950 sm:text-3xl">{table.name}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-800/55">{table.description}</p>
              </div>
            </div>
            <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-mint-500 px-5 text-sm font-black text-ink-950 transition hover:bg-mint-400" to={basePath + '/nuevo'}>
              <Plus className="size-5" /> Nuevo registro
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-black/5 bg-mint-50 px-6 py-3 text-xs font-bold text-mint-600 sm:px-8">
          <span>{rows.data?.length ?? 0} registros</span><span>·</span><span className="inline-flex items-center gap-1"><Braces className="size-3.5" />{table.columns.length} campos</span><span>·</span><span>MockRepository</span>
        </div>
      </section>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <label className="relative block w-full xl:max-w-md">
          <span className="sr-only">Buscar registros</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-800/35" />
          <input className="min-h-12 w-full rounded-2xl border border-black/5 bg-white pl-11 pr-4 text-sm font-semibold outline-none focus:border-mint-500 focus:ring-4 focus:ring-mint-100" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en todos los campos…" type="search" value={search} />
        </label>
        <ViewSwitcher onChange={changeView} value={view} />
      </div>

      {rows.isPending && <StatusMessage text="Cargando registros…" />}
      {rows.isError && <StatusMessage error text="No fue posible leer los datos simulados." />}
      {rows.data && filteredRows.length === 0 && <StatusMessage text={search ? 'No hay resultados para esta búsqueda.' : 'Aún no hay registros. Crea el primero con el botón superior.'} />}
      {rows.data && filteredRows.length > 0 && <CollectionView basePath={basePath} rows={filteredRows} table={table} view={view} />}
    </div>
  )
}

function CollectionView({ view, ...props }: { readonly view: CollectionViewKind } & Parameters<typeof TableView>[0]) {
  switch (view) {
    case 'deck': return <DeckView {...props} />
    case 'card': return <CardView {...props} />
    case 'calendar': return <CalendarView {...props} />
    case 'chart': return <Suspense fallback={<StatusMessage text="Preparando gráfica…" />}><ChartView {...props} /></Suspense>
    case 'dashboard': return <DashboardView {...props} />
    default: return <TableView {...props} />
  }
}

function filterRows(rows: readonly RowData[], term: string) {
  const normalized = term.trim().toLocaleLowerCase('es-MX')
  if (!normalized) return rows
  return rows.filter((row) => Object.values(row).some((value) => String(Array.isArray(value) ? value.join(' ') : value ?? '').toLocaleLowerCase('es-MX').includes(normalized)))
}

function StatusMessage({ error = false, text }: { readonly error?: boolean; readonly text: string }) {
  return <div className={error ? 'rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-800' : 'rounded-3xl bg-white p-6 text-sm text-ink-800/55'}>{text}</div>
}

function MissingTable() {
  return <section className="rounded-3xl bg-white p-8"><h1 className="text-2xl font-black text-ink-950">Tabla no encontrada</h1><Link className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-mint-600" to="/">Volver al resumen</Link></section>
}
