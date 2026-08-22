import { FieldShell } from '@/fields/field-shell'
import type { FieldComponentProps } from '@/fields/types'

export function EnumListField({ column, disabled, error, onChange, value }: FieldComponentProps) {
  const inputId = 'field-' + encodeURIComponent(column.name)
  const selected: readonly string[] = Array.isArray(value) ? value : []

  if (!column.values || column.values.length === 0) {
    return (
      <FieldShell column={column} error={error} inputId={inputId}>
        <textarea
          aria-describedby={error ? inputId + '-error' : undefined}
          className="min-h-28 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-ink-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          disabled={disabled}
          id={inputId}
          onChange={(event) =>
            onChange(event.target.value.split(',').map((item) => item.trim()).filter(Boolean))
          }
          placeholder="Separa cada opción con una coma"
          value={selected.join(', ')}
        />
      </FieldShell>
    )
  }

  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((selectedOption) => selectedOption !== option)
        : [...selected, option],
    )
  }

  return (
    <FieldShell column={column} error={error} inputId={inputId}>
      <div
        aria-describedby={error ? inputId + '-error' : undefined}
        className="grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-black/10 bg-white p-2"
        id={inputId}
      >
        {column.values.map((option) => (
          <label
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-brand-50"
            key={option}
          >
            <input
              checked={selected.includes(option)}
              className="mt-0.5 size-5 accent-brand-600"
              disabled={disabled}
              onChange={() => toggle(option)}
              type="checkbox"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </FieldShell>
  )
}
