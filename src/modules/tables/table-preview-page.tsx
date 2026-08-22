import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Braces, Rows3 } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { TableIcon } from '@/components/table-icon'
import { useRepository } from '@/data/use-repository'
import { formatCell } from '@/lib/format'
import { getTableDefinition } from '@/schema'
import type { RowData, TableDef } from '@/schema'

export function TablePreviewPage() {
  const { tableName = '' } = useParams()
  const table = getTableDefinition(tableName)
  const repository = useRepository()
  const rows = useQuery({
    queryKey: ['table', tableName],
    queryFn: () => repository.list(tableName),
    enabled: Boolean(table),
  })

  if (!table) {
    return (
      <section className="rounded-3xl bg-white p-8">
        <h1 className="text-2xl font-black text-ink-950">Tabla no encontrada</h1>
        <Link className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-mint-600" to="/">
          Volver al resumen
        </Link>
      </section>
    )
  }

  const displayColumns = table.columns
    .filter(
      (column) =>
        column.origin !== 'system' &&
        !column.hidden &&
        !column.virtual &&
        !['Image', 'Signature', 'Show', 'List'].includes(column.type),
    )
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-ink-800/60 hover:text-mint-600"
        to="/"
      >
        <ArrowLeft className="size-4" />
        Volver al resumen
      </Link>

      <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
        <div className="border-b border-black/5 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ink-950 text-mint-400">
                <TableIcon className="size-7" name={table.icon} />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-mint-600">
                  {table.module}
                </p>
                <h1 className="mt-1 text-2xl font-black text-ink-950 sm:text-3xl">
                  {table.name}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-800/55">
                  {table.description}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <MetadataPill icon={Rows3} label={(rows.data?.length ?? 0) + ' registros'} />
              <MetadataPill icon={Braces} label={table.columns.length + ' campos'} />
            </div>
          </div>
        </div>

        <div className="bg-mint-50 px-6 py-3 text-xs font-bold text-mint-600 sm:px-8">
          Vista previa del MockRepository · edición disponible en la Fase 2
        </div>
      </section>

      {rows.isPending && (
        <div className="rounded-3xl bg-white p-6 text-sm text-ink-800/55">
          Cargando datos de demostración…
        </div>
      )}

      {rows.isError && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-800">
          No fue posible leer los datos simulados.
        </div>
      )}

      {rows.data?.length === 0 && (
        <div className="rounded-3xl border border-dashed border-black/15 bg-white/50 p-10 text-center">
          <p className="text-base font-black text-ink-950">Sin registros de demostración</p>
          <p className="mt-2 text-sm text-ink-800/50">
            La tabla ya forma parte del esquema y está lista para recibir datos.
          </p>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {rows.data?.map((row) => (
          <RecordCard columns={displayColumns} key={String(row._uuid)} row={row} table={table} />
        ))}
      </div>
    </div>
  )
}

interface MetadataPillProps {
  readonly icon: typeof Rows3
  readonly label: string
}

function MetadataPill({ icon: Icon, label }: MetadataPillProps) {
  return (
    <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 px-3 text-xs font-bold text-ink-800/60">
      <Icon className="size-4" />
      {label}
    </span>
  )
}

interface RecordCardProps {
  readonly columns: TableDef['columns']
  readonly row: RowData
  readonly table: TableDef
}

function RecordCard({ columns, row, table }: RecordCardProps) {
  const title = row[table.label] ?? row[table.legacyBusinessKey ?? ''] ?? row._uuid

  return (
    <article className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-4">
        <h2 className="truncate text-base font-black text-ink-950">{String(title ?? 'Registro')}</h2>
        <span className="rounded-full bg-mint-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-mint-600">
          Sincronizado
        </span>
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {columns.map((column) => (
          <div key={column.name}>
            <dt className="text-[11px] font-black uppercase tracking-wide text-ink-800/40">
              {column.label ?? column.name}
            </dt>
            <dd className="mt-1 break-words text-sm font-semibold text-ink-800">
              {formatCell(row[column.name], column.type)}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
