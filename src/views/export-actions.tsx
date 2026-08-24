import { FileSpreadsheet, FileText, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

import { useRepository } from '@/data/use-repository'
import type { RowData, TableDef } from '@/schema'
import { getTableDefinition, getTableDisplayName } from '@/schema'
import { buildExcelXml, buildExportDataset, buildPrintableHtml, canExportTable, getExportColumns } from '@/views/export-utils'
import { getRowTitle } from '@/views/view-utils'

export function ExportActions({ rows, table }: { readonly rows: readonly RowData[]; readonly table: TableDef }) {
  const repository = useRepository()
  const [busy, setBusy] = useState<'excel' | 'pdf'>()
  const [error, setError] = useState('')

  if (!canExportTable(table.name)) return null

  const prepare = async () => {
    const referenceTables = [...new Set(getExportColumns(table)
      .map((column) => column.ref?.table)
      .filter((value): value is string => Boolean(value)))]
    const labels = new Map<string, ReadonlyMap<string, string>>()
    await Promise.all(referenceTables.map(async (tableName) => {
      const definition = getTableDefinition(tableName)
      if (!definition) return
      const referenceRows = await repository.list(tableName)
      labels.set(tableName, new Map(referenceRows.map((row) => [
        String(row._uuid ?? ''),
        getRowTitle(definition, row),
      ])))
    }))
    return buildExportDataset(table, rows, labels)
  }

  const exportExcel = async () => {
    setBusy('excel'); setError('')
    try {
      const dataset = await prepare()
      downloadBlob(
        buildExcelXml(getTableDisplayName(table), dataset),
        exportFilename(table, 'xls'),
        'application/vnd.ms-excel;charset=utf-8',
      )
    } catch {
      setError('No fue posible generar Excel.')
    } finally {
      setBusy(undefined)
    }
  }

  const exportPdf = async () => {
    setBusy('pdf'); setError('')
    try {
      const dataset = await prepare()
      printHtml(buildPrintableHtml(getTableDisplayName(table), dataset))
    } catch {
      setError('No fue posible preparar el PDF.')
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-black text-ink-950 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50" disabled={Boolean(busy)} onClick={() => void exportExcel()} type="button">
        {busy === 'excel' ? <LoaderCircle className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />} Excel
      </button>
      <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-black text-ink-950 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50" disabled={Boolean(busy)} onClick={() => void exportPdf()} type="button">
        {busy === 'pdf' ? <LoaderCircle className="size-4 animate-spin" /> : <FileText className="size-4" />} PDF
      </button>
      {error && <span className="w-full text-right text-xs font-bold text-red-200">{error}</span>}
    </div>
  )
}

function exportFilename(table: TableDef, extension: string): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return getTableDisplayName(table).replace(/[^a-z0-9áéíóúñ]+/gi, '-') + '-' + stamp + '.' + extension
}

function downloadBlob(content: string, filename: string, type: string) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([content], { type }))
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(link.href)
}

function printHtml(html: string) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  document.body.appendChild(frame)
  const documentToPrint = frame.contentDocument
  if (!documentToPrint || !frame.contentWindow) throw new Error('Print frame unavailable')
  documentToPrint.open()
  documentToPrint.write(html)
  documentToPrint.close()
  window.setTimeout(() => {
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
    window.setTimeout(() => frame.remove(), 1000)
  }, 100)
}
