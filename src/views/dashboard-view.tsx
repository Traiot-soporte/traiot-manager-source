import { Activity, ChevronRight, CircleAlert, CircleCheckBig, CircleX, Clock3, Columns3, Database, FileCheck2, Gauge, Layers3, PackageMinus, ShoppingBag, Tags, TimerReset, TrendingDown, TrendingUp, UserCheck, UsersRound, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { CollectionViewProps } from '@/views/types'
import { useRepository } from '@/data/use-repository'
import { CardView } from '@/views/card-view'
import { getCurrentCrmAccounts } from '@/views/crm-lifecycle'
import { matrixDeviceBreakdown, matrixDeviceMetrics, type MatrixBreakdownColumn } from '@/views/dashboard-metrics'
import { laboratoryDashboardMetrics } from '@/views/laboratory-dashboard'
import { outboundDashboardMetrics } from '@/views/outbound-dashboard'
import { purchaseDashboardMetrics, type PurchaseVolumeMetric } from '@/views/purchase-dashboard'
import { TableView } from '@/views/table-view'
import { warehouseDashboardMetrics } from '@/views/warehouse-dashboard'

export function DashboardView(props: CollectionViewProps) {
  if (props.table.name === 'Gestion Clientes') {
    return <CrmDashboardView {...props} />
  }
  if (props.table.name === 'MATRIZ DISPOSITIVOS') {
    return <MatrixDeviceDashboardView {...props} />
  }
  if (props.table.name === 'Laboratorio') {
    return <LaboratoryDashboardView {...props} />
  }
  if (props.table.name === 'COMPRAS') {
    return <PurchaseDashboardView {...props} />
  }
  if (props.table.name === 'PEDIDOS') {
    return <OutboundDashboardView {...props} />
  }
  if (props.table.name === 'ALMACEN') {
    return <WarehouseDashboardView {...props} />
  }

  const { rows, table } = props
  const filled = rows.reduce((total, row) => total + table.columns.filter((column) => row[column.name] !== undefined && row[column.name] !== '').length, 0)
  const possible = Math.max(rows.length * table.columns.length, 1)
  const completeness = Math.round((filled / possible) * 100)

  const metrics = [
    { label: 'Registros', value: rows.length, icon: Database },
    { label: 'Campos', value: table.columns.length, icon: Columns3 },
    { label: 'Completitud', value: completeness + '%', icon: Gauge },
    { label: 'Estado', value: 'Activo', icon: Activity },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ icon: Icon, label, value }) => (
          <article className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm" key={label}>
            <span className="grid size-11 place-items-center rounded-2xl bg-brand-100 text-brand-600"><Icon className="size-5" /></span>
            <p className="mt-5 text-3xl font-black text-ink-950">{value}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-wide text-ink-800/45">{label}</p>
          </article>
        ))}
      </div>
      <section>
        <h2 className="mb-4 text-lg font-black text-ink-950">Registros recientes</h2>
        <CardView {...props} rows={rows.slice(0, 6)} />
      </section>
    </div>
  )
}

function WarehouseDashboardView(props: CollectionViewProps) {
  const metrics = warehouseDashboardMetrics(props.rows)

  return (
    <div className="space-y-5">
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <OperationCountCard icon={Database} label="Registros" value={metrics.products} />
        <OperationVolumeCard icon={Gauge} label="GPS con más existencia" metric={metrics.categories.GPS} />
        <OperationVolumeCard icon={Activity} label="Sensor con más existencia" metric={metrics.categories.SENSOR} />
        <OperationVolumeCard icon={Layers3} label="Accesorio con más existencia" metric={metrics.categories.ACCESORIO} />
        <OperationVolumeCard icon={FileCheck2} label="CCTV con más existencia" metric={metrics.categories.CCTV} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-black text-ink-950">PRODUCTOS RECIENTES</h2>
        <CardView {...props} rows={props.rows.slice(0, 6)} />
      </section>
    </div>
  )
}

function PurchaseDashboardView(props: CollectionViewProps) {
  const repository = useRepository()
  const products = useQuery({ queryKey: ['table', 'ALMACEN'], queryFn: () => repository.list('ALMACEN') })
  const metrics = purchaseDashboardMetrics(props.rows, products.data ?? [])
  const recentRows = [...props.rows]
    .sort((left, right) => String(right['FECHA COMPRA'] ?? '').localeCompare(String(left['FECHA COMPRA'] ?? '')))
    .slice(0, 8)

  return (
    <div className="space-y-5">
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <OperationCountCard icon={ShoppingBag} label="Compras" value={metrics.purchases} />
        <OperationVolumeCard icon={TrendingUp} label="GPS más comprado" metric={metrics.categories.GPS.mostPurchased} />
        <OperationVolumeCard icon={TrendingDown} label="GPS menos comprado" metric={metrics.categories.GPS.leastPurchased} />
        <OperationVolumeCard icon={TrendingUp} label="Sensor más comprado" metric={metrics.categories.SENSOR.mostPurchased} />
        <OperationVolumeCard icon={TrendingDown} label="Sensor menos comprado" metric={metrics.categories.SENSOR.leastPurchased} />
        <OperationVolumeCard icon={TrendingUp} label="Accesorio más comprado" metric={metrics.categories.ACCESORIO.mostPurchased} />
        <OperationVolumeCard icon={TrendingDown} label="Accesorio menos comprado" metric={metrics.categories.ACCESORIO.leastPurchased} />
      </section>

      {products.isPending && (
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-xs font-bold text-brand-700">Calculando indicadores de compras…</p>
      )}
      {products.isError && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">Las compras están disponibles, pero no fue posible calcular temporalmente los indicadores por categoría.</p>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-600">Recepciones registradas</p>
            <h2 className="mt-1 text-lg font-black text-ink-950">COMPRAS RECIENTES</h2>
          </div>
          <span className="text-xs font-bold text-ink-800/40">Últimas {recentRows.length}</span>
        </div>
        <TableView {...props} rows={recentRows} />
      </section>
    </div>
  )
}

function OutboundDashboardView(props: CollectionViewProps) {
  const repository = useRepository()
  const products = useQuery({ queryKey: ['table', 'ALMACEN'], queryFn: () => repository.list('ALMACEN') })
  const metrics = outboundDashboardMetrics(props.rows, products.data ?? [])
  const recentRows = [...props.rows]
    .sort((left, right) => String(right.FECHA ?? '').localeCompare(String(left.FECHA ?? '')))
    .slice(0, 8)

  return (
    <div className="space-y-5">
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <OperationCountCard icon={PackageMinus} label="Salidas" value={metrics.exits} />
        <OperationVolumeCard icon={TrendingUp} label="GPS más despachado" metric={metrics.categories.GPS.mostDispatched} />
        <OperationVolumeCard icon={TrendingDown} label="GPS menos despachado" metric={metrics.categories.GPS.leastDispatched} />
        <OperationVolumeCard icon={TrendingUp} label="Sensor más despachado" metric={metrics.categories.SENSOR.mostDispatched} />
        <OperationVolumeCard icon={TrendingDown} label="Sensor menos despachado" metric={metrics.categories.SENSOR.leastDispatched} />
        <OperationVolumeCard icon={TrendingUp} label="Accesorio más despachado" metric={metrics.categories.ACCESORIO.mostDispatched} />
        <OperationVolumeCard icon={TrendingDown} label="Accesorio menos despachado" metric={metrics.categories.ACCESORIO.leastDispatched} />
      </section>

      {products.isPending && (
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-xs font-bold text-brand-700">Calculando indicadores de salidas…</p>
      )}
      {products.isError && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">Las salidas están disponibles, pero no fue posible calcular temporalmente los indicadores por categoría.</p>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-600">Despachos registrados</p>
            <h2 className="mt-1 text-lg font-black text-ink-950">SALIDAS RECIENTES</h2>
          </div>
          <span className="text-xs font-bold text-ink-800/40">Últimas {recentRows.length}</span>
        </div>
        <TableView {...props} rows={recentRows} />
      </section>
    </div>
  )
}

function OperationCountCard({ icon: Icon, label, value }: {
  readonly icon: typeof ShoppingBag
  readonly label: string
  readonly value: number
}) {
  return (
    <article className="rounded-xl border border-black/5 bg-white p-3 shadow-sm">
      <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon className="size-4" /></span>
      <p className="mt-3 text-2xl font-black leading-none text-ink-950">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-ink-800/45">{label}</p>
    </article>
  )
}

function OperationVolumeCard({ icon: Icon, label, metric }: {
  readonly icon: typeof TrendingUp
  readonly label: string
  readonly metric: PurchaseVolumeMetric | undefined
}) {
  return (
    <article className="min-w-0 rounded-xl border border-black/5 bg-white p-3 shadow-sm">
      <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon className="size-4" /></span>
      <p className="mt-2.5 break-words text-[13px] font-black leading-4 text-ink-950">{metric?.name ?? 'Sin datos'}</p>
      <p className="mt-1 text-lg font-black leading-tight text-brand-600">{metric ? metric.units.toLocaleString('es-MX') + ' unidades' : '—'}</p>
      <p className="mt-1 text-[9px] font-black uppercase leading-3 tracking-wide text-ink-800/45">{label}</p>
    </article>
  )
}

function LaboratoryDashboardView(props: CollectionViewProps) {
  const metrics = laboratoryDashboardMetrics(props.rows)
  const semaphoreCards = [
    { label: 'Urgentes', value: metrics.urgent, icon: CircleAlert, color: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500' },
    { label: 'Por vencer', value: metrics.dueSoon, icon: TimerReset, color: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
    { label: 'En tiempo', value: metrics.onTime, icon: Clock3, color: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    { label: 'Cerrados', value: metrics.closed, icon: CircleCheckBig, color: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  ] as const

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3">
        <LaboratoryStatusCard icon={Database} label="Equipos registrados" value={metrics.total} tone="neutral" />
        <LaboratoryStatusCard icon={CircleX} label="Dañados" value={metrics.damaged} tone="danger" />
        <LaboratoryStatusCard icon={CircleCheckBig} label="Funcionales" value={metrics.functional} tone="success" />
      </section>

      <section className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-600">Tiempos de atención</p>
          <h2 className="mt-1 text-lg font-black text-ink-950">SEMAFORIZACIÓN</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {semaphoreCards.map(({ color, dot, icon: Icon, label, value }) => (
            <article className={'rounded-2xl border p-4 ' + color} key={label}>
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-white/70"><Icon className="size-5" /></span>
                <span aria-hidden="true" className={'size-3 rounded-full shadow-sm ' + dot} />
              </div>
              <p className="mt-4 text-3xl font-black">{value}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-wide opacity-70">{label}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-600">Operación técnica</p>
            <h2 className="mt-1 text-lg font-black text-ink-950">EQUIPOS RECIENTES</h2>
          </div>
          <span className="text-xs font-bold text-ink-800/40">Últimos {Math.min(props.rows.length, 8)}</span>
        </div>
        <TableView {...props} rows={props.rows.slice(0, 8)} />
      </section>
    </div>
  )
}

function LaboratoryStatusCard({ icon: Icon, label, tone, value }: {
  readonly icon: typeof Database
  readonly label: string
  readonly tone: 'neutral' | 'danger' | 'success'
  readonly value: number
}) {
  const tones = {
    neutral: 'bg-brand-50 text-brand-600',
    danger: 'bg-red-50 text-red-600',
    success: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <span className={'grid size-12 shrink-0 place-items-center rounded-2xl ' + tones[tone]}><Icon className="size-5" /></span>
      <div><p className="text-3xl font-black leading-none text-ink-950">{value}</p><p className="mt-1.5 text-[11px] font-black uppercase tracking-wide text-ink-800/45">{label}</p></div>
    </article>
  )
}

function MatrixDeviceDashboardView(props: CollectionViewProps) {
  const { rows } = props
  const [breakdown, setBreakdown] = useState<MatrixBreakdownColumn>()
  const metrics = matrixDeviceMetrics(rows)
  const icons = [Database, Layers3, Tags, FileCheck2] as const
  const breakdowns: readonly (MatrixBreakdownColumn | undefined)[] = [undefined, 'Familia', 'Marca', undefined]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value }, index) => (
          <MatrixMetricCard
            icon={icons[index] ?? Database}
            key={label}
            label={label}
            onClick={breakdowns[index] ? () => setBreakdown(breakdowns[index]) : undefined}
            value={value}
          />
        ))}
      </div>
      <section>
        <h2 className="mb-4 text-lg font-black text-ink-950">Registros recientes</h2>
        <CardView {...props} rows={rows.slice(0, 6)} />
      </section>
      {breakdown && (
        <MatrixBreakdownDialog
          column={breakdown}
          onClose={() => setBreakdown(undefined)}
          rows={rows}
        />
      )}
    </div>
  )
}

function MatrixMetricCard({ icon: Icon, label, onClick, value }: {
  readonly icon: typeof Database
  readonly label: string
  readonly onClick: (() => void) | undefined
  readonly value: number
}) {
  const content = (
    <>
      <span className="grid size-11 place-items-center rounded-2xl bg-brand-100 text-brand-600"><Icon className="size-5" /></span>
      <p className="mt-5 text-3xl font-black text-ink-950">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-wide text-ink-800/45">{label}</p>
      {onClick && <ChevronRight className="absolute right-5 top-5 size-5 text-brand-600 transition group-hover:translate-x-0.5" />}
    </>
  )

  if (onClick) {
    return (
      <button
        aria-label={'Ver ' + label.toLocaleLowerCase('es-MX') + ' disponibles'}
        className="group relative rounded-3xl border border-black/5 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    )
  }

  return <article className="relative rounded-3xl border border-black/5 bg-white p-5 shadow-sm">{content}</article>
}

function MatrixBreakdownDialog({ column, onClose, rows }: {
  readonly column: MatrixBreakdownColumn
  readonly onClose: () => void
  readonly rows: CollectionViewProps['rows']
}) {
  const items = matrixDeviceBreakdown(rows, column)
  const maximum = Math.max(...items.map((item) => item.total), 1)
  const title = column === 'Familia' ? 'Familias disponibles' : 'Marcas disponibles'

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return createPortal(
    <div
      aria-label={title}
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
    >
      <section className="max-h-[86vh] w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-5 bg-ink-950 p-5 text-white sm:p-7">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400">Matriz de dispositivos</p>
            <h2 className="mt-2 text-2xl font-black">{title}</h2>
            <p className="mt-2 text-sm text-white/55">Distribución de los dispositivos registrados.</p>
          </div>
          <button aria-label="Cerrar desglose" className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-brand-500 hover:text-[#191919]" onClick={onClose} type="button">
            <X className="size-5" />
          </button>
        </header>

        <div className="max-h-[58vh] space-y-3 overflow-y-auto p-5 sm:p-7">
          {items.length === 0 && (
            <p className="rounded-2xl border border-dashed border-black/10 p-6 text-center text-sm font-semibold text-ink-800/45">No hay valores registrados todavía.</p>
          )}
          {items.map((item) => (
            <article className="rounded-2xl border border-black/5 bg-[#faf7f5] p-4" key={item.label}>
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-black text-ink-950">{item.label}</h3>
                <span className="shrink-0 rounded-full bg-brand-100 px-3 py-1 text-xs font-black text-brand-600">
                  {item.total} {item.total === 1 ? 'dispositivo' : 'dispositivos'}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5">
                <div className="h-full rounded-full bg-brand-500" style={{ width: Math.max((item.total / maximum) * 100, 6) + '%' }} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>,
    document.body,
  )
}

function CrmDashboardView(props: CollectionViewProps) {
  const { rows } = props
  const accounts = getCurrentCrmAccounts(rows)
  const activeCustomers = accounts.filter((account) => account.stage === 'Cliente')
  const prospects = accounts.filter((account) => account.stage === 'Prospecto')
  const recentRows = [...rows]
    .sort((left, right) => String(right.Fecha_contacto ?? '').localeCompare(String(left.Fecha_contacto ?? '')))
    .slice(0, 8)
  const attention = activeCustomers.filter((account) =>
    /REQUIERE ATENCION|RIESGO|PERDIDO/.test(normalizeCrmValue(account.latestRow.Estatus_cliente)),
  ).length

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CrmMetric icon={Database} label="Seguimientos" value={rows.length} />
        <CrmMetric icon={UserCheck} label="Clientes" value={activeCustomers.length} />
        <CrmMetric icon={UsersRound} label="Prospectos" value={prospects.length} />
        <CrmMetric icon={CircleAlert} label="Requieren atención" value={attention} />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-600">Actividad comercial</p>
            <h2 className="mt-1 text-lg font-black text-ink-950">SEGUIMIENTOS RECIENTES</h2>
          </div>
          <span className="text-xs font-bold text-ink-800/40">Últimos {recentRows.length}</span>
        </div>
        <TableView {...props} rows={recentRows} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CrmStatusChart column="Estatus_cliente" rows={activeCustomers.map((account) => account.latestRow)} title="ESTADO DE CLIENTES" />
        <CrmStatusChart column="Estatus_prospeccion" rows={prospects.map((account) => account.latestRow)} title="ESTADO DE PROSPECTOS" />
      </section>
    </div>
  )
}

function CrmMetric({ icon: Icon, label, value }: { readonly icon: typeof Database; readonly label: string; readonly value: number }) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-black/5 bg-white px-3 py-2.5 shadow-sm">
      <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon className="size-4" /></span>
      <div><p className="text-xl font-black leading-none text-ink-950">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-ink-800/40">{label}</p></div>
    </article>
  )
}

function CrmStatusChart({ column, rows, title }: { readonly column: string; readonly rows: CollectionViewProps['rows']; readonly title: string }) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const label = String(row[column] ?? '').trim()
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  const data = [...counts].map(([name, total]) => ({ name, total }))

  return (
    <article className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black text-ink-950">{title}</h2>
      <p className="mt-1 text-xs text-ink-800/45">Distribución de los seguimientos registrados.</p>
      {data.length > 0 ? (
        <div className="mt-3 h-[260px] w-full" role="img" aria-label={title}>
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={data} margin={{ bottom: 44, left: 0, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis angle={-24} dataKey="name" height={78} interval={0} textAnchor="end" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} width={34} />
              <Tooltip />
              <Bar dataKey="total" fill="#e77c60" name="Registros" radius={[7, 7, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-3 grid h-[260px] place-items-center rounded-xl border border-dashed border-black/10 bg-black/[0.015] text-sm font-semibold text-ink-800/40">Sin datos para graficar.</div>
      )}
    </article>
  )
}

function normalizeCrmValue(value: unknown): string {
  const text = Array.isArray(value)
    ? value.join(' ')
    : typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : ''
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}
