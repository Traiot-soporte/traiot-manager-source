import { ImagePlus, X } from 'lucide-react'
import type { ChangeEvent } from 'react'

import { FieldShell } from '@/fields/field-shell'
import type { FieldComponentProps } from '@/fields/types'

export function ImageField({ column, disabled, error, onChange, value }: FieldComponentProps) {
  const inputId = 'field-' + encodeURIComponent(column.name)
  const imageValue = typeof value === 'string' ? value : ''
  const hasPreview = imageValue.startsWith('data:image/') || imageValue.startsWith('blob:')

  const readFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result)
      }
    })
    reader.readAsDataURL(file)
  }

  return (
    <FieldShell column={column} error={error} inputId={inputId}>
      {hasPreview && (
        <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-black/5">
          <img alt={'Vista previa de ' + (column.label ?? column.name)} className="h-52 w-full object-cover" src={imageValue} />
          <button
            aria-label="Quitar imagen"
            className="absolute right-3 top-3 grid min-h-11 min-w-11 place-items-center rounded-full bg-ink-950 text-white"
            onClick={() => onChange(undefined)}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>
      )}
      <label
        className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-mint-500 bg-mint-50 px-4 text-sm font-black text-mint-600"
        htmlFor={inputId}
      >
        <ImagePlus className="size-5" />
        {hasPreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
      </label>
      <input
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        id={inputId}
        onChange={readFile}
        type="file"
      />
      {imageValue && !hasPreview && (
        <p className="text-xs font-semibold text-ink-800/50">
          Archivo existente: {imageValue}
        </p>
      )}
    </FieldShell>
  )
}
