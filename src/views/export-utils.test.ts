import { describe, expect, it } from 'vitest'

import { almacenTable } from '@/schema/tables/almacen'
import { buildExcelXml, buildExportDataset, buildPrintableHtml, getExportColumns } from '@/views/export-utils'

describe('exportaciones operativas', () => {
  it('exporta campos de negocio y excluye metadatos técnicos', () => {
    const names = getExportColumns(almacenTable).map((column) => column.name)
    expect(names).toContain('ID PRODUCTO')
    expect(names).toContain('COSTO')
    expect(names).not.toContain('_uuid')
    expect(names).not.toContain('producto_uuid')
  })

  it('genera archivos compatibles y escapa contenido', () => {
    const dataset = buildExportDataset(almacenTable, [{
      'ID PRODUCTO': 'GPS <100>',
      NOMBRE: 'Equipo & sensor',
    }])
    const excel = buildExcelXml('Almacén', dataset)
    const pdf = buildPrintableHtml('Almacén', dataset)

    expect(excel).toContain('urn:schemas-microsoft-com:office:spreadsheet')
    expect(excel).toContain('GPS &lt;100&gt;')
    expect(pdf).toContain('<table>')
    expect(pdf).toContain('Equipo &amp; sensor')
  })
})
