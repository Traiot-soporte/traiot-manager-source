import { ChevronRight, Trash2 } from 'lucide-react'
import { Link } from 'react-router'

import type { CollectionViewProps } from '@/views/types'
import { CellDisplay } from '@/views/cell-display'
import { RowCommunicationScheduler } from '@/views/row-communication-scheduler'
import { useClientDeletion } from '@/views/use-client-deletion'
import { getRowTitle, getTableViewColumns } from '@/views/view-utils'

export function TableView({ basePath, rows, table }: CollectionViewProps) {
  const columns = getTableViewColumns(table)
  const deletion = useClientDeletion(table.name)
  const communicationsAvailable = table.name === 'CLIENTES' || table.name === 'Gestion Clientes'
  const tableClassName = table.name === 'Gestion Clientes'
    ? 'w-full min-w-[3400px] border-separate border-spacing-0 text-left'
    : communicationsAvailable
    ? 'w-full min-w-[920px] table-fixed border-separate border-spacing-0 text-left'
    : table.name === 'ALMACEN'
      ? 'w-full min-w-[1240px] border-separate border-spacing-0 text-left'
      : 'w-full min-w-[760px] border-separate border-spacing-0 text-left'

  if (rows.length === 0) return <EmptyCollection />

  return (
    <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
      <div className="relative overflow-auto lg:max-h-[calc(100vh-16.5rem)]">
        <table className={tableClassName}>
          <thead className="sticky top-0 z-30 bg-ink-950 text-white shadow-[0_5px_12px_-8px_rgba(0,0,0,0.85)]">
            <tr>
              {columns.map((column) => (
                <th className="bg-ink-950 px-4 py-3 text-xs font-black uppercase tracking-wide" key={column.name}>
                  {column.label ?? column.name}
                </th>
              ))}
              <th className={(deletion.available ? 'w-36' : communicationsAvailable ? 'w-24' : 'w-14') + ' sticky right-0 z-40 bg-ink-950'}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((row) => (
              <tr className="transition hover:bg-brand-50" key={String(row._uuid)}>
                {columns.map((column, index) => (
                  <td className={index === 0 ? 'min-w-0 break-words px-3 py-4 text-sm font-black text-ink-950' : 'min-w-0 break-words px-3 py-4 text-sm font-medium text-ink-800/75'} key={column.name}>
                    <CellDisplay column={column} table={table.name} value={row[column.name]} />
                  </td>
                ))}
                <td className="sticky right-0 bg-white px-2 py-2 shadow-[-8px_0_16px_-16px_rgba(0,0,0,0.45)]">
                  <div className="flex items-center justify-end gap-1">
                    {communicationsAvailable && <RowCommunicationScheduler row={row} table={table} />}
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
