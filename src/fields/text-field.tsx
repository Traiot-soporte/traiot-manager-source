import type { ChangeEvent } from 'react'

import { FieldShell, inputClassName } from '@/fields/field-shell'
import type { FieldComponentProps } from '@/fields/types'

const inputTypes = {
  Email: 'email',
  Phone: 'tel',
  Url: 'url',
} as const

export function TextField({ column, disabled, error, onChange, value }: FieldComponentProps) {
  const inputId = 'field-' + encodeURIComponent(column.name)
  const stringValue = typeof value === 'string' ? value : ''
  const isMultiline = column.type === 'LongText' || column.type === 'Address'
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(event.target.value)
  }

  return (
    <FieldShell column={column} error={error} inputId={inputId}>
      {isMultiline ? (
        <textarea
          aria-describedby={error ? inputId + '-error' : undefined}
          className={inputClassName + ' min-h-28 resize-y py-3'}
          disabled={disabled}
          id={inputId}
          onChange={handleChange}
          placeholder={'Captura ' + (column.label ?? column.name).toLocaleLowerCase('es-MX')}
          value={stringValue}
        />
      ) : (
        <input
          aria-describedby={error ? inputId + '-error' : undefined}
          className={inputClassName}
          disabled={disabled}
          id={inputId}
          onChange={handleChange}
          placeholder={'Captura ' + (column.label ?? column.name).toLocaleLowerCase('es-MX')}
          type={inputTypes[column.type as keyof typeof inputTypes] ?? 'text'}
          value={stringValue}
        />
      )}
    </FieldShell>
  )
}
