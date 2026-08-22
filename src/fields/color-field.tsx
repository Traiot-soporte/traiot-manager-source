import { FieldShell, inputClassName } from '@/fields/field-shell'
import type { FieldComponentProps } from '@/fields/types'

const colorMap: Readonly<Record<string, string>> = {
  Green: '#22c55e',
  Yellow: '#eab308',
  Orange: '#f97316',
  Red: '#ef4444',
  Purple: '#a855f7',
  Blue: '#3b82f6',
  White: '#ffffff',
  Black: '#111827',
}

export function ColorField({ column, disabled, error, onChange, value }: FieldComponentProps) {
  const inputId = 'field-' + encodeURIComponent(column.name)
  const stringValue = typeof value === 'string' ? value : ''

  return (
    <FieldShell column={column} error={error} inputId={inputId}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="size-11 shrink-0 rounded-xl border border-black/15"
          style={{ backgroundColor: colorMap[stringValue] ?? '#f4f7f6' }}
        />
        <select
          className={inputClassName}
          disabled={disabled}
          id={inputId}
          onChange={(event) => onChange(event.target.value)}
          value={stringValue}
        >
          <option value="">Selecciona un color</option>
          {column.values?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </FieldShell>
  )
}
