import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { CollectionViewProps } from '@/views/types'

export function ChartView({ rows, table }: CollectionViewProps) {
  const groupColumn =
    table.columns.find((column) => column.type === 'Enum' && /ESTATUS|STATUS|TIPO/i.test(column.name)) ??
    table.columns.find((column) => column.type === 'Enum') ??
    table.columns.find((column) => column.type === 'Text' && /ESTATUS|STATUS|TIPO/i.test(column.name))

  if (!groupColumn) {
    return <div className="rounded-3xl border border-dashed border-black/15 bg-white/60 p-10 text-center text-sm font-semibold text-ink-800/55">No hay una categoría apropiada para graficar esta tabla.</div>
  }

  const counts = new Map<string, number>()
  for (const row of rows) {
    const label = String(row[groupColumn.name] ?? 'Sin valor')
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  const data = [...counts].map(([name, total]) => ({ name, total }))

  return (
    <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="font-black text-ink-950">Registros por {groupColumn.label ?? groupColumn.name}</h2>
      <p className="mt-1 text-sm text-ink-800/50">Distribución de los {rows.length} registros visibles.</p>
      <div className="mt-6 h-[360px] w-full" role="img" aria-label={'Gráfica por ' + (groupColumn.label ?? groupColumn.name)}>
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data} margin={{ bottom: 36, left: 0, right: 12, top: 12 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis angle={-20} dataKey="name" height={70} interval={0} textAnchor="end" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} width={36} />
            <Tooltip />
            <Bar dataKey="total" fill="#1aae82" name="Registros" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
