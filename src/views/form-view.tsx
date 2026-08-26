import { zodResolver } from '@hookform/resolvers/zod'
import { Hash, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'

import { FieldRenderer } from '@/fields/field-renderer'
import { buildFormSchema } from '@/schema/form-schema'
import type { CellValue, FormulaContext, RowData, TableDef, UserContext } from '@/schema'
import { CrmCommentHistory } from '@/views/crm-comment-history'
import { getDisplayColumns } from '@/views/view-utils'

interface FormViewProps {
  readonly table: TableDef
  readonly initialRow?: RowData | undefined
  readonly user: UserContext
  readonly cancelTo: string
  readonly submitLabel: string
  readonly onSubmit: (values: RowData) => Promise<void>
}

const wideFieldTypes = new Set(['LongText', 'Address', 'EnumList', 'Image', 'Signature'])

function isPersistedCrmContact(table: TableDef, row: RowData | undefined): boolean {
  return table.name === 'Gestion Clientes' && typeof row?._uuid === 'string' && row._uuid !== ''
}

function prepareFormDefaults(table: TableDef, initialRow: RowData | undefined, context: FormulaContext) {
  const defaults: RowData = { ...(initialRow ?? {}) }
  for (const column of table.columns) {
    if (defaults[column.name] === undefined && column.defaultValue) {
      defaults[column.name] = column.defaultValue(defaults, context)
    }
  }
  if (isPersistedCrmContact(table, initialRow)) {
    defaults.Comentarios = ''
  }
  return defaults
}

function editableColumns(table: TableDef) {
  return getDisplayColumns(table).filter(
    (column) =>
      column.origin !== 'system' &&
      !column.readOnly &&
      !column.formula &&
      column.type !== 'List' &&
      column.type !== 'Show',
  )
}

function withSyncedReferences(table: TableDef, values: RowData): RowData {
  const result = { ...values }
  for (const column of table.columns) {
    if (column.syncTo) {
      result[column.syncTo] = values[column.name]
    }
  }
  return result
}

export function FormView({
  cancelTo,
  initialRow,
  onSubmit,
  submitLabel,
  table,
  user,
}: FormViewProps) {
  const [submitError, setSubmitError] = useState<string>()
  const context = useMemo<FormulaContext>(
    () => ({
      now: new Date(),
      user,
      can: (permission) => user.permissions.has('*') || user.permissions.has(permission),
      lookup: () => undefined,
    }),
    [user],
  )
  const schema = useMemo(() => buildFormSchema(table), [table])
  const defaultValues = useMemo(
    () => prepareFormDefaults(table, initialRow, context),
    [context, initialRow, table],
  )
  const form = useForm<RowData>({
    defaultValues,
    resolver: zodResolver(schema) as Resolver<RowData>,
    mode: 'onBlur',
  })
  const currentRow = useWatch({ control: form.control })
  const columns = editableColumns(table).filter(
    (column) => !column.showIf || column.showIf(currentRow, context),
  )
  const sections = [...new Set(columns.map((column) => column.section ?? 'Información general'))]
  const isEditingCrmContact = isPersistedCrmContact(table, initialRow)

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(undefined)
    try {
      await onSubmit(withSyncedReferences(table, values))
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No fue posible guardar el registro.')
    }
  })

  return (
    <form className="space-y-6" onSubmit={(event) => void submit(event)}>
      {table.name === 'Gestion Clientes' && (
        <aside className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-brand-700" role="note">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-sm"><Hash className="size-5" /></span>
          <div>
            <p className="text-sm font-black">Ficha de contacto con ID automático</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-ink-800/60">
              No necesitas capturar el ID ni los datos de auditoría. El sistema asignará el siguiente consecutivo GC-0001 y registrará quién creó o modificó la ficha.
            </p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-ink-800/60">
              Los teléfonos y el correo habilitan las acciones rápidas de WhatsApp, llamada, correo y comunicaciones programadas.
            </p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-ink-800/60">
              Cada comentario nuevo se anexará con la fecha, hora de CDMX y el usuario que lo escribió; el historial anterior se conservará.
            </p>
          </div>
        </aside>
      )}
      {sections.map((section) => {
        const sectionColumns = columns.filter(
          (column) => (column.section ?? 'Información general') === section,
        )

        return (
          <fieldset
            className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-7"
            key={section}
          >
            <legend className="px-2 text-lg font-black text-ink-950">{section}</legend>
            {isEditingCrmContact && section === 'Comentarios' && initialRow && (
              <div className="mt-3 rounded-2xl border border-black/5 bg-black/[0.015] p-4 sm:p-5">
                <p className="mb-3 text-xs font-black uppercase tracking-wide text-ink-800/45">
                  Historial de comentarios
                </p>
                <CrmCommentHistory value={initialRow.Comentarios} />
              </div>
            )}
            <div className="mt-3 grid gap-5 md:grid-cols-2">
              {sectionColumns.map((column) => {
                const renderedColumn = isEditingCrmContact && column.name === 'Comentarios'
                  ? {
                      ...column,
                      label: 'AGREGAR COMENTARIO',
                      description: 'Escribe únicamente la nueva entrada. Al guardar se añadirá al historial con fecha, hora y usuario.',
                    }
                  : column

                return (
                  <div
                    className={wideFieldTypes.has(column.type)
                      ? 'md:col-span-2'
                      : column.compact ? 'md:max-w-xs' : undefined}
                    key={column.name}
                  >
                    <Controller
                      control={form.control}
                      name={column.name}
                      render={({ field, fieldState }) => (
                        <FieldRenderer
                          column={renderedColumn}
                          context={context}
                          disabled={Boolean(column.editableIf && !column.editableIf(currentRow, context))}
                          error={fieldState.error?.message}
                          onChange={(value: CellValue | undefined) => field.onChange(value)}
                          row={currentRow}
                          value={field.value}
                        />
                      )}
                    />
                  </div>
                )
              })}
            </div>
          </fieldset>
        )
      })}

      {submitError && (
        <p
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800"
          role="alert"
        >
          {submitError}
        </p>
      )}

      <div className="sticky bottom-20 z-10 flex flex-col-reverse gap-3 rounded-2xl border border-black/10 bg-white/95 p-3 shadow-2xl shadow-ink-950/10 backdrop-blur sm:flex-row sm:justify-end lg:bottom-4">
        <Link
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-black/10 px-5 text-sm font-black text-ink-800"
          to={cancelTo}
        >
          Cancelar
        </Link>
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink-950 px-6 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60"
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          <Save className="size-4" />
          {form.formState.isSubmitting ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
