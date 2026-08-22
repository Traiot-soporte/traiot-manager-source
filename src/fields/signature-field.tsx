import { Eraser } from 'lucide-react'
import { useEffect, useRef } from 'react'
import SignaturePad from 'signature_pad'

import { FieldShell } from '@/fields/field-shell'
import type { FieldComponentProps } from '@/fields/types'

export function SignatureField({ column, disabled, error, onChange, value }: FieldComponentProps) {
  const inputId = 'field-' + encodeURIComponent(column.name)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const signatureRef = useRef<SignaturePad>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const signature = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(25, 25, 25)',
      minWidth: 1,
      maxWidth: 3,
    })
    signatureRef.current = signature

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = 180 * ratio
      canvas.getContext('2d')?.scale(ratio, ratio)
      signature.clear()
      if (typeof value === 'string' && value.startsWith('data:image/')) {
        void signature.fromDataURL(value, { ratio, width: canvas.offsetWidth, height: 180 })
      }
    }
    const save = () => {
      if (!signature.isEmpty()) {
        onChangeRef.current(signature.toDataURL('image/png'))
      }
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    signature.addEventListener('endStroke', save)
    resize()

    if (disabled) {
      signature.off()
    }

    return () => {
      observer.disconnect()
      signature.removeEventListener('endStroke', save)
      signature.off()
      signatureRef.current = null
    }
    // El valor inicial se restaura al crear el pad; los trazos no deben reiniciarlo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled])

  const clear = () => {
    signatureRef.current?.clear()
    onChange(undefined)
  }

  return (
    <FieldShell column={column} error={error} inputId={inputId}>
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <canvas
          aria-label="Área para dibujar la firma"
          className="h-[180px] w-full touch-none"
          id={inputId}
          ref={canvasRef}
        />
      </div>
      <button
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-ink-800"
        disabled={disabled}
        onClick={clear}
        type="button"
      >
        <Eraser className="size-4" />
        Limpiar firma
      </button>
    </FieldShell>
  )
}
