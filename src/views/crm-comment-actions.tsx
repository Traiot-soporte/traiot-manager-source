import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquarePlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { useRepository } from '@/data/use-repository'
import { upsertMutationResult } from '@/modules/tables/mutation-cache'
import type { RowData } from '@/schema'
import { CrmCommentHistory } from '@/views/crm-comment-history'

interface RowCrmCommentButtonProps {
  readonly labelled?: boolean
  readonly row: RowData
}

export function RowCrmCommentButton({ labelled = false, row }: RowCrmCommentButtonProps) {
  const repository = useRepository()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')
  const rowUuid = String(row._uuid ?? '')
  const mutation = useMutation({
    mutationFn: () => repository.update({
      table: 'Gestion Clientes',
      rowUuid,
      changes: { Comentarios: comment.trim() },
    }),
    onSuccess: async (saved) => {
      queryClient.setQueryData<readonly RowData[]>(
        ['table', 'Gestion Clientes'],
        (rows) => upsertMutationResult(rows, saved),
      )
      setComment('')
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['table-summaries'] })
    },
  })

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !mutation.isPending) setOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [mutation.isPending, open])

  const close = () => {
    if (!mutation.isPending) setOpen(false)
  }

  return <>
    <button
      aria-label="Agregar comentario"
      className={labelled
        ? 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-xs font-black uppercase tracking-wide text-ink-950 transition hover:bg-brand-400'
        : 'grid min-h-11 min-w-11 place-items-center rounded-xl border border-transparent text-ink-800/55 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600'}
      onClick={() => setOpen(true)}
      title="Agregar comentario"
      type="button"
    >
      <MessageSquarePlus className="size-4" />
      {labelled && <span>Nuevo comentario</span>}
    </button>
    {open && createPortal(
      <div
        aria-label="Agregar comentario de seguimiento"
        aria-modal="true"
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-6"
        onClick={close}
        role="dialog"
      >
        <section
          className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-[#f7f3f1] p-4 shadow-2xl sm:p-6"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600">Seguimiento comercial</p>
              <h2 className="mt-1 text-xl font-black text-ink-950">Agregar comentario</h2>
              <p className="mt-1 text-xs font-semibold text-ink-800/50">Se guardará con el usuario y la hora local de Ciudad de México.</p>
            </div>
            <button aria-label="Cerrar" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-black/10 bg-white text-ink-800/60 hover:bg-red-50 hover:text-red-600" onClick={close} type="button"><X className="size-5" /></button>
          </div>

          <div className="mt-5 rounded-2xl border border-black/5 bg-white p-4">
            <h3 className="mb-3 text-sm font-black text-ink-950">Historial</h3>
            <CrmCommentHistory value={row.Comentarios} />
          </div>

          <label className="mt-5 block text-xs font-black uppercase tracking-wide text-ink-950" htmlFor={'crm-comment-' + rowUuid}>Comentario nuevo</label>
          <textarea
            autoFocus
            className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-ink-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            id={'crm-comment-' + rowUuid}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Escribe el seguimiento realizado…"
            value={comment}
          />
          {mutation.isError && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800" role="alert">{mutation.error instanceof Error ? mutation.error.message : 'No fue posible guardar el comentario. Intenta nuevamente.'}</p>}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button className="min-h-11 rounded-xl border border-black/10 bg-white px-5 text-sm font-black text-ink-800 hover:bg-black/5" disabled={mutation.isPending} onClick={close} type="button">Cancelar</button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink-950 px-5 text-sm font-black text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!comment.trim() || mutation.isPending}
              onClick={() => mutation.mutate()}
              type="button"
            >
              <MessageSquarePlus className="size-4" />
              {mutation.isPending ? 'Guardando…' : 'Guardar comentario'}
            </button>
          </div>
        </section>
      </div>,
      document.body,
    )}
  </>
}

export function CrmCommentPanel({ row }: { readonly row: RowData }) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600">Seguimiento</p>
          <h2 className="mt-1 text-lg font-black text-ink-950">Historial de comentarios</h2>
        </div>
        <RowCrmCommentButton labelled row={row} />
      </div>
      <div className="mt-5">
        <CrmCommentHistory value={row.Comentarios} />
      </div>
    </section>
  )
}
