import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'

import { useRepository } from '@/data/use-repository'
import { getTableDefinition } from '@/schema'
import { DetailView } from '@/views/detail-view'
import { getRowTitle } from '@/views/view-utils'

export function RecordDetailPage() {
  const { rowUuid = '', tableName = '' } = useParams()
  const table = getTableDefinition(tableName)
  const repository = useRepository()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const row = useQuery({
    queryKey: ['row', tableName, rowUuid],
    queryFn: () => repository.get(tableName, rowUuid),
    enabled: Boolean(table && rowUuid),
  })
  const basePath = table ? '/tablas/' + encodeURIComponent(table.name) : '/'
  const remove = useMutation({
    mutationFn: () => repository.delete({ table: tableName, rowUuid }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['table', tableName] }),
        queryClient.invalidateQueries({ queryKey: ['table-summaries'] }),
      ])
      void navigate(basePath)
    },
  })

  if (!table) return <RecordMessage title="Tabla no encontrada" backTo="/" />
  if (row.isPending) return <RecordMessage title="Cargando registro…" backTo={basePath} />
  if (row.isError || !row.data) return <RecordMessage title="Registro no encontrado" backTo={basePath} />

  const askToRemove = () => {
    if (window.confirm('¿Deseas eliminar este registro? Se ocultará mediante borrado lógico.')) remove.mutate()
  }

  return (
    <div className="space-y-6">
      <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-ink-800/55 hover:text-brand-600" to={basePath}><ArrowLeft className="size-4" />Volver a {table.name}</Link>
      <header className="flex flex-col gap-5 rounded-3xl bg-ink-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-brand-400">Detalle</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">{getRowTitle(table, row.data)}</h1></div>
        {repository.writable && <div className="flex flex-col gap-2 sm:flex-row">
          <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-black hover:bg-white/15" to={basePath + '/' + encodeURIComponent(rowUuid) + '/editar'}><Pencil className="size-4" />Editar</Link>
          <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-300/30 px-5 text-sm font-black text-red-200 hover:bg-red-500/15 disabled:opacity-50" disabled={remove.isPending} onClick={askToRemove} type="button"><Trash2 className="size-4" />{remove.isPending ? 'Eliminando…' : 'Eliminar'}</button>
        </div>}
      </header>
      {remove.isError && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">No fue posible eliminar el registro.</p>}
      <DetailView row={row.data} table={table} />
    </div>
  )
}

function RecordMessage({ backTo, title }: { readonly backTo: string; readonly title: string }) {
  return <section className="rounded-3xl bg-white p-8"><h1 className="text-xl font-black text-ink-950">{title}</h1><Link className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-brand-600" to={backTo}>Volver</Link></section>
}
