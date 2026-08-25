import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'

import { ModuleHeader } from '@/components/module-header'
import { TableIcon } from '@/components/table-icon'
import { useRepository } from '@/data/use-repository'
import { AuthAdminPanel } from '@/modules/auth/auth-admin-panel'
import { isAdministratorRole } from '@/modules/auth/auth-permissions'
import { getMutationAffectedTables } from '@/modules/tables/mutation-invalidation'
import { getAdjacentRecords } from '@/modules/tables/record-navigation'
import { getTableDefinition, getTableDisplayName } from '@/schema'
import { DetailView } from '@/views/detail-view'
import { CommunicationPanel } from '@/views/communication-panel'
import { getRowTitle } from '@/views/view-utils'

export function RecordDetailPage() {
  const { rowUuid = '', tableName = '' } = useParams()
  const table = getTableDefinition(tableName)
  const repository = useRepository()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const records = useQuery({
    queryKey: ['table', tableName],
    queryFn: () => repository.list(tableName),
    enabled: Boolean(table),
  })
  const currentUser = useQuery({
    queryKey: ['current-user'],
    queryFn: () => repository.getCurrentUser(),
  })
  const basePath = table ? '/tablas/' + encodeURIComponent(table.name) : '/'
  const row = records.data?.find((candidate) => String(candidate._uuid ?? '') === rowUuid)
  const remove = useMutation({
    mutationFn: () => repository.delete({ table: tableName, rowUuid }),
    onSuccess: async () => {
      const affectedTables = getMutationAffectedTables(tableName)
      await Promise.all([
        ...affectedTables.map((affectedTable) =>
          queryClient.invalidateQueries({ queryKey: ['table', affectedTable] }),
        ),
        queryClient.invalidateQueries({ queryKey: ['table-summaries'] }),
      ])
      void navigate(basePath)
    },
  })

  if (!table) return <RecordMessage title="Tabla no encontrada" backTo="/" />
  if (records.isPending || (!row && records.isFetching)) {
    return <RecordMessage title="Cargando registro…" backTo={basePath} />
  }
  if (records.isError || !row) return <RecordMessage title="Registro no encontrado" backTo={basePath} />

  const askToRemove = () => {
    if (window.confirm('¿Deseas eliminar este registro? Se ocultará mediante borrado lógico.')) remove.mutate()
  }
  const tableDisplayName = getTableDisplayName(table)
  const adjacent = getAdjacentRecords(records.data ?? [], rowUuid)
  const previousUuid = typeof adjacent.previous?._uuid === 'string' ? adjacent.previous._uuid : undefined
  const nextUuid = typeof adjacent.next?._uuid === 'string' ? adjacent.next._uuid : undefined
  const recordPath = (recordUuid: string) => basePath + '/' + encodeURIComponent(recordUuid)

  return (
    <div className="space-y-4">
      <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-ink-800/55 hover:text-brand-600" to={basePath}><ArrowLeft className="size-4" />Volver a {tableDisplayName}</Link>
      <ModuleHeader
        action={<div className="flex flex-wrap items-center justify-end gap-2">
          <RecordNavigationLink
            direction="previous"
            rowUuid={previousUuid}
            to={previousUuid ? recordPath(previousUuid) : undefined}
          />
          <span className="min-w-16 text-center text-xs font-black text-white/45">
            {adjacent.position || '—'} / {adjacent.total || '—'}
          </span>
          <RecordNavigationLink
            direction="next"
            rowUuid={nextUuid}
            to={nextUuid ? recordPath(nextUuid) : undefined}
          />
          {repository.writable && !table.readOnly && <>
            <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-black hover:bg-white/15" to={basePath + '/' + encodeURIComponent(rowUuid) + '/editar'}><Pencil className="size-4" />Editar</Link>
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-300/30 px-5 text-sm font-black text-red-200 hover:bg-red-500/15 disabled:opacity-50" disabled={remove.isPending} onClick={askToRemove} type="button"><Trash2 className="size-4" />{remove.isPending ? 'Eliminando…' : 'Eliminar'}</button>
          </>}
        </div>}
        eyebrow="Detalle"
        icon={<TableIcon className="size-5" name={table.icon} />}
        title={getRowTitle(table, row)}
      />
      {remove.isError && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">No fue posible eliminar el registro.</p>}
      <DetailView row={row} table={table} />
      {(table.name === 'CLIENTES' || table.name === 'Gestion Clientes') && (
        <CommunicationPanel row={row} table={table} />
      )}
      {table.name === 'Usuarios' && isAdministratorRole(currentUser.data?.role) && (
        <AuthAdminPanel
          email={String(row.UserEmail ?? '')}
          userUuid={String(row._uuid ?? '')}
        />
      )}
    </div>
  )
}

function RecordNavigationLink({ direction, rowUuid, to }: {
  readonly direction: 'previous' | 'next'
  readonly rowUuid: string | undefined
  readonly to: string | undefined
}) {
  const previous = direction === 'previous'
  const Icon = previous ? ChevronLeft : ChevronRight
  const label = previous ? 'Anterior' : 'Siguiente'
  const className = 'inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-black transition'

  if (!to || !rowUuid) {
    return <span aria-disabled="true" className={className + ' cursor-not-allowed text-white/25'}><Icon className="size-4" />{label}</span>
  }

  return (
    <Link className={className + ' text-white hover:border-brand-400 hover:bg-white/10'} to={to}>
      {previous && <Icon className="size-4" />}
      {label}
      {!previous && <Icon className="size-4" />}
    </Link>
  )
}

function RecordMessage({ backTo, title }: { readonly backTo: string; readonly title: string }) {
  return <section className="rounded-3xl bg-white p-8"><h1 className="text-xl font-black text-ink-950">{title}</h1><Link className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-brand-600" to={backTo}>Volver</Link></section>
}
