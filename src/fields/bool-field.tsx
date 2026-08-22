import { FieldShell } from '@/fields/field-shell'
import type { FieldComponentProps } from '@/fields/types'

export function BoolField({ column, disabled, error, onChange, value }: FieldComponentProps) {
  const inputId = 'field-' + encodeURIComponent(column.name)

  return (
    <FieldShell column={column} error={error} inputId={inputId}>
      <label
        className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-ink-800"
        htmlFor={inputId}
      >
        <input
          checked={value === true}
          className="size-5 accent-mint-600"
          disabled={disabled}
          id={inputId}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        {value === true ? 'Sí' : 'No'}
      </label>
    </FieldShell>
  )
}
