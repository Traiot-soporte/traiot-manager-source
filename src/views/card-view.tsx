import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'

import type { CollectionViewProps } from '@/views/types'
import { CellDisplay } from '@/views/cell-display'
import { getListColumns, getRowTitle } from '@/views/view-utils'

export function CardView({ basePath, rows, table }: CollectionViewProps) {
  const columns = getListColumns(table, 4)

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {rows.map((row) => (
        <article className="group rounded-3xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg" key={String(row._uuid)}>
          <div className="flex items-start justify-between gap-4 border-b border-black/5 pb-4">
            <h2 className="text-lg font-black text-ink-950">{getRowTitle(table, row)}</h2>
            <Link
              aria-label={'Abrir ' + getRowTitle(table, row)}
              className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-brand-100 text-brand-600 group-hover:bg-ink-950 group-hover:text-white"
              to={basePath + '/' + encodeURIComponent(String(row._uuid))}
            >
              <ArrowUpRight className="size-5" />
            </Link>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {columns.map((column) => (
              <div key={column.name}>
                <dt className="text-[11px] font-black uppercase tracking-wide text-ink-800/40">{column.label ?? column.name}</dt>
                <dd className="mt-1 break-words text-sm font-semibold text-ink-800"><CellDisplay column={column} value={row[column.name]} /></dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  )
}
