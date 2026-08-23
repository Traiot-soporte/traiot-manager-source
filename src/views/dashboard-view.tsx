import { Activity, CircleAlert, Columns3, Database, FileCheck2, Gauge, Layers3, Tags, UserCheck, UsersRound } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { CollectionViewProps } from '@/views/types'
import { CardView } from '@/views/card-view'
import { matrixDeviceMetrics } from '@/views/dashboard-metrics'
import { TableView } from '@/views/table-view'

export function DashboardView(props: CollectionViewProps) {
  if (props.table.name === 'Gestion Clientes') {
    return <CrmDashboardView {...props} />
  }

  const { rows, table } = props
  const filled = rows.reduce((total, row) => total + table.columns.filter((column) => row[column.name] !== undefined && row[column.name] !== '').length, 0)
  const possible = Math.max(rows.length * table.columns.length, 1)
  const completeness = Math.round((filled / possible) * 100)

  const metrics = table.name === 'MATRIZ DISPOSITIVOS'
    ? matrixDeviceMetrics(rows).map((metric, index) => ({
        ...metric,
        icon: [Database, Layers3, Tags, FileCheck2][index] ?? Database,
      }))
    : [
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
