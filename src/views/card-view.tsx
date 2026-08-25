import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, ExternalLink, ImageOff, Trash2 } from 'lucide-react'
import { Link } from 'react-router'

import { useRepository } from '@/data/use-repository'
import { useNearViewport } from '@/lib/use-near-viewport'
import type { CellValue } from '@/schema'
import { CellDisplay } from '@/views/cell-display'
import type { CollectionViewProps } from '@/views/types'
import { useClientDeletion } from '@/views/use-client-deletion'
import { safeExternalUrl } from '@/views/url-utils'
import {
  getListColumns,
  getNamedListColumns,
  getRowTitle,
  warehouseCardColumnNames,
} from '@/views/view-utils'

export function CardView({ basePath, rows, table }: CollectionViewProps) {
  const deletion = useClientDeletion(table.name)
  const coverColumn = table.name === 'MATRIZ DISPOSITIVOS'
    ? table.columns.find((column) => column.name === 'Imagen' && column.type === 'Image')
    : undefined
  const columns = table.name === 'ALMACEN'
    ? getNamedListColumns(table, warehouseCardColumnNames)
    : getListColumns(table, coverColumn ? 5 : 4)
      .filter((column) => !coverColumn || column.name !== table.label)
      .slice(0, 4)
  const technicalSheetColumn = table.name === 'MATRIZ DISPOSITIVOS'
    ? table.columns.find((column) => column.name === 'Ficha_Tecnica' && column.type === 'Url')
    : undefined
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {rows.map((row) => {
        const technicalSheetUrl = technicalSheetColumn
          ? safeExternalUrl(row[technicalSheetColumn.name])
          : undefined

        return (
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
                <div className="flex shrink-0 gap-2">
                  {deletion.available && (
                    <button
                      aria-label={'Eliminar ' + getRowTitle(table, row)}
                      className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-red-200 bg-red-50 text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-wait disabled:opacity-50"
                      disabled={deletion.pendingFor(String(row._uuid))}
                      onClick={() => deletion.request(
                        String(row._uuid),
                        String(row['RAZON SOCIAL'] ?? getRowTitle(table, row)),
                      )}
                      title="Eliminar contacto"
                      type="button"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                  <Link
                    aria-label={'Abrir ' + getRowTitle(table, row)}
                    className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-brand-100 text-brand-600 group-hover:bg-ink-950 group-hover:text-white"
                    to={basePath + '/' + encodeURIComponent(String(row._uuid))}
                  >
                    <ArrowUpRight className="size-5" />
                  </Link>
                </div>
              </div>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {columns.map((column) => (
                  <div key={column.name}>
                    <dt className="text-[11px] font-black uppercase tracking-wide text-ink-800/40">{column.label ?? column.name}</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-ink-800"><CellDisplay column={column} table={table.name} value={row[column.name]} /></dd>
                  </div>
                ))}
              </dl>
              {technicalSheetUrl && (
                <a
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 text-xs font-black uppercase tracking-wide text-brand-600 transition hover:border-brand-400 hover:bg-brand-100"
                  href={technicalSheetUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Ver ficha técnica <ExternalLink aria-hidden="true" className="size-4" />
                </a>
              )}
              {deletion.errorFor(String(row._uuid)) && (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800" role="alert">
                  No fue posible eliminar el contacto. Intenta nuevamente.
                </p>
              )}
            </div>
          </article>
        )
      })}
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
  const {
    isNearViewport,
    observe,
  } = useNearViewport<HTMLDivElement>()
  const media = useQuery({
    queryKey: ['media', table, storedValue],
    queryFn: () => repository.getMedia(table, storedValue),
    enabled: Boolean(storedValue) && isNearViewport,
  })

  if (storedValue && media.data) {
    return (
      <div ref={observe}>
        <img
          alt={alt}
          className="h-52 w-full object-contain p-5 transition duration-300 group-hover:scale-[1.03] sm:h-60"
          loading="lazy"
          src={media.data}
        />
      </div>
    )
  }

  return (
    <div className="grid h-52 place-items-center text-ink-800/30 sm:h-60" ref={observe}>
      <div className="text-center">
        <ImageOff aria-hidden="true" className="mx-auto size-9" />
        <p className="mt-2 text-xs font-bold">{!isNearViewport ? 'Imagen pendiente…' : media.isPending ? 'Cargando imagen…' : 'Sin imagen'}</p>
      </div>
    </div>
  )
}
