import type { ChangeEvent } from 'react'

import { FieldShell, inputClassName } from '@/fields/field-shell'
import type { FieldComponentProps } from '@/fields/types'

export function EnumField({ column, disabled, error, onChange, value }: FieldComponentProps) {
  const inputId = 'field-' + encodeURIComponent(column.name)
  const stringValue = typeof value === 'string' ? value : ''

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
