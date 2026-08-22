import type { RowData, TableDef } from '@/schema'
import { CellDisplay } from '@/views/cell-display'
import { getDisplayColumns } from '@/views/view-utils'

interface DetailViewProps {
  readonly row: RowData
  readonly table: TableDef
}

export function DetailView({ row, table }: DetailViewProps) {
  const columns = getDisplayColumns(table)
  const sections = [...new Set(columns.map((column) => column.section ?? 'Información general'))]

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-7" key={section}>
          <h2 className="text-lg font-black text-ink-950">{section}</h2>
          <dl className="mt-5 grid gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
            {columns.filter((column) => (column.section ?? 'Información general') === section).map((column) => (
              <div className={column.type === 'LongText' || column.type === 'Image' || column.type === 'Signature' ? 'md:col-span-2 xl:col-span-3' : undefined} key={column.name}>
                <dt className="text-[11px] font-black uppercase tracking-wide text-ink-800/40">{column.label ?? column.name}</dt>
                <dd className="mt-1 break-words text-sm font-semibold text-ink-800"><CellDisplay column={column} table={table.name} value={row[column.name]} /></dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}
