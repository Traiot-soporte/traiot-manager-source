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
    column.exportable !== false &&
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

export function buildXlsxBlob(title: string, dataset: ExportDataset): Blob {
  const bytes = buildXlsxBytes(title, dataset)
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function buildXlsxBytes(title: string, dataset: ExportDataset): Uint8Array {
  const files = [
    {
      name: '[Content_Types].xml',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="' + escapeXml(safeWorksheetName(title)) + '" sheetId="1" r:id="rId1"/></sheets></workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>',
    },
    { name: 'xl/styles.xml', content: buildXlsxStyles() },
    { name: 'xl/worksheets/sheet1.xml', content: buildXlsxWorksheet(dataset) },
  ]
  return createStoredZip(files)
}

export function buildExportBaseName(tableName: string, date = new Date()): string {
  const localDate = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  return tableName.toLocaleUpperCase('es-MX').replace(/[^A-Z0-9ÁÉÍÓÚÑ]+/g, '_') + '_' + localDate
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

function buildXlsxWorksheet(dataset: ExportDataset): string {
  const headerCells = dataset.columns.map((column, index) =>
    buildXlsxCell(index, 1, column.label ?? column.name, 'Text', true),
  ).join('')
  const rows = dataset.rows.map((row, rowIndex) => '<row r="' + String(rowIndex + 2) + '">' +
    row.map((value, columnIndex) => buildXlsxCell(
      columnIndex,
      rowIndex + 2,
      value,
      dataset.columns[columnIndex]?.type ?? 'Text',
      false,
    )).join('') + '</row>').join('')
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"/></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    '<sheetData><row r="1">' + headerCells + '</row>' + rows + '</sheetData>' +
    '<autoFilter ref="A1:' + columnLetters(Math.max(dataset.columns.length, 1)) + String(dataset.rows.length + 1) + '"/>' +
    '</worksheet>'
}

function buildXlsxCell(columnIndex: number, rowIndex: number, value: string, type: string, header: boolean): string {
  const reference = columnLetters(columnIndex + 1) + String(rowIndex)
  const style = header ? ' s="1"' : ''
  if (!header && (type === 'Number' || type === 'Price') && value !== '' && Number.isFinite(Number(value))) {
    return '<c r="' + reference + '" t="n"><v>' + escapeXml(value) + '</v></c>'
  }
  return '<c r="' + reference + '" t="inlineStr"' + style + '><is><t xml:space="preserve">' + escapeXml(value) + '</t></is></c>'
}

function columnLetters(index: number): string {
  let result = ''
  let current = index
  while (current > 0) {
    current -= 1
    result = String.fromCharCode(65 + (current % 26)) + result
    current = Math.floor(current / 26)
  }
  return result || 'A'
}

function buildXlsxStyles(): string {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF191919"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
    '</styleSheet>'
}

function createStoredZip(files: readonly { readonly name: string; readonly content: string }[]): Uint8Array {
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const entries: { readonly name: Uint8Array; readonly data: Uint8Array; readonly crc: number; readonly offset: number }[] = []
  let offset = 0
  const { date, time } = dosDateTime(new Date())

  for (const file of files) {
    const name = encoder.encode(file.name)
    const data = encoder.encode(file.content)
    const crc = crc32(data)
    const header = new Uint8Array(30 + name.length)
    const view = new DataView(header.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 0x0800, true)
    view.setUint16(8, 0, true)
    view.setUint16(10, time, true)
    view.setUint16(12, date, true)
    view.setUint32(14, crc, true)
    view.setUint32(18, data.length, true)
    view.setUint32(22, data.length, true)
    view.setUint16(26, name.length, true)
    view.setUint16(28, 0, true)
    header.set(name, 30)
    entries.push({ name, data, crc, offset })
    localParts.push(header, data)
    offset += header.length + data.length
  }

  const centralOffset = offset
  const centralParts = entries.map((entry) => {
    const header = new Uint8Array(46 + entry.name.length)
    const view = new DataView(header.buffer)
    view.setUint32(0, 0x02014b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 20, true)
    view.setUint16(8, 0x0800, true)
    view.setUint16(10, 0, true)
    view.setUint16(12, time, true)
    view.setUint16(14, date, true)
    view.setUint32(16, entry.crc, true)
    view.setUint32(20, entry.data.length, true)
    view.setUint32(24, entry.data.length, true)
    view.setUint16(28, entry.name.length, true)
    view.setUint32(42, entry.offset, true)
    header.set(entry.name, 46)
    return header
  })
  const centralSize = centralParts.reduce((total, part) => total + part.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, centralOffset, true)

  return concatenateBytes([...localParts, ...centralParts, end])
}

function concatenateBytes(parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(value: Date): { readonly date: number; readonly time: number } {
  const year = Math.max(value.getFullYear(), 1980)
  return {
    date: ((year - 1980) << 9) | ((value.getMonth() + 1) << 5) | value.getDate(),
    time: (value.getHours() << 11) | (value.getMinutes() << 5) | Math.floor(value.getSeconds() / 2),
  }
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function escapeHtml(value: string): string {
  return escapeXml(value)
}
