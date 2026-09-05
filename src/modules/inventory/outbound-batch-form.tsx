import { Plus, Save, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { inputClassName } from '@/fields/field-shell'
import { useUnsavedChangesPrompt } from '@/lib/use-unsaved-changes-prompt'
import type { RowData } from '@/schema'
import { orderCustomerTypes, orderTypes } from '@/schema/catalogs'

interface OutboundBatchFormProps {
  readonly cancelTo: string
  readonly clients: readonly RowData[]
  readonly clientsLoading: boolean
  readonly products: readonly RowData[]
  readonly productsLoading: boolean
  readonly onSubmit: (rows: readonly RowData[]) => Promise<void>
}

interface OutboundLine {
  readonly key: number
  readonly productUuid: string
  readonly quantity: string
  readonly comments: string
}

let nextLineKey = 1

function emptyLine(): OutboundLine {
  return { key: nextLineKey++, productUuid: '', quantity: '', comments: '' }
}

export function OutboundBatchForm({
  cancelTo,
  clients,
  clientsLoading,
  onSubmit,
  products,
  productsLoading,
}: OutboundBatchFormProps) {
  const [initialDate] = useState(todayInMexicoCity)
  const [date, setDate] = useState(initialDate)
  const [orderType, setOrderType] = useState('')
  const [customerType, setCustomerType] = useState('')
  const [clientUuid, setClientUuid] = useState('')
  const [lines, setLines] = useState<readonly OutboundLine[]>([emptyLine()])
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string>()
  const availableProducts = [...products]
    .filter((product) => !isDeleted(product) && product._uuid)
    .sort((left, right) => productLabel(left).localeCompare(productLabel(right), 'es'))
  const availableClients = [...clients]
    .filter((client) => !isDeleted(client) && client._uuid)
    .sort((left, right) => clientLabel(left).localeCompare(clientLabel(right), 'es'))
  const totalUnits = lines.reduce((total, line) => total + positiveInteger(line.quantity), 0)
  const dirty = date !== initialDate || orderType !== '' || customerType !== '' || clientUuid !== '' ||
    lines.length > 1 || lines.some((line) =>
      line.productUuid !== '' || line.quantity !== '' || line.comments !== '',
    )
  const navigationPrompt = useUnsavedChangesPrompt(dirty)

  const updateLine = (key: number, changes: Partial<OutboundLine>) => {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...changes } : line))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(undefined)

    if (!date) {
      setSubmitError('Selecciona la fecha de salida.')
      return
    }

    const selectedUuids = lines.map((line) => line.productUuid).filter(Boolean)
    if (selectedUuids.length !== lines.length) {
      setSubmitError('Selecciona un producto en cada renglón.')
      return
    }
    if (new Set(selectedUuids).size !== selectedUuids.length) {
      setSubmitError('Cada producto debe aparecer una sola vez en la salida.')
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
      const stock = Number(product.STOCK ?? 0)
      if (Number.isFinite(stock) && quantity > stock) {
        setSubmitError('La salida de ' + productLabel(product) + ' supera las ' + stock + ' unidades disponibles.')
        return
      }
      const category = String(product.CATEGORIA ?? '').trim()
      if (!category) {
        setSubmitError('El producto ' + productLabel(product) + ' no tiene categoría en Almacén.')
        return
      }
      rows.push({
        FECHA: date,
        'TIPO DE PEDIDO': orderType,
        'TIPO CLIENTE': customerType,
        'RAZON SOCIAL': clientUuid,
        cliente_uuid: clientUuid,
        'ID PRODUCTO': line.productUuid,
        producto_uuid: line.productUuid,
        CATEGORIA: category,
        'EQUIPOS A VENDER': quantity,
        COMENTARIOS: line.comments.trim(),
      })
    }

    setSaving(true)
    navigationPrompt.allowNavigation()
    try {
      await onSubmit(rows)
    } catch (error) {
      navigationPrompt.protectNavigation()
      setSubmitError(error instanceof Error ? error.message : 'No fue posible registrar la salida.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={(event) => void submit(event)}>
      <fieldset className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-7">
        <legend className="px-2 text-lg font-black text-ink-950">Datos generales de las salidas</legend>
        <p className="mt-2 text-sm font-semibold text-ink-800/55">
          Estos datos se aplicarán a todos los productos incluidos en esta operación.
        </p>
        <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 text-sm font-black uppercase text-ink-950">
            Fecha de salida <span className="text-red-600">*</span>
            <input className={inputClassName} onChange={(event) => setDate(event.target.value)} type="date" value={date} />
          </label>
          <label className="space-y-2 text-sm font-black uppercase text-ink-950">
            Tipo de pedido
            <select className={inputClassName} onChange={(event) => setOrderType(event.target.value)} value={orderType}>
              <option value="">Selecciona una opción</option>
              {orderTypes.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-black uppercase text-ink-950">
            Tipo de cliente
            <select className={inputClassName} onChange={(event) => setCustomerType(event.target.value)} value={customerType}>
              <option value="">Selecciona una opción</option>
              {orderCustomerTypes.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-black uppercase text-ink-950">
            Empresa
            <select
              className={inputClassName}
              disabled={clientsLoading}
              onChange={(event) => setClientUuid(event.target.value)}
              value={clientUuid}
            >
              <option value="">{clientsLoading ? 'Cargando empresas...' : 'Selecciona una empresa'}</option>
              {availableClients.map((client) => (
                <option key={String(client._uuid)} value={String(client._uuid)}>{clientLabel(client)}</option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <legend className="text-lg font-black text-ink-950">Productos de la salida</legend>
            <p className="mt-1 text-sm font-semibold text-ink-800/55">
              Cada renglón generará su propio folio, comentario y movimiento independiente en Kardex.
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
            const selectedElsewhere = new Set(lines
              .filter((candidate) => candidate.key !== line.key)
              .map((candidate) => candidate.productUuid))

            return (
              <section className="grid gap-3 rounded-2xl border border-black/8 bg-black/[0.015] p-4 lg:grid-cols-[minmax(14rem,1fr)_9rem_minmax(16rem,1fr)_auto] lg:items-end" key={line.key}>
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
                  {product && (
                    <span className="block text-xs font-bold normal-case text-brand-700">
                      Categoría: {String(product.CATEGORIA ?? 'Sin categoría')} · Existencia: {String(product.STOCK ?? 0)}
                    </span>
                  )}
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
                <label className="space-y-2 text-sm font-black uppercase text-ink-950">
                  Comentario de esta salida
                  <textarea
                    className={inputClassName + ' min-h-12 resize-y py-3'}
                    onChange={(event) => updateLine(line.key, { comments: event.target.value })}
                    placeholder="Comentario exclusivo de este producto"
                    rows={2}
                    value={line.comments}
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
          {lines.length} {lines.length === 1 ? 'salida' : 'salidas'} · {totalUnits.toLocaleString('es-MX')} unidades en total
        </p>
      </fieldset>

      {submitError && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800" role="alert">{submitError}</p>}

      <div className="sticky bottom-20 z-10 flex flex-col-reverse gap-3 rounded-2xl border border-black/10 bg-white/95 p-3 shadow-2xl shadow-ink-950/10 backdrop-blur sm:flex-row sm:justify-end lg:bottom-4">
        <Link className="inline-flex min-h-12 items-center justify-center rounded-xl border border-black/10 px-5 text-sm font-black text-ink-800" to={cancelTo}>Cancelar</Link>
        <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink-950 px-6 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60" disabled={saving || productsLoading || clientsLoading} type="submit">
          <Save className="size-4" /> {saving ? 'Registrando...' : 'Registrar ' + (lines.length === 1 ? 'salida' : lines.length + ' salidas')}
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

function clientLabel(client: RowData): string {
  const company = String(client['RAZON SOCIAL'] ?? '').trim()
  const id = String(client['ID CLIENTE'] ?? '').trim()
  return company && id ? company + ' · ' + id : company || id || 'Empresa sin nombre'
}

function isDeleted(row: RowData): boolean {
  return row._deleted === true || String(row._deleted ?? '').toLowerCase() === 'true'
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
