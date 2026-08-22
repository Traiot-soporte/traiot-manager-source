import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Database, Layers3, WifiOff } from 'lucide-react'
import { Link } from 'react-router'

import { TableIcon } from '@/components/table-icon'
import { useRepository } from '@/data/use-repository'
import { getTableDefinition } from '@/schema'

const moduleOrder = [
  'Operación',
  'Inventario',
  'Ventas',
  'CRM',
  'Soporte',
  'Laboratorio',
  'Catálogo técnico',
  'Administración',
] as const

export function DashboardPage() {
  const repository = useRepository()
  const summaries = useQuery({
    queryKey: ['table-summaries'],
    queryFn: () => repository.getSummaries(),
  })

  const visibleSummaries = (summaries.data ?? []).filter(
    (summary) => !summary.name.startsWith('instalacion_'),
  )
  const totalRows = (summaries.data ?? []).reduce((total, summary) => total + summary.rowCount, 0)

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-ink-950 px-6 py-8 text-white sm:px-10 sm:py-10">
        <div className="absolute -right-16 -top-20 size-64 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-400">
            Operación GPS · IoT
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            Todo tu negocio, listo para trabajar sin señal.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
            Esta vista utiliza un repositorio simulado. No hay servidor local ni conexión a Google
            Sheets durante la Fase 2.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <Metric icon={Layers3} label="Tablas definidas" value="16" />
            <Metric icon={Database} label="Filas demo" value={String(totalRows)} />
            <Metric icon={WifiOff} label="Backend" value="Apps Script · Fase 3" />
          </div>
        </div>
      </section>

      {summaries.isPending && (
        <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm text-ink-800/60">
          Preparando los datos de demostración…
        </div>
      )}

      {moduleOrder.map((moduleName) => {
        const moduleTables = visibleSummaries.filter((summary) => summary.module === moduleName)
        if (moduleTables.length === 0) {
          return null
        }

        return (
          <section key={moduleName}>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-600">
                  Módulo
                </p>
                <h2 className="mt-1 text-2xl font-black text-ink-950">{moduleName}</h2>
              </div>
              <span className="text-xs font-bold text-ink-800/45">
                {moduleTables.length} {moduleTables.length === 1 ? 'tabla' : 'tablas'}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {moduleTables.map((summary) => {
                const table = getTableDefinition(summary.name)
                const fieldCount =
                  table?.columns.filter((column) => column.origin !== 'system').length ?? 0

                return (
                  <Link
                    className="group min-h-44 rounded-3xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-ink-950/8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
                    key={summary.name}
                    to={'/tablas/' + encodeURIComponent(summary.name)}
                  >
                    <div className="flex items-start justify-between">
                      <span className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-600">
                        <TableIcon className="size-6" name={summary.icon} />
                      </span>
                      <ArrowRight className="size-5 text-ink-800/25 transition group-hover:translate-x-1 group-hover:text-brand-600" />
                    </div>
                    <h3 className="mt-5 text-lg font-black text-ink-950">{summary.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink-800/55">
                      {summary.description}
                    </p>
                    <div className="mt-4 flex gap-2 text-[11px] font-bold text-ink-800/50">
                      <span>{summary.rowCount} registros demo</span>
                      <span>·</span>
                      <span>{fieldCount} campos</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

interface MetricProps {
  readonly icon: typeof Layers3
  readonly label: string
  readonly value: string
}

function Metric({ icon: Icon, label, value }: MetricProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <Icon className="size-5 text-brand-400" />
      <p className="mt-3 text-xs font-bold text-white/45">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  )
}
