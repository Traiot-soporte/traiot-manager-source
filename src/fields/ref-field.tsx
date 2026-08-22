import { useQuery } from '@tanstack/react-query'

import { useRepository } from '@/data/use-repository'
import { FieldShell, inputClassName } from '@/fields/field-shell'
import type { FieldComponentProps } from '@/fields/types'
import { getTableDefinition } from '@/schema'

export function RefField({ column, disabled, error, onChange, value }: FieldComponentProps) {
  const inputId = 'field-' + encodeURIComponent(column.name)
  const repository = useRepository()
  const refTable = column.ref ? getTableDefinition(column.ref.table) : undefined
  const rows = useQuery({
    queryKey: ['ref-options', column.ref?.table],
    queryFn: () => repository.list(column.ref?.table ?? ''),
    enabled: Boolean(refTable),
  })
  const stringValue = typeof value === 'string' ? value : ''

  return (
    <FieldShell column={column} error={error} inputId={inputId}>
      <select
        aria-describedby={error ? inputId + '-error' : undefined}
        className={inputClassName}
        disabled={disabled || rows.isPending}
        id={inputId}
        onChange={(event) => onChange(event.target.value)}
        value={stringValue}
      >
        <option value="">{rows.isPending ? 'Cargando opciones…' : 'Selecciona una opción'}</option>
        {rows.data?.map((row) => {
          const uuid = String(row._uuid ?? '')
          const optionLabel =
            row[refTable?.label ?? ''] ?? row[refTable?.legacyBusinessKey ?? ''] ?? uuid
          return (
            <option key={uuid} value={uuid}>
              {String(optionLabel)}
            </option>
          )
        })}
      </select>
    </FieldShell>
  )
}
