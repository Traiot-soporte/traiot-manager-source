import type { ColumnDef, RowData, TableDef } from '@/schema'

export interface ExportDataset {
  readonly columns: readonly ColumnDef[]
  readonly rows: readonly (readonly string[])[]
}

const exportTables = new Set(['ALMACEN', 'COMPRAS', 'PEDIDOS'])

export function canExportTable(tableName: string): boolean {
  return exportTables.has(tableName)
}

export function getExportColumns(table: TableDef): readonly ColumnDef[] {
  return table.columns.filter((column) =>
    (column.origin ?? 'appsheet') === 'appsheet' &&
    !column.virtual &&
    !column.sensitive &&
    column.type !== 'Show' &&
    column.type !== 'List',
  )
}

export function buildExportDataset(
  table: TableDef,
  rows: readonly RowData[],
  referenceLabels: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map(),
): ExportDataset {
  const columns = getExportColumns(table)
  return {
    columns,
    rows: rows.map((row) => columns.map((column) => {
      const value = row[column.name]
      if (column.type === 'Ref' && column.ref?.table && typeof value === 'string') {
        return referenceLabels.get(column.ref.table)?.get(value) ?? value
      }
      if (Array.isArray(value)) return value.join(', ')
      if (value === null || value === undefined) return ''
      if (column.type === 'Bool') return value ? 'Sí' : 'No'
      return String(value)
    })),
  }
}

export function buildExcelXml(title: string, dataset: ExportDataset): string {
  const header = dataset.columns.map((column) =>
    '<Cell><Data ss:Type="String">' + escapeXml(column.label ?? column.name) + '</Data></Cell>',
  ).join('')
  const rows = dataset.rows.map((row) => '<Row>' + row.map((value) =>
    '<Cell><Data ss:Type="String">' + escapeXml(value) + '</Data></Cell>',
  ).join('') + '</Row>').join('')

  return '<?xml version="1.0"?>' +
    '<?mso-application progid="Excel.Sheet"?>' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ' +
    'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
    '<Worksheet ss:Name="' + escapeXml(safeWorksheetName(title)) + '"><Table>' +
    '<Row ss:StyleID="Header">' + header + '</Row>' + rows +
    '</Table></Worksheet>' +
    '<Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#E77C60" ss:Pattern="Solid"/></Style></Styles>' +
    '</Workbook>'
}

export function buildPrintableHtml(title: string, dataset: ExportDataset): string {
  const header = dataset.columns.map((column) => '<th>' + escapeHtml(column.label ?? column.name) + '</th>').join('')
  const body = dataset.rows.map((row) => '<tr>' + row.map((value) => '<td>' + escapeHtml(value) + '</td>').join('') + '</tr>').join('')
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' + escapeHtml(title) + '</title>' +
    '<style>@page{size:landscape;margin:10mm}body{font-family:Arial,sans-serif;color:#191919}h1{font-size:18px;margin:0 0 4px}.meta{font-size:11px;color:#666;margin-bottom:14px}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#191919;color:#fff;text-align:left}th,td{padding:6px;border:1px solid #ddd;vertical-align:top}tr:nth-child(even){background:#faf7f5}</style>' +
    '</head><body><h1>' + escapeHtml(title) + '</h1><p class="meta">' + dataset.rows.length +
    ' registros · Generado ' + escapeHtml(new Date().toLocaleString('es-MX')) +
    '</p><table><thead><tr>' + header + '</tr></thead><tbody>' + body + '</tbody></table></body></html>'
}

function safeWorksheetName(value: string): string {
  return value.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Datos'
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function escapeHtml(value: string): string {
  return escapeXml(value)
}
