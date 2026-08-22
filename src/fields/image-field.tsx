import { ImagePlus, X } from 'lucide-react'
import { type ChangeEvent, useState } from 'react'

import { FieldShell } from '@/fields/field-shell'
import type { FieldComponentProps } from '@/fields/types'
import { prepareImageDataUrl } from '@/lib/image-data-url'

export function ImageField({ column, disabled, error, onChange, value }: FieldComponentProps) {
  const [fileError, setFileError] = useState<string>()
  const [preparing, setPreparing] = useState(false)
  const inputId = 'field-' + encodeURIComponent(column.name)
  const imageValue = typeof value === 'string' ? value : ''
  const hasPreview = imageValue.startsWith('data:image/') || imageValue.startsWith('blob:')

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setFileError(undefined)
    setPreparing(true)
    try {
      onChange(await prepareImageDataUrl(file))
    } catch (caught) {
      setFileError(caught instanceof Error ? caught.message : 'No fue posible preparar la imagen.')
    } finally {
      setPreparing(false)
    }
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
        className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-brand-500 bg-brand-50 px-4 text-sm font-black text-brand-600"
        htmlFor={inputId}
      >
        <ImagePlus className="size-5" />
        {preparing ? 'Preparando imagen…' : hasPreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
      </label>
      <input
        accept="image/*"
        className="sr-only"
        disabled={disabled || preparing}
        id={inputId}
        onChange={(event) => void readFile(event)}
        type="file"
      />
      {imageValue && !hasPreview && (
        <p className="text-xs font-semibold text-ink-800/50">
          Archivo existente: {imageValue}
        </p>
      )}
      {fileError && <p className="text-xs font-bold text-red-700">{fileError}</p>}
    </FieldShell>
  )
}
