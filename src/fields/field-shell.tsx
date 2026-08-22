import type { PropsWithChildren } from 'react'

import type { ColumnDef } from '@/schema'

interface FieldShellProps extends PropsWithChildren {
  readonly column: ColumnDef
  readonly error?: string | undefined
  readonly inputId: string
}

export const inputClassName =
  'min-h-12 w-full rounded-xl border border-black/10 bg-white px-3.5 text-base text-ink-950 outline-none transition placeholder:text-ink-800/30 focus:border-mint-500 focus:ring-4 focus:ring-mint-100 disabled:cursor-not-allowed disabled:bg-black/5 disabled:text-ink-800/45'

export function FieldShell({ children, column, error, inputId }: FieldShellProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-black text-ink-950" htmlFor={inputId}>
        {column.label ?? column.name}
        {column.required && <span className="ml-1 text-red-600">*</span>}
      </label>
      {column.description && (
        <p className="text-xs leading-5 text-ink-800/50">{column.description}</p>
      )}
      {children}
      {error && (
        <p className="text-sm font-semibold text-red-700" id={inputId + '-error'} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
