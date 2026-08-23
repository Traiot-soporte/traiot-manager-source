import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Cloud, Database, Layers3, WifiOff } from 'lucide-react'
import { Link } from 'react-router'

import { ModuleHeader } from '@/components/module-header'
import { TableIcon } from '@/components/table-icon'
import { useRepository } from '@/data/use-repository'
import { getTableDefinition, getTableDisplayName } from '@/schema'

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
  const connected = repository.source === 'apps-script'
  const summaries = useQuery({
    queryKey: ['table-summaries'],
    queryFn: () => repository.getSummaries(),
  })

  const visibleSummaries = (summaries.data ?? []).filter(
    (summary) => !summary.name.startsWith('instalacion_'),
  )
  const totalRows = (summaries.data ?? []).reduce((total, summary) => total + summary.rowCount, 0)
  const moduleCount = new Set(visibleSummaries.map((summary) => summary.module)).size

  return (
    <div className="space-y-6">
      <ModuleHeader
        description={connected
          ? 'Control integral de inventario, instalaciones, clientes y soporte.'
          : 'Vista de demostración del centro de operación.'}
        eyebrow="Operación GPS · IoT"
        icon={<Layers3 className="size-5" />}
        title="RESUMEN"
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric icon={Layers3} label="Módulos disponibles" value={String(moduleCount)} />
        <Metric icon={Database} label="Registros totales" value={String(totalRows)} />
        <Metric icon={connected ? Cloud : WifiOff} label="Estado del servicio" value={connected ? 'Conectado' : 'Desconectado'} />
      </section>

      {summaries.isPending && (
        <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm text-ink-800/60">
          Preparando la información…
        </div>
      )}

      {moduleOrder.map((moduleName) => {
        const moduleTables = visibleSummaries.filter((summary) => summary.module === moduleName)
        const moduleRecords = moduleTables.reduce((total, summary) => total + summary.rowCount, 0)
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
                {moduleRecords} {moduleRecords === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {moduleTables.map((summary) => {
                const table = getTableDefinition(summary.name)

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
                    <h3 className="mt-5 text-lg font-black text-ink-950">{table ? getTableDisplayName(table) : summary.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink-800/55">
                      {summary.description}
                    </p>
                    <div className="mt-4 text-[11px] font-bold text-ink-800/50">
                      {summary.rowCount} {summary.rowCount === 1 ? 'registro' : 'registros'}
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
    <div className="flex items-center gap-3 rounded-xl border border-black/5 bg-white px-3 py-2.5 shadow-sm">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon className="size-4" /></span>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-ink-950">{value}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-ink-800/40">{label}</p>
      </div>
    </div>
  )
}
