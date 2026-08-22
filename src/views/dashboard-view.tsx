import { Activity, Columns3, Database, Gauge } from 'lucide-react'

import type { CollectionViewProps } from '@/views/types'
import { CardView } from '@/views/card-view'

export function DashboardView(props: CollectionViewProps) {
  const { rows, table } = props
  const filled = rows.reduce((total, row) => total + table.columns.filter((column) => row[column.name] !== undefined && row[column.name] !== '').length, 0)
  const possible = Math.max(rows.length * table.columns.length, 1)
  const completeness = Math.round((filled / possible) * 100)

  const metrics = [
    { label: 'Registros', value: rows.length, icon: Database },
    { label: 'Campos', value: table.columns.length, icon: Columns3 },
    { label: 'Completitud', value: completeness + '%', icon: Gauge },
    { label: 'Estado', value: 'Activo', icon: Activity },
  ] as const

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
