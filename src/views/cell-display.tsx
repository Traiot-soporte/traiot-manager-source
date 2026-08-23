import { useQuery } from '@tanstack/react-query'
import { ZoomIn, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { useRepository } from '@/data/use-repository'
import { formatCell } from '@/lib/format'
import { getTableDefinition } from '@/schema'
import type { CellValue, ColumnDef } from '@/schema'
import { getRowTitle } from '@/views/view-utils'

interface CellDisplayProps {
  readonly column: ColumnDef
  readonly table: string
  readonly value: CellValue | undefined
}

export function CellDisplay({ column, table, value }: CellDisplayProps) {
  const repository = useRepository()
  const [previewOpen, setPreviewOpen] = useState(false)
  const isMedia = column.type === 'Image' || column.type === 'Signature'
  const referenceTable = column.ref?.table ?? ''
  const rowUuid = typeof value === 'string' ? value : ''
  const reference = useQuery({
    queryKey: ['reference', referenceTable, rowUuid],
    queryFn: () => repository.get(referenceTable, rowUuid),
    enabled: column.type === 'Ref' && Boolean(referenceTable) && Boolean(rowUuid),
  })
  const media = useQuery({
    queryKey: ['media', table, column.name, rowUuid],
    queryFn: () => repository.getMedia(table, rowUuid),
    enabled: isMedia && Boolean(rowUuid),
  })

  useEffect(() => {
    if (!previewOpen) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [previewOpen])

  if (isMedia && typeof value === 'string') {
    if (media.isPending) return <>Cargando archivo…</>
    if (!media.data) return <>{value}</>

    const imageLabel = column.label ?? column.name
    return (
      <>
        <button
          aria-label={'Ampliar ' + imageLabel}
          className="group relative inline-flex max-w-full cursor-zoom-in overflow-hidden rounded-2xl border border-black/5 bg-black/[0.02] text-left"
          onClick={() => setPreviewOpen(true)}
          title="Ver imagen completa"
          type="button"
        >
          <img
            alt={imageLabel}
            className="max-h-56 w-auto object-contain transition duration-200 group-hover:scale-[1.02]"
            loading="lazy"
            src={media.data}
          />
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-ink-950/85 px-2.5 py-1.5 text-[10px] font-black text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100">
            <ZoomIn className="size-3.5" /> AMPLIAR
          </span>
        </button>
        {previewOpen && createPortal(
          <div
            aria-label={'Vista ampliada de ' + imageLabel}
            aria-modal="true"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm sm:p-8"
            onClick={() => setPreviewOpen(false)}
            role="dialog"
          >
            <button
              aria-label="Cerrar imagen ampliada"
              className="absolute right-4 top-4 grid size-12 place-items-center rounded-full border border-white/15 bg-black/50 text-white transition hover:bg-brand-500 hover:text-[#191919] sm:right-7 sm:top-7"
              onClick={() => setPreviewOpen(false)}
              type="button"
            >
              <X className="size-6" />
            </button>
            <figure className="flex max-h-full max-w-full flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
              <img
                alt={imageLabel}
                className="max-h-[82vh] max-w-[94vw] rounded-xl object-contain shadow-2xl"
                src={media.data}
              />
              <figcaption className="rounded-full bg-black/55 px-4 py-2 text-xs font-bold text-white/75">{imageLabel}</figcaption>
            </figure>
          </div>,
          document.body,
        )}
      </>
    )
  }

  if (column.type === 'Color' && typeof value === 'string') {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="size-4 rounded-full border border-black/10" style={{ background: value }} />
        {value}
      </span>
    )
  }

  if (column.type === 'Ref' && reference.data) {
    const table = getTableDefinition(referenceTable)
    if (table) return <>{getRowTitle(table, reference.data)}</>
  }

  return <>{formatCell(value, column.type)}</>
}
