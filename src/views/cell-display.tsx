import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Mail, MapPinned, PhoneCall, ZoomIn, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { useRepository } from '@/data/use-repository'
import { formatCell } from '@/lib/format'
import { useNearViewport } from '@/lib/use-near-viewport'
import { getTableDefinition } from '@/schema'
import type { CellValue, ColumnDef } from '@/schema'
import { emailHref, mapHref, phoneHrefs } from '@/views/communication-utils'
import { CrmCommentHistory } from '@/views/crm-comment-history'
import { safeExternalUrl, urlActionLabel } from '@/views/url-utils'
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
  const {
    isNearViewport: isMediaNearViewport,
    observe: observeMedia,
  } = useNearViewport<HTMLSpanElement>()
  const referenceRows = useQuery({
    queryKey: ['table', referenceTable],
    queryFn: () => repository.list(referenceTable),
    enabled: column.type === 'Ref' && Boolean(referenceTable) && Boolean(rowUuid),
  })
  const referencedRow = referenceRows.data?.find((row) => String(row._uuid ?? '') === rowUuid)
  const media = useQuery({
    queryKey: ['media', table, rowUuid],
    queryFn: () => repository.getMedia(table, rowUuid),
    enabled: isMedia && Boolean(rowUuid) && isMediaNearViewport,
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

  if (table === 'Gestion Clientes' && column.name === 'Comentarios') {
    return <CrmCommentHistory value={value} />
  }

  if (table === 'ALMACEN' && column.name === 'AVISO DE COMPRA') {
    const notice = String(value ?? '').trim().toLocaleUpperCase('es-MX')
    const noticeStyles: Readonly<Record<string, string>> = {
      REABASTECER: 'bg-red-50 text-red-700 ring-red-200',
      'NIVEL ADECUADO': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      SOBRESTOCK: 'bg-blue-50 text-blue-700 ring-blue-200',
    }
    const style = noticeStyles[notice]
    return style
      ? <span className={'inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-black ring-1 ring-inset ' + style}>{notice}</span>
      : <>{formatCell(value, column.type)}</>
  }

  if (isMedia && typeof value === 'string') {
    const imageLabel = column.label ?? column.name
    return (
      <span className="inline-block min-h-8 min-w-8" ref={observeMedia}>
        {!isMediaNearViewport ? 'Imagen pendiente…' : media.isPending ? 'Cargando archivo…' : !media.data ? value : <button
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
        </button>}
        {media.data && previewOpen && createPortal(
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
      </span>
    )
  }

  if (column.type === 'Url') {
    const href = safeExternalUrl(value)
    if (!href) return <>{formatCell(value, column.type)}</>

    return (
      <a
        className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 font-black text-brand-600 transition hover:border-brand-400 hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
        href={href}
        rel="noopener noreferrer"
        target="_blank"
        title={href}
      >
        <span>{urlActionLabel(column.name)}</span>
        <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
      </a>
    )
  }

  if (column.type === 'Email') {
    const href = emailHref(value)
    if (!href) return <>{formatCell(value, column.type)}</>
    return (
      <a className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg px-2 font-bold text-brand-600 transition hover:bg-brand-50" href={href} title="Enviar correo">
        <Mail className="size-4 shrink-0" /> <span className="min-w-0 break-all">{formatCell(value, column.type)}</span>
      </a>
    )
  }

  const phones = phoneHrefs(column, value)
  if (phones) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span>{formatCell(value, column.type)}</span>
        <a aria-label="Llamar" className="grid min-h-10 min-w-10 place-items-center rounded-lg text-brand-600 transition hover:bg-brand-50" href={phones.tel} title="Llamar"><PhoneCall className="size-4" /></a>
        <a aria-label="Abrir WhatsApp" className="grid min-h-10 min-w-10 place-items-center rounded-lg text-[#128c4a] transition hover:bg-emerald-50" href={phones.whatsapp} rel="noopener noreferrer" target="_blank" title="Enviar por WhatsApp"><WhatsAppIcon className="size-5" /></a>
      </span>
    )
  }

  const maps = mapHref(column, value)
  if (maps) {
    return (
      <span className="inline-flex items-start gap-1.5">
        <span>{formatCell(value, column.type)}</span>
        <a aria-label="Abrir ubicación" className="grid min-h-10 min-w-10 shrink-0 place-items-center rounded-lg text-brand-600 transition hover:bg-brand-50" href={maps} rel="noopener noreferrer" target="_blank" title="Abrir en mapa"><MapPinned className="size-4" /></a>
      </span>
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

  if (column.type === 'Ref' && referencedRow) {
    const table = getTableDefinition(referenceTable)
    if (table) return <>{getRowTitle(table, referencedRow)}</>
  }

  return <>{formatCell(value, column.type)}</>
}
