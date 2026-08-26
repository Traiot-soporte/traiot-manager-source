import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useRepository } from '@/data/use-repository'
import type { RowData, TableDef } from '@/schema'
import { CommunicationForm } from '@/views/communication-panel'
import {
  defaultCommunicationMessage,
  defaultCommunicationSubject,
  resolveCommunicationTarget,
} from '@/views/communication-target'
import { getRowTitle } from '@/views/view-utils'

export function RowCommunicationScheduler({ row, table }: {
  readonly row: RowData
  readonly table: TableDef
}) {
  const repository = useRepository()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const clients = useQuery({
    queryKey: ['table', 'CLIENTES'],
    queryFn: () => repository.list('CLIENTES'),
    enabled: open && table.name === 'Gestion Clientes',
  })
  const clientUuid = String(row.cliente_uuid ?? '')
  const client = clients.data?.find((candidate) => String(candidate._uuid ?? '') === clientUuid)
  const target = useMemo(
    () => resolveCommunicationTarget(table.name, row, client),
    [client, row, table.name],
  )

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return <>
    <button
      aria-label={'Programar comunicación con ' + getRowTitle(table, row)}
      className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-transparent text-ink-800/55 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
      onClick={() => setOpen(true)}
      title="Programar comunicación"
      type="button"
    >
      <CalendarPlus className="size-4" />
    </button>
    {open && createPortal(
      <div
        aria-label="Programar comunicación"
        aria-modal="true"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-6"
        onClick={() => setOpen(false)}
        role="dialog"
      >
        <section
          className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-[#f7f3f1] p-4 shadow-2xl sm:p-6"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600">Comunicación programada</p>
              <h2 className="mt-1 text-xl font-black text-ink-950">{target.title || getRowTitle(table, row)}</h2>
              <p className="mt-1 text-xs font-semibold text-ink-800/50">Prepara WhatsApp o correo sin salir de la tabla.</p>
            </div>
            <button aria-label="Cerrar" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-black/10 bg-white text-ink-800/60 hover:bg-red-50 hover:text-red-600" onClick={() => setOpen(false)} type="button"><X className="size-5" /></button>
          </div>
          <CommunicationForm
            email={target.email}
            entityTable={table.name as 'CLIENTES' | 'Gestion Clientes'}
            entityTitle={target.title || getRowTitle(table, row)}
            entityUuid={String(row._uuid ?? '')}
            initialMessage={defaultCommunicationMessage(target)}
            initialSubject={defaultCommunicationSubject(target)}
            onCreated={async () => {
              setOpen(false)
              await queryClient.invalidateQueries({ queryKey: ['communications'] })
            }}
            phone={target.phone}
          />
        </section>
      </div>,
      document.body,
    )}
  </>
}
