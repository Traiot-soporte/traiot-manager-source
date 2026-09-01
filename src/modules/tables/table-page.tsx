import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { ModuleHeader } from '@/components/module-header'
import { TableIcon } from '@/components/table-icon'
import { useRepository } from '@/data/use-repository'
import { canManageAllCrmRecords } from '@/modules/tables/crm-access'
import { getTableDefinition, getTableDisplayName } from '@/schema'
import type { RowData } from '@/schema'
import { CalendarView } from '@/views/calendar-view'
import { CardView } from '@/views/card-view'
import { CrmCalendarView } from '@/views/crm-calendar-view'
import { DashboardView } from '@/views/dashboard-view'
import { DeckView } from '@/views/deck-view'
import { TableView } from '@/views/table-view'
import { ExportActions } from '@/views/export-actions'
import { getAvailableCollectionViews, resolveCollectionView, type CollectionViewKind } from '@/views/view-kinds'
import { ViewSwitcher } from '@/views/view-switcher'

const ChartView = lazy(() =>
  import('@/views/chart-view').then((module) => ({ default: module.ChartView })),
)

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
  const currentUser = useQuery({
    queryKey: ['current-user'],
    queryFn: () => repository.getCurrentUser(),
    enabled: table?.name === 'CLIENTES',
  })
  const requestedView = searchParams.get('vista')
  const availableViews = table ? getAvailableCollectionViews(table) : []
  const view = table ? resolveCollectionView(table, requestedView) : 'table'
  const filteredRows = useMemo(
    () => filterRows(rows.data ?? [], search),
    [rows.data, search],
  )

  if (!table) return <MissingTable />
  const basePath = '/tablas/' + encodeURIComponent(table.name)
  const createLabel = table.name === 'ALMACEN'
    ? 'Agregar producto'
    : table.name === 'PROVEEDORES'
      ? 'Nuevo proveedor'
    : table.name === 'COMPRAS'
      ? 'Nueva compra'
      : table.name === 'PEDIDOS'
        ? 'Nueva salida'
        : table.name === 'Gestion Clientes' ? 'Nuevo contacto' : 'Nuevo registro'
  const canCreateRecord = table.name !== 'CLIENTES' || canManageAllCrmRecords(currentUser.data?.role)

  const changeView = (nextView: CollectionViewKind) => {
    const next = new URLSearchParams(searchParams)
    next.set('vista', nextView)
    setSearchParams(next)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 lg:sticky lg:top-16 lg:z-30 lg:-mx-2 lg:bg-[#f7f3f1]/95 lg:px-2 lg:pb-2 lg:pt-2 lg:backdrop-blur-xl">
        <ModuleHeader
          action={<div className="flex flex-wrap items-center justify-end gap-2">
            <ExportActions rows={rows.data ?? []} table={table} />
            {repository.writable && !table.readOnly && canCreateRecord ? (
                <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-black text-[#191919] transition hover:bg-brand-400" to={basePath + '/nuevo'}>
                  <Plus className="size-5" /> {createLabel}
                </Link>
              ) : table.readOnly ? (
                <span className="inline-flex min-h-12 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 px-5 text-sm font-black text-brand-700">
                  Actualización automática
                </span>
              ) : null}
          </div>}
          compact
          description={table.description}
          eyebrow={table.module}
          footer={<span>{rows.data?.length ?? 0} registros</span>}
          icon={<TableIcon className="size-5" name={table.icon} />}
          title={getTableDisplayName(table)}
          tone="light"
        />

        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <label className="relative block w-full xl:max-w-md">
            <span className="sr-only">Buscar registros</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-800/35" />
            <input className="min-h-11 w-full rounded-2xl border border-black/5 bg-white pl-11 pr-4 text-sm font-semibold outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en todos los campos…" type="search" value={search} />
          </label>
          <ViewSwitcher onChange={changeView} value={view} views={availableViews} />
        </div>
      </div>

      {rows.isPending && <StatusMessage text="Cargando registros…" />}
      {rows.isError && <StatusMessage error text="No fue posible consultar los registros." />}
      {rows.data && filteredRows.length === 0 && <StatusMessage text={search ? 'No hay resultados para esta búsqueda.' : 'Aún no hay registros. Crea el primero con el botón superior.'} />}
      {rows.data && filteredRows.length > 0 && <CollectionView basePath={basePath} rows={filteredRows} table={table} view={view} />}
    </div>
  )
}

function CollectionView({ view, ...props }: { readonly view: CollectionViewKind } & Parameters<typeof TableView>[0]) {
  switch (view) {
    case 'deck': return <DeckView {...props} />
    case 'card': return <CardView {...props} />
    case 'calendar': return props.table.name === 'Gestion Clientes' ? <CrmCalendarView {...props} /> : <CalendarView {...props} />
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
  return <section className="rounded-3xl bg-white p-8"><h1 className="text-2xl font-black text-ink-950">Tabla no encontrada</h1><Link className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-brand-600" to="/">Volver al resumen</Link></section>
}
