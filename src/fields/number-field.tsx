import type { ChangeEvent } from 'react'

import { FieldShell, inputClassName } from '@/fields/field-shell'
import type { FieldComponentProps } from '@/fields/types'

export function NumberField({ column, disabled, error, onChange, value }: FieldComponentProps) {
  const inputId = 'field-' + encodeURIComponent(column.name)
  const numericValue = typeof value === 'number' ? String(value) : ''
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value
    onChange(nextValue === '' ? undefined : Number(nextValue))
  }

  return (
    <FieldShell column={column} error={error} inputId={inputId}>
      <div className="relative">
        {column.type === 'Price' && (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center font-bold text-ink-800/40">
            $
          </span>
        )}
        <input
          aria-describedby={error ? inputId + '-error' : undefined}
          className={inputClassName + (column.type === 'Price' ? ' pl-8' : '')}
          disabled={disabled}
          id={inputId}
          inputMode="decimal"
          onChange={handleChange}
          step={column.type === 'Price' ? '0.01' : 'any'}
          type="number"
          value={numericValue}
        />
      </div>
    </FieldShell>
  )
}
