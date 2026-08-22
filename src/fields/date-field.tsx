import type { ChangeEvent } from 'react'

import { FieldShell, inputClassName } from '@/fields/field-shell'
import type { FieldComponentProps } from '@/fields/types'

function toLocalDateTime(value: string): string {
  if (!value.includes('T')) {
    return value
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 16)
  }

  const offset = parsed.getTimezoneOffset() * 60_000
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 16)
}

export function DateField({ column, disabled, error, onChange, value }: FieldComponentProps) {
  const inputId = 'field-' + encodeURIComponent(column.name)
  const stringValue = typeof value === 'string' ? value : ''
  const inputValue = column.type === 'DateTime' ? toLocalDateTime(stringValue) : stringValue
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value)
  }

  return (
    <FieldShell column={column} error={error} inputId={inputId}>
      <input
        aria-describedby={error ? inputId + '-error' : undefined}
        className={inputClassName}
        disabled={disabled}
        id={inputId}
        onChange={handleChange}
        type={column.type === 'DateTime' ? 'datetime-local' : 'date'}
        value={inputValue}
      />
    </FieldShell>
  )
}
