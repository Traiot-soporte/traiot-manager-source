import type { ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useRepository } from '@/data/use-repository'
import { FieldShell, inputClassName } from '@/fields/field-shell'
import type { FieldComponentProps } from '@/fields/types'

export function EnumField({ column, disabled, error, onChange, value }: FieldComponentProps) {
  const repository = useRepository()
  const inputId = 'field-' + encodeURIComponent(column.name)
  const listId = inputId + '-options'
  const stringValue = typeof value === 'string' ? value : ''
  const dynamicCategories = useQuery({
    queryKey: ['table', 'ALMACEN'],
    queryFn: () => repository.list('ALMACEN'),
    enabled: column.allowOther === true && column.name === 'CATEGORIA',
  })
  const options = [...new Set([
    ...(column.values ?? []),
    ...(dynamicCategories.data ?? []).map((row) => String(row.CATEGORIA ?? '').trim()),
  ].filter(Boolean))]

  if (column.allowOther) {
    return (
      <FieldShell column={column} error={error} inputId={inputId}>
        <input
          aria-describedby={error ? inputId + '-error' : undefined}
          className={inputClassName}
          disabled={disabled}
          id={inputId}
          list={listId}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          placeholder="Selecciona o escribe una nueva categoría"
          value={stringValue}
        />
        <datalist id={listId}>
          {options.map((option) => <option key={option} value={option} />)}
        </datalist>
      </FieldShell>
    )
  }

  if (!column.values || column.values.length === 0) {
    return (
      <FieldShell column={column} error={error} inputId={inputId}>
        <input
          className={inputClassName}
          disabled={disabled}
          id={inputId}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          value={stringValue}
        />
      </FieldShell>
    )
  }

  return (
    <FieldShell column={column} error={error} inputId={inputId}>
      <select
        aria-describedby={error ? inputId + '-error' : undefined}
        className={inputClassName}
        disabled={disabled}
        id={inputId}
        onChange={(event) => onChange(event.target.value)}
        value={stringValue}
      >
        <option value="">Selecciona una opción</option>
        {column.values.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}
