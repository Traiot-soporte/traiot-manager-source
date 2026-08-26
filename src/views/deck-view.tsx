import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'

import type { CollectionViewProps } from '@/views/types'
import { CellDisplay } from '@/views/cell-display'
import { RowCommunicationScheduler } from '@/views/row-communication-scheduler'
import {
  crmContactPreviewColumnNames,
  getListColumns,
  getNamedListColumns,
  getRowTitle,
  supplierPreviewColumnNames,
  warehouseDeckColumnNames,
} from '@/views/view-utils'

export function DeckView({ basePath, rows, table }: CollectionViewProps) {
  const columns = table.name === 'ALMACEN'
    ? getNamedListColumns(table, warehouseDeckColumnNames)
    : table.name === 'PROVEEDORES'
      ? getNamedListColumns(table, supplierPreviewColumnNames)
      : table.name === 'Gestion Clientes'
        ? getNamedListColumns(table, crmContactPreviewColumnNames)
          .filter((column) => column.name !== table.label)
      : getListColumns(table, 3)

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <article
          className="flex min-h-24 items-center gap-4 rounded-3xl border border-black/5 bg-white p-4 shadow-sm transition hover:border-brand-400 hover:shadow-md sm:p-5"
          key={String(row._uuid)}
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ink-950 text-lg font-black text-brand-400">
            {getRowTitle(table, row).slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-black text-ink-950">{getRowTitle(table, row)}</span>
            <span className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-ink-800/55">
              {columns.map((column) => (
                <span key={column.name}><span className="font-black uppercase">{column.label ?? column.name}:</span> <CellDisplay column={column} table={table.name} value={row[column.name]} /></span>
              ))}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {table.name === 'Gestion Clientes' && <RowCommunicationScheduler row={row} table={table} />}
            <Link
              aria-label={'Abrir ' + getRowTitle(table, row)}
              className="grid min-h-11 min-w-11 place-items-center rounded-xl text-brand-600 transition hover:bg-brand-100"
              to={basePath + '/' + encodeURIComponent(String(row._uuid))}
            >
              <ChevronRight className="size-5" />
            </Link>
          </span>
        </article>
      ))}
    </div>
  )
}
