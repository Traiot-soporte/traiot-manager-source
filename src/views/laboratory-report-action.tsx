import { FileText, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

import logoUrl from '../../logo.jpeg'
import { useRepository } from '@/data/use-repository'
import type { RowData } from '@/schema'
import {
  buildLaboratoryDiagnosticHtml,
  buildLaboratoryPdfFilename,
  laboratoryImageColumns,
} from '@/views/laboratory-report'

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
      await downloadPdfDocument(html, buildLaboratoryPdfFilename(row))
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

async function downloadPdfDocument(html: string, filename: string): Promise<void> {
  const parsedDocument = new DOMParser().parseFromString(html, 'text/html')
  const reportSource = parsedDocument.querySelector<HTMLElement>('#traiot-laboratory-pdf')
  const reportStyles = parsedDocument.querySelector('style')?.textContent
  if (!reportSource || !reportStyles) throw new Error('PDF document unavailable')

  const style = document.createElement('style')
  style.dataset.traiotLaboratoryPdf = 'true'
  style.textContent = reportStyles
  document.head.appendChild(style)

  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.position = 'fixed'
  host.style.left = '-10000px'
  host.style.top = '0'
  host.style.width = '210mm'
  host.style.background = '#ffffff'
  host.style.pointerEvents = 'none'
  const report = document.importNode(reportSource, true)
  host.appendChild(report)
  document.body.appendChild(host)
  try {
    await waitForImages(report)
    const { default: html2pdf } = await import('html2pdf.js')
    await html2pdf().set({
      margin: 0,
      filename,
      enableLinks: true,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(report).save()
  } finally {
    host.remove()
    style.remove()
  }
}

async function waitForImages(root: ParentNode): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'))
  await Promise.all(images.map(async (image) => {
    if (image.complete) return
    await new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
    })
  }))
  await new Promise<void>((resolve) => window.setTimeout(resolve, 100))
}
