import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'

import type { CollectionViewProps } from '@/views/types'
import { CellDisplay } from '@/views/cell-display'
import { getListColumns, getRowTitle } from '@/views/view-utils'

export function TableView({ basePath, rows, table }: CollectionViewProps) {
  const columns = getListColumns(table, 7)

  if (rows.length === 0) return <EmptyCollection />

  return (
    <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="bg-ink-950 text-white">
            <tr>
              {columns.map((column) => (
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide" key={column.name}>
                  {column.label ?? column.name}
                </th>
              ))}
              <th className="w-14" />
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((row) => (
              <tr className="transition hover:bg-mint-50" key={String(row._uuid)}>
                {columns.map((column, index) => (
                  <td className={index === 0 ? 'px-4 py-4 text-sm font-black text-ink-950' : 'px-4 py-4 text-sm font-medium text-ink-800/75'} key={column.name}>
                    <CellDisplay column={column} value={row[column.name]} />
                  </td>
                ))}
                <td className="px-2">
                  <Link
                    aria-label={'Abrir ' + getRowTitle(table, row)}
                    className="grid min-h-11 min-w-11 place-items-center rounded-xl text-mint-600 hover:bg-mint-100"
                    to={basePath + '/' + encodeURIComponent(String(row._uuid))}
                  >
                    <ChevronRight className="size-5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EmptyCollection() {
  return (
    <div className="rounded-3xl border border-dashed border-black/15 bg-white/60 p-10 text-center">
      <p className="font-black text-ink-950">Aún no hay registros</p>
      <p className="mt-2 text-sm text-ink-800/55">Crea el primero con el botón superior.</p>
    </div>
  )
}
