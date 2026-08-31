import { FileText, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

import logoUrl from '../../logo.jpeg'
import { useRepository } from '@/data/use-repository'
import type { RowData } from '@/schema'
import { buildLaboratoryDiagnosticHtml, laboratoryImageColumns } from '@/views/laboratory-report'

export function LaboratoryReportAction({ row }: { readonly row: RowData }) {
  const repository = useRepository()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const exportReport = async () => {
    setBusy(true)
    setError('')
    try {
      const [logoData, generatedBy, clients, imageEntries] = await Promise.all([
        loadAsDataUrl(logoUrl),
        repository.getCurrentUser(),
        repository.list('CLIENTES'),
        Promise.all(laboratoryImageColumns.map(async (column) => {
          const storedValue = String(row[column] ?? '').trim()
          if (!storedValue) return [column, undefined] as const
          return [column, await repository.getMedia('Laboratorio', storedValue)] as const
        })),
      ])
      const clientKey = String(row.cliente_uuid ?? row.CLIENTE ?? '').trim()
      const client = clients.find((candidate) => String(candidate._uuid ?? '') === clientKey)
      const clientName = client
        ? [String(client['RAZON SOCIAL'] ?? '').trim(), String(client['ID CLIENTE'] ?? '').trim()].filter(Boolean).join(' · ')
        : String(row.CLIENTE ?? '').trim()
      const html = buildLaboratoryDiagnosticHtml({
        row,
        imageData: Object.fromEntries(imageEntries),
        logoData,
        clientName,
        generatedBy,
      })
      await printHtmlDocument(html)
    } catch {
      setError('No fue posible preparar el diagnóstico. Intenta nuevamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-xs font-black text-[#191919] transition hover:bg-brand-400 disabled:cursor-wait disabled:opacity-60"
        disabled={busy}
        onClick={() => void exportReport()}
        type="button"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <FileText className="size-4" />}
        {busy ? 'PREPARANDO…' : 'PDF DIAGNÓSTICO'}
      </button>
      {error && <span className="max-w-56 text-right text-[10px] font-bold text-red-200">{error}</span>}
    </div>
  )
}

async function loadAsDataUrl(source: string): Promise<string | undefined> {
  if (source.startsWith('data:')) return source
  const response = await fetch(source)
  if (!response.ok) return undefined
  const blob = await response.blob()
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('No fue posible leer el logotipo.'))
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined)
    reader.readAsDataURL(blob)
  })
}

async function printHtmlDocument(html: string): Promise<void> {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  document.body.appendChild(frame)
  const printDocument = frame.contentDocument
  const printWindow = frame.contentWindow
  if (!printDocument || !printWindow) {
    frame.remove()
    throw new Error('Print frame unavailable')
  }
  printDocument.open()
  printDocument.write(html)
  printDocument.close()
  await waitForImages(printDocument)
  printWindow.focus()
  printWindow.print()
  window.setTimeout(() => frame.remove(), 1500)
}

async function waitForImages(documentToPrint: Document): Promise<void> {
  const images = Array.from(documentToPrint.images)
  await Promise.all(images.map(async (image) => {
    if (image.complete) return
    await new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
    })
  }))
  await new Promise<void>((resolve) => window.setTimeout(resolve, 100))
}
