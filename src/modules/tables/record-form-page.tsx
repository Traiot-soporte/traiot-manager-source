import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { ModuleHeader } from '@/components/module-header'
import { TableIcon } from '@/components/table-icon'
import { useRepository } from '@/data/use-repository'
import { upsertMutationResult } from '@/modules/tables/mutation-cache'
import { getMutationAffectedTables } from '@/modules/tables/mutation-invalidation'
import { PurchaseBatchForm } from '@/modules/inventory/purchase-batch-form'
import { getTableDefinition, getTableDisplayName } from '@/schema'
import type { RowData } from '@/schema'
import { FormView } from '@/views/form-view'

export function RecordFormPage() {
  const { rowUuid, tableName = '' } = useParams()
  const table = getTableDefinition(tableName)
  const repository = useRepository()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const user = useQuery({ queryKey: ['current-user'], queryFn: () => repository.getCurrentUser() })
  const row = useQuery({
    queryKey: ['row', tableName, rowUuid],
    queryFn: () => repository.get(tableName, rowUuid ?? ''),
    enabled: Boolean(table && rowUuid),
  })
  const warehouse = useQuery({
    queryKey: ['table', 'ALMACEN'],
    queryFn: () => repository.list('ALMACEN'),
    enabled: tableName === 'COMPRAS' && !rowUuid,
  })

  if (!table) return <FormMessage text="Tabla no encontrada" to="/" />
  const basePath = '/tablas/' + encodeURIComponent(table.name)
  if (table.readOnly) return <FormMessage text="Esta tabla se actualiza automáticamente y no admite captura manual." to={basePath} />
  const tableDisplayName = getTableDisplayName(table)
  const editing = Boolean(rowUuid)
  if (user.isPending || (editing && row.isPending)) return <FormMessage text="Preparando formulario…" to={basePath} />
  if (user.isError || !user.data) return <FormMessage text="No fue posible cargar el usuario." to={basePath} />
  if (editing && (row.isError || !row.data)) return <FormMessage text="Registro no encontrado" to={basePath} />

  const save = async (values: RowData) => {
    const saved = editing && rowUuid
      ? await repository.update({
          table: table.name,
          rowUuid,
          changes: values,
          expectedUpdatedAt: typeof row.data?._updatedAt === 'string' ? row.data._updatedAt : null,
        })
      : await repository.create({ table: table.name, values })
    queryClient.setQueryData<readonly RowData[]>(
      ['table', table.name],
      (rows) => upsertMutationResult(rows, saved),
    )
    const affectedTables = getMutationAffectedTables(table.name)
    await Promise.all([
      ...affectedTables.map((affectedTable) =>
        queryClient.invalidateQueries({ queryKey: ['table', affectedTable] }),
      ),
      queryClient.invalidateQueries({ queryKey: ['table-summaries'] }),
      queryClient.invalidateQueries({ queryKey: ['row', table.name, saved._uuid] }),
    ])
    void navigate(basePath + '/' + encodeURIComponent(String(saved._uuid)))
  }

  const savePurchaseBatch = async (rows: readonly RowData[]) => {
    let completed = 0
    try {
      for (const values of rows) {
        const saved = await repository.create({ table: table.name, values })
        completed += 1
        queryClient.setQueryData<readonly RowData[]>(
          ['table', table.name],
          (currentRows) => upsertMutationResult(currentRows, saved),
        )
      }
    } catch (error) {
      await invalidateMutationTables(queryClient, table.name)
      const detail = error instanceof Error ? error.message : 'Error desconocido.'
      throw new Error(completed > 0
        ? 'Se registraron ' + completed + ' de ' + rows.length + ' compras. La siguiente línea falló: ' + detail
        : 'No fue posible registrar la compra: ' + detail)
    }
    await invalidateMutationTables(queryClient, table.name)
    void navigate(basePath)
  }

  const cancelTo = editing && rowUuid ? basePath + '/' + encodeURIComponent(rowUuid) : basePath
  const requestedCalendar = searchParams.get('calendario')
  const initialRow = editing
    ? row.data
    : table.name === 'Gestion Clientes' && (requestedCalendar === 'Personal' || requestedCalendar === 'Empresarial')
      ? { Calendario: requestedCalendar }
      : undefined
  const formTitle = table.name === 'COMPRAS'
    ? editing ? 'EDITAR COMPRA' : 'NUEVA COMPRA'
    : table.name === 'PEDIDOS'
      ? editing ? 'EDITAR SALIDA' : 'NUEVA SALIDA'
    : table.name === 'Gestion Clientes'
      ? editing ? 'EDITAR CONTACTO' : 'NUEVO CONTACTO'
    : editing ? 'EDITAR ' + tableDisplayName : 'CREAR EN ' + tableDisplayName
  const formDescription = table.name === 'COMPRAS'
    ? 'Registra la recepción; el ID de compra y la entrada al inventario se generan automáticamente.'
    : table.name === 'PEDIDOS'
      ? 'Registra la salida; el folio y el movimiento de inventario se generan automáticamente.'
    : table.name === 'Gestion Clientes'
      ? 'Captura la ficha profesional; el ID y la auditoría se generan automáticamente.'
      : 'Completa la información necesaria del registro.'
  const formSubmitLabel = table.name === 'COMPRAS'
    ? editing ? 'Guardar compra' : 'Registrar compra'
    : table.name === 'PEDIDOS'
      ? editing ? 'Guardar salida' : 'Registrar salida'
    : table.name === 'Gestion Clientes'
      ? editing ? 'Guardar contacto' : 'Crear contacto'
    : editing ? 'Guardar cambios' : 'Crear registro'

  return (
    <div className="space-y-4">
      <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-ink-800/55 hover:text-brand-600" to={cancelTo}><ArrowLeft className="size-4" />Cancelar y volver</Link>
      <ModuleHeader
        description={formDescription}
        eyebrow={!editing && table.name === 'COMPRAS'
          ? 'Nueva compra'
          : !editing && table.name === 'PEDIDOS'
            ? 'Nueva salida'
            : !editing && table.name === 'Gestion Clientes'
              ? 'Nuevo contacto'
            : editing ? 'Edición' : 'Nuevo registro'}
        icon={<TableIcon className="size-5" name={table.icon} />}
        title={formTitle}
      />
      {table.name === 'COMPRAS' && !editing ? (
        <PurchaseBatchForm
          cancelTo={cancelTo}
          onSubmit={savePurchaseBatch}
          products={warehouse.data ?? []}
          productsLoading={warehouse.isPending}
        />
      ) : (
        <FormView cancelTo={cancelTo} initialRow={initialRow} onSubmit={save} submitLabel={formSubmitLabel} table={table} user={user.data} />
      )}
    </div>
  )
}

async function invalidateMutationTables(
  queryClient: ReturnType<typeof useQueryClient>,
  tableName: string,
) {
  const affectedTables = getMutationAffectedTables(tableName)
  await Promise.all([
    ...affectedTables.map((affectedTable) =>
      queryClient.invalidateQueries({ queryKey: ['table', affectedTable] }),
    ),
    queryClient.invalidateQueries({ queryKey: ['table-summaries'] }),
  ])
}

function FormMessage({ text, to }: { readonly text: string; readonly to: string }) {
  return <section className="rounded-3xl bg-white p-8"><h1 className="text-xl font-black text-ink-950">{text}</h1><Link className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-brand-600" to={to}>Volver</Link></section>
}
