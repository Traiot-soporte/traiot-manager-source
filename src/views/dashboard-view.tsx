import { Activity, Building2, ChevronRight, CircleAlert, CircleCheckBig, CircleX, Clock3, Columns3, Database, FileCheck2, Gauge, Layers3, PackageMinus, ShoppingBag, Smartphone, Tags, TimerReset, TrendingDown, TrendingUp, UserCheck, UsersRound, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'

import type { CollectionViewProps } from '@/views/types'
import { useRepository } from '@/data/use-repository'
import { CardView } from '@/views/card-view'
import { matrixDeviceBreakdown, matrixDeviceMetrics, type MatrixBreakdownColumn } from '@/views/dashboard-metrics'
import { laboratoryDashboardMetrics } from '@/views/laboratory-dashboard'
import { kardexDashboardMetrics } from '@/views/kardex-dashboard'
import { outboundDashboardMetrics } from '@/views/outbound-dashboard'
import { purchaseDashboardMetrics, type PurchaseVolumeMetric } from '@/views/purchase-dashboard'
import { supplierDashboardMetrics } from '@/views/supplier-dashboard'
import { TableView } from '@/views/table-view'
import { warehouseDashboardMetrics, type WarehouseStockAlert, type WarehouseStockAlertKind } from '@/views/warehouse-dashboard'

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
  if (props.table.name === 'KARDEX') {
    return <KardexDashboardView {...props} />
  }
  if (props.table.name === 'PROVEEDORES') {
    return <SupplierDashboardView {...props} />
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

function KardexDashboardView(props: CollectionViewProps) {
  const metrics = kardexDashboardMetrics(props.rows)
  const recentRows = [...props.rows]
    .sort((left, right) => String(right.FECHA ?? '').localeCompare(String(left.FECHA ?? '')))
    .slice(0, 8)

  return (
    <div className="space-y-5">
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <OperationCountCard icon={Database} label="Movimientos" value={metrics.movements} />
        <OperationCountCard icon={TrendingUp} label="Unidades de entrada" value={metrics.incomingUnits} />
        <OperationCountCard icon={PackageMinus} label="Unidades de salida" value={metrics.outgoingUnits} />
        <OperationCountCard icon={Layers3} label="Productos con movimiento" value={metrics.movedProducts} />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-600">Trazabilidad de inventario</p>
            <h2 className="mt-1 text-lg font-black text-ink-950">MOVIMIENTOS RECIENTES</h2>
          </div>
          <span className="text-xs font-bold text-ink-800/40">Últimos {recentRows.length}</span>
        </div>
        <TableView {...props} rows={recentRows} />
      </section>
    </div>
  )
}

function SupplierDashboardView(props: CollectionViewProps) {
  const metrics = supplierDashboardMetrics(props.rows)
  const recentRows = [...props.rows]
    .sort((left, right) => Number(right.ID ?? 0) - Number(left.ID ?? 0))
    .slice(0, 6)

  return (
    <div className="space-y-5">
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <OperationCountCard icon={UsersRound} label="Proveedores" value={metrics.suppliers} />
        <OperationCountCard icon={Tags} label="Países" value={metrics.countries} />
        <OperationCountCard icon={Layers3} label="Ciudades" value={metrics.cities} />
        <OperationCountCard icon={UserCheck} label="Con correo" value={metrics.withEmail} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-black text-ink-950">PROVEEDORES RECIENTES</h2>
        <CardView {...props} rows={recentRows} />
      </section>
    </div>
  )
}

function WarehouseDashboardView(props: CollectionViewProps) {
  const metrics = warehouseDashboardMetrics(props.rows)
  const [selectedAlert, setSelectedAlert] = useState<WarehouseStockAlertKind>()

  return (
    <div className="space-y-5">
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <OperationCountCard icon={Database} label="Registros" value={metrics.products} />
        <OperationVolumeCard icon={Gauge} label="GPS con más existencia" metric={metrics.categories.GPS} />
        <OperationVolumeCard icon={Activity} label="Sensor con más existencia" metric={metrics.categories.SENSOR} />
        <OperationVolumeCard icon={Layers3} label="Accesorio con más existencia" metric={metrics.categories.ACCESORIO} />
        <OperationVolumeCard icon={FileCheck2} label="CCTV con más existencia" metric={metrics.categories.CCTV} />
        <WarehouseAlertCard
          label="Reabastecer"
          onClick={() => setSelectedAlert('REABASTECER')}
          tone="danger"
          value={metrics.alerts.REABASTECER.length}
        />
        <WarehouseAlertCard
          label="Sobrestock"
          onClick={() => setSelectedAlert('SOBRESTOCK')}
          tone="info"
          value={metrics.alerts.SOBRESTOCK.length}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-black text-ink-950">PRODUCTOS RECIENTES</h2>
        <CardView {...props} rows={props.rows.slice(0, 6)} />
      </section>

      {selectedAlert && (
        <WarehouseAlertDialog
          basePath={props.basePath}
          items={metrics.alerts[selectedAlert]}
          kind={selectedAlert}
          onClose={() => setSelectedAlert(undefined)}
        />
      )}
    </div>
  )
}

function WarehouseAlertCard({ label, onClick, tone, value }: {
  readonly label: string
  readonly onClick: () => void
  readonly tone: 'danger' | 'info'
  readonly value: number
}) {
  const styles = tone === 'danger'
    ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-400 focus-visible:outline-red-600'
    : 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 focus-visible:outline-blue-600'

  return (
    <button
      aria-label={'Ver productos en estado ' + label}
      className={'group relative rounded-xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 ' + styles}
      onClick={onClick}
      type="button"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-white/75"><CircleAlert className="size-4" /></span>
      <p className="mt-3 text-2xl font-black leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wide opacity-75">{label}</p>
      <ChevronRight className="absolute right-3 top-3 size-4 transition group-hover:translate-x-0.5" />
    </button>
  )
}

function WarehouseAlertDialog({ basePath, items, kind, onClose }: {
  readonly basePath: string
  readonly items: readonly WarehouseStockAlert[]
  readonly kind: WarehouseStockAlertKind
  readonly onClose: () => void
}) {
  const replenish = kind === 'REABASTECER'
  const title = replenish ? 'Productos por reabastecer' : 'Productos con sobrestock'

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
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
      className="fixed inset-0 z-[100] grid place-items-center bg-ink-950/65 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
      role="dialog"
    >
      <section className="flex max-h-[min(760px,90vh)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 bg-ink-950 px-6 py-5 text-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-300">Estado del inventario</p>
            <h2 className="mt-1 text-2xl font-black">{title}</h2>
            <p className="mt-1 text-sm text-white/60">{items.length} {items.length === 1 ? 'producto' : 'productos'}</p>
          </div>
          <button
            aria-label="Cerrar detalle"
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/15 text-white transition hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-6">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-950/15 p-8 text-center">
              <CircleCheckBig className="mx-auto size-9 text-emerald-600" />
              <p className="mt-3 font-black text-ink-950">No hay productos en este estado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Link
                  className="group grid gap-3 rounded-2xl border border-ink-950/10 p-4 transition hover:border-brand-300 hover:bg-brand-50 sm:grid-cols-[1fr_auto] sm:items-center"
                  key={item.rowUuid || item.productId}
                  onClick={onClose}
                  to={basePath + '/' + encodeURIComponent(item.rowUuid)}
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-ink-950">{item.productId || item.name}</p>
                    <p className="mt-0.5 truncate text-sm text-ink-800/65">{item.name}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-ink-800/40">{item.category}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:text-right">
                    <div>
                      <p className={'text-xl font-black ' + (replenish ? 'text-red-700' : 'text-blue-700')}>{item.stock}</p>
                      <p className="text-[10px] font-black uppercase text-ink-800/40">
                        {replenish ? 'Mínimo ' + item.minimum : 'Máximo ' + item.maximum}
                      </p>
                    </div>
                    <ChevronRight className="size-5 text-brand-600 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
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
  const companies = new Set(rows.map((row) => String(row.NOMBRE_EMPRESA ?? '').trim()).filter(Boolean))
  const responsibles = new Set(rows.flatMap((row) => {
    const value = row.Responsable
    return (Array.isArray(value) ? value : String(value ?? '').split(','))
      .map((responsible) => String(responsible).trim())
      .filter(Boolean)
  }))
  const withPhone = rows.filter((row) => String(row.Móvil ?? row['Teléfono del trabajo'] ?? '').trim()).length
  const recentRows = [...rows]
    .sort((left, right) => String(right.Modificado ?? right._updatedAt ?? '').localeCompare(String(left.Modificado ?? left._updatedAt ?? '')))
    .slice(0, 8)

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CrmMetric icon={UsersRound} label="Contactos" value={rows.length} />
        <CrmMetric icon={Building2} label="Compañías" value={companies.size} />
        <CrmMetric icon={UserCheck} label="Responsables" value={responsibles.size} />
        <CrmMetric icon={Smartphone} label="Con teléfono" value={withPhone} />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-600">Directorio comercial</p>
            <h2 className="mt-1 text-lg font-black text-ink-950">CONTACTOS RECIENTES</h2>
          </div>
          <span className="text-xs font-bold text-ink-800/40">Últimos {recentRows.length}</span>
        </div>
        <TableView {...props} rows={recentRows} />
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
