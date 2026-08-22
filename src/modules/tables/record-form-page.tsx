import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'

import { useRepository } from '@/data/use-repository'
import { getTableDefinition } from '@/schema'
import type { RowData } from '@/schema'
import { FormView } from '@/views/form-view'

export function RecordFormPage() {
  const { rowUuid, tableName = '' } = useParams()
  const table = getTableDefinition(tableName)
  const repository = useRepository()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const user = useQuery({ queryKey: ['current-user'], queryFn: () => repository.getCurrentUser() })
  const row = useQuery({
    queryKey: ['row', tableName, rowUuid],
    queryFn: () => repository.get(tableName, rowUuid ?? ''),
    enabled: Boolean(table && rowUuid),
  })

  if (!table) return <FormMessage text="Tabla no encontrada" to="/" />
  const basePath = '/tablas/' + encodeURIComponent(table.name)
  const editing = Boolean(rowUuid)
  if (user.isPending || (editing && row.isPending)) return <FormMessage text="Preparando formulario…" to={basePath} />
  if (user.isError || !user.data) return <FormMessage text="No fue posible cargar el usuario." to={basePath} />
  if (editing && (row.isError || !row.data)) return <FormMessage text="Registro no encontrado" to={basePath} />

  const save = async (values: RowData) => {
    const saved = editing && rowUuid
      ? await repository.update({ table: table.name, rowUuid, changes: values })
      : await repository.create({ table: table.name, values })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['table', table.name] }),
      queryClient.invalidateQueries({ queryKey: ['table-summaries'] }),
      queryClient.invalidateQueries({ queryKey: ['row', table.name, saved._uuid] }),
    ])
    void navigate(basePath + '/' + encodeURIComponent(String(saved._uuid)))
  }

  const cancelTo = editing && rowUuid ? basePath + '/' + encodeURIComponent(rowUuid) : basePath

  return (
    <div className="space-y-6">
      <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-ink-800/55 hover:text-mint-600" to={cancelTo}><ArrowLeft className="size-4" />Cancelar y volver</Link>
      <header className="rounded-3xl bg-ink-950 p-6 text-white sm:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-mint-400">{editing ? 'Edición' : 'Nuevo registro'}</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">{editing ? 'Editar ' + table.name : 'Crear en ' + table.name}</h1><p className="mt-2 text-sm text-white/55">Formulario generado desde la metadata de {table.columns.length} campos.</p></header>
      <FormView cancelTo={cancelTo} initialRow={row.data} onSubmit={save} submitLabel={editing ? 'Guardar cambios' : 'Crear registro'} table={table} user={user.data} />
    </div>
  )
}

function FormMessage({ text, to }: { readonly text: string; readonly to: string }) {
  return <section className="rounded-3xl bg-white p-8"><h1 className="text-xl font-black text-ink-950">{text}</h1><Link className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-mint-600" to={to}>Volver</Link></section>
}
