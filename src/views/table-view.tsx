import { ChevronRight, Trash2 } from 'lucide-react'
import { Link } from 'react-router'

import type { CollectionViewProps } from '@/views/types'
import { CellDisplay } from '@/views/cell-display'
import { useClientDeletion } from '@/views/use-client-deletion'
import { getListColumns, getRowTitle } from '@/views/view-utils'

export function TableView({ basePath, rows, table }: CollectionViewProps) {
  const columns = getListColumns(table, 7)
  const deletion = useClientDeletion(table.name)

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
              <th className={deletion.available ? 'w-24' : 'w-14'}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((row) => (
              <tr className="transition hover:bg-brand-50" key={String(row._uuid)}>
                {columns.map((column, index) => (
                  <td className={index === 0 ? 'px-4 py-4 text-sm font-black text-ink-950' : 'px-4 py-4 text-sm font-medium text-ink-800/75'} key={column.name}>
                    <CellDisplay column={column} table={table.name} value={row[column.name]} />
                  </td>
                ))}
                <td className="px-2 py-2">
                  <div className="flex items-center justify-end gap-1">
                    {deletion.available && (
                      <button
                        aria-label={'Eliminar ' + getRowTitle(table, row)}
                        className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-transparent text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
                        disabled={deletion.pendingFor(String(row._uuid))}
                        onClick={() => deletion.request(
                          String(row._uuid),
                          String(row['RAZON SOCIAL'] ?? getRowTitle(table, row)),
                        )}
                        title={deletion.errorFor(String(row._uuid)) ? 'No fue posible eliminar. Intenta nuevamente.' : 'Eliminar contacto'}
                        type="button"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                    <Link
                      aria-label={'Abrir ' + getRowTitle(table, row)}
                      className="grid min-h-11 min-w-11 place-items-center rounded-xl text-brand-600 hover:bg-brand-100"
                      to={basePath + '/' + encodeURIComponent(String(row._uuid))}
                    >
                      <ChevronRight className="size-5" />
                    </Link>
                  </div>
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
