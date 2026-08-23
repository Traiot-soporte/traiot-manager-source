import { Activity, ChevronRight, CircleAlert, Columns3, Database, FileCheck2, Gauge, Layers3, Tags, UserCheck, UsersRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { CollectionViewProps } from '@/views/types'
import { CardView } from '@/views/card-view'
import { matrixDeviceBreakdown, matrixDeviceMetrics, type MatrixBreakdownColumn } from '@/views/dashboard-metrics'
import { TableView } from '@/views/table-view'

export function DashboardView(props: CollectionViewProps) {
  if (props.table.name === 'Gestion Clientes') {
    return <CrmDashboardView {...props} />
  }
  if (props.table.name === 'MATRIZ DISPOSITIVOS') {
    return <MatrixDeviceDashboardView {...props} />
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
  const recentRows = [...rows]
    .sort((left, right) => String(right.Fecha_contacto ?? '').localeCompare(String(left.Fecha_contacto ?? '')))
    .slice(0, 8)
  const activeCustomers = rows.filter((row) => normalizeCrmValue(row.Tipo_cliente).includes('ACTIVO')).length
  const prospects = rows.filter((row) => normalizeCrmValue(row.Tipo_cliente).includes('PROSPECTO')).length
  const attention = rows.filter((row) => /REQUIERE ATENCION|RIESGO|PERDIDO/.test(normalizeCrmValue(row.Estatus_cliente))).length

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CrmMetric icon={Database} label="Seguimientos" value={rows.length} />
        <CrmMetric icon={UserCheck} label="Clientes" value={activeCustomers} />
        <CrmMetric icon={UsersRound} label="Prospectos" value={prospects} />
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
        <CrmStatusChart column="Estatus_cliente" rows={rows} title="ESTADO DE CLIENTES" />
        <CrmStatusChart column="Estatus_prospeccion" rows={rows} title="ESTADO DE PROSPECTOS" />
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
