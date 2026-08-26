import { Plus, Save, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { inputClassName } from '@/fields/field-shell'
import type { RowData } from '@/schema'

interface PurchaseBatchFormProps {
  readonly cancelTo: string
  readonly products: readonly RowData[]
  readonly productsLoading: boolean
  readonly onSubmit: (rows: readonly RowData[]) => Promise<void>
}

interface PurchaseLine {
  readonly key: number
  readonly productUuid: string
  readonly quantity: string
}

let nextLineKey = 1

function emptyLine(): PurchaseLine {
  return { key: nextLineKey++, productUuid: '', quantity: '' }
}

export function PurchaseBatchForm({
  cancelTo,
  onSubmit,
  products,
  productsLoading,
}: PurchaseBatchFormProps) {
  const [date, setDate] = useState(todayInMexicoCity)
  const [comments, setComments] = useState('')
  const [lines, setLines] = useState<readonly PurchaseLine[]>([emptyLine()])
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string>()
  const availableProducts = [...products]
    .filter((product) => !isDeleted(product) && product._uuid)
    .sort((left, right) => productLabel(left).localeCompare(productLabel(right), 'es'))
  const totalUnits = lines.reduce((total, line) => total + positiveInteger(line.quantity), 0)

  const updateLine = (key: number, changes: Partial<PurchaseLine>) => {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...changes } : line))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(undefined)

    if (!date) {
      setSubmitError('Selecciona la fecha de compra.')
      return
    }

    const selectedUuids = lines.map((line) => line.productUuid).filter(Boolean)
    if (selectedUuids.length !== lines.length) {
      setSubmitError('Selecciona un producto en cada renglón.')
      return
    }
    if (new Set(selectedUuids).size !== selectedUuids.length) {
      setSubmitError('Cada producto debe aparecer una sola vez en la compra.')
      return
    }

    const rows: RowData[] = []
    for (const line of lines) {
      const product = availableProducts.find((candidate) => candidate._uuid === line.productUuid)
      const quantity = positiveInteger(line.quantity)
      if (!product || !quantity) {
        setSubmitError('Captura una cantidad entera mayor a cero para cada producto.')
        return
      }
      const category = String(product.CATEGORIA ?? '').trim()
      if (!category) {
        setSubmitError('El producto ' + productLabel(product) + ' no tiene categoría en Almacén.')
        return
      }
      rows.push({
        'FECHA COMPRA': date,
        'ID PRODUCTO': line.productUuid,
        producto_uuid: line.productUuid,
        CATEGORIA: category,
        CANTIDAD: quantity,
        COMENTARIOS: comments.trim(),
      })
    }

    setSaving(true)
    try {
      await onSubmit(rows)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No fue posible registrar la compra.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={(event) => void submit(event)}>
      <fieldset className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-7">
        <legend className="px-2 text-lg font-black text-ink-950">Datos de la compra</legend>
        <div className="mt-3 grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm font-black uppercase text-ink-950">
            Fecha de compra <span className="text-red-600">*</span>
            <input className={inputClassName} onChange={(event) => setDate(event.target.value)} type="date" value={date} />
          </label>
          <label className="space-y-2 text-sm font-black uppercase text-ink-950">
            Comentarios generales
            <input className={inputClassName} onChange={(event) => setComments(event.target.value)} placeholder="Se copiaran en cada registro" value={comments} />
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <legend className="text-lg font-black text-ink-950">Productos de la compra</legend>
            <p className="mt-1 text-sm font-semibold text-ink-800/55">
              Cada renglón generará su propio folio TRT y su entrada independiente al inventario.
            </p>
          </div>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-300 px-4 text-sm font-black text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={lines.length >= availableProducts.length}
            onClick={() => setLines((current) => [...current, emptyLine()])}
            type="button"
          >
            <Plus className="size-4" /> Agregar producto
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {lines.map((line, index) => {
            const product = availableProducts.find((candidate) => candidate._uuid === line.productUuid)
            const selectedElsewhere = new Set(lines.filter((candidate) => candidate.key !== line.key).map((candidate) => candidate.productUuid))

            return (
              <section className="grid gap-3 rounded-2xl border border-black/8 bg-black/[0.015] p-4 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-end" key={line.key}>
                <label className="space-y-2 text-sm font-black uppercase text-ink-950">
                  Producto {index + 1} <span className="text-red-600">*</span>
                  <select
                    className={inputClassName}
                    disabled={productsLoading}
                    onChange={(event) => updateLine(line.key, { productUuid: event.target.value })}
                    value={line.productUuid}
                  >
                    <option value="">{productsLoading ? 'Cargando productos...' : 'Selecciona un producto'}</option>
                    {availableProducts.map((candidate) => {
                      const uuid = String(candidate._uuid)
                      return <option disabled={selectedElsewhere.has(uuid)} key={uuid} value={uuid}>{productLabel(candidate)}</option>
                    })}
                  </select>
                  {product && <span className="block text-xs font-bold normal-case text-brand-700">Categoría: {String(product.CATEGORIA ?? 'Sin categoría')}</span>}
                </label>
                <label className="space-y-2 text-sm font-black uppercase text-ink-950">
                  Cantidad <span className="text-red-600">*</span>
                  <input
                    className={inputClassName}
                    inputMode="numeric"
                    min="1"
                    onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                    step="1"
                    type="number"
                    value={line.quantity}
                  />
                </label>
                <button
                  aria-label={'Quitar producto ' + (index + 1)}
                  className="grid min-h-12 min-w-12 place-items-center rounded-xl border border-red-200 text-red-700 disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={lines.length === 1}
                  onClick={() => setLines((current) => current.filter((candidate) => candidate.key !== line.key))}
                  type="button"
                >
                  <Trash2 className="size-5" />
                </button>
              </section>
            )
          })}
        </div>

        <p className="mt-4 text-sm font-bold text-ink-800/55">
          {lines.length} {lines.length === 1 ? 'registro' : 'registros'} · {totalUnits.toLocaleString('es-MX')} unidades en total
        </p>
      </fieldset>

      {submitError && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800" role="alert">{submitError}</p>}

      <div className="sticky bottom-20 z-10 flex flex-col-reverse gap-3 rounded-2xl border border-black/10 bg-white/95 p-3 shadow-2xl shadow-ink-950/10 backdrop-blur sm:flex-row sm:justify-end lg:bottom-4">
        <Link className="inline-flex min-h-12 items-center justify-center rounded-xl border border-black/10 px-5 text-sm font-black text-ink-800" to={cancelTo}>Cancelar</Link>
        <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink-950 px-6 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60" disabled={saving || productsLoading} type="submit">
          <Save className="size-4" /> {saving ? 'Registrando...' : 'Registrar ' + (lines.length === 1 ? 'compra' : lines.length + ' compras')}
        </button>
      </div>
    </form>
  )
}

function positiveInteger(value: string): number {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : 0
}

function productLabel(product: RowData): string {
  const id = String(product['ID PRODUCTO'] ?? '').trim()
  const name = String(product.NOMBRE ?? '').trim()
  return name && name !== id ? id + ' · ' + name : id || 'Producto sin ID'
}

function isDeleted(product: RowData): boolean {
  return product._deleted === true || String(product._deleted ?? '').toLowerCase() === 'true'
}

function todayInMexicoCity(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Mexico_City',
    year: 'numeric',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return value.year + '-' + value.month + '-' + value.day
}
