import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, ImageOff } from 'lucide-react'
import { Link } from 'react-router'

import { useRepository } from '@/data/use-repository'
import type { CellValue } from '@/schema'
import type { CollectionViewProps } from '@/views/types'
import { CellDisplay } from '@/views/cell-display'
import { getListColumns, getRowTitle } from '@/views/view-utils'

export function CardView({ basePath, rows, table }: CollectionViewProps) {
  const coverColumn = table.name === 'MATRIZ DISPOSITIVOS'
    ? table.columns.find((column) => column.name === 'Imagen' && column.type === 'Image')
    : undefined
  const columns = getListColumns(table, coverColumn ? 5 : 4)
    .filter((column) => !coverColumn || column.name !== table.label)
    .slice(0, 4)

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {rows.map((row) => (
        <article className="group overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg" key={String(row._uuid)}>
          {coverColumn && (
            <Link
              aria-label={'Abrir ' + getRowTitle(table, row)}
              className="block border-b border-black/5 bg-gradient-to-br from-brand-50 via-white to-brand-100/50"
              to={basePath + '/' + encodeURIComponent(String(row._uuid))}
            >
              <CardCover
                alt={getRowTitle(table, row)}
                table={table.name}
                value={row[coverColumn.name]}
              />
            </Link>
          )}
          <div className="p-5">
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
                  <dd className="mt-1 break-words text-sm font-semibold text-ink-800"><CellDisplay column={column} table={table.name} value={row[column.name]} /></dd>
                </div>
              ))}
            </dl>
          </div>
        </article>
      ))}
    </div>
  )
}

function CardCover({ alt, table, value }: {
  readonly alt: string
  readonly table: string
  readonly value: CellValue | undefined
}) {
  const repository = useRepository()
  const storedValue = typeof value === 'string' ? value : ''
  const media = useQuery({
    queryKey: ['media', table, 'card-cover', storedValue],
    queryFn: () => repository.getMedia(table, storedValue),
    enabled: Boolean(storedValue),
  })

  if (storedValue && media.data) {
    return (
      <img
        alt={alt}
        className="h-52 w-full object-contain p-5 transition duration-300 group-hover:scale-[1.03] sm:h-60"
        loading="lazy"
        src={media.data}
      />
    )
  }

  return (
    <div className="grid h-52 place-items-center text-ink-800/30 sm:h-60">
      <div className="text-center">
        <ImageOff aria-hidden="true" className="mx-auto size-9" />
        <p className="mt-2 text-xs font-bold">{media.isPending ? 'Cargando imagen…' : 'Sin imagen'}</p>
      </div>
    </div>
  )
}
