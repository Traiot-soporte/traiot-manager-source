import { describe, expect, it } from 'vitest'

import { almacenTable } from '@/schema/tables/almacen'
import { comprasTable } from '@/schema/tables/compras'
import { buildExportBaseName, buildExportDataset, buildPrintableHtml, buildXlsxBytes, getExportColumns } from '@/views/export-utils'

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
    const excel = buildXlsxBytes('Almacén', dataset)
    const pdf = buildPrintableHtml('Almacén', dataset)

    expect([...excel.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04])
    expect(new TextDecoder().decode(excel)).toContain('xl/worksheets/sheet1.xml')
    expect(pdf).toContain('<table>')
    expect(pdf).toContain('Equipo &amp; sensor')
  })

  it('omite campos retirados de Compras y genera el nombre solicitado', () => {
    const names = getExportColumns(comprasTable).map((column) => column.name)

    expect(names).not.toContain('COSTO DE ENVIO')
    expect(names).not.toContain('ESTATUS COMPRA')
    expect(names).not.toContain('VALIDADOR COMPRA')
    expect(buildExportBaseName('COMPRAS', new Date(2026, 7, 24))).toBe('COMPRAS_2026-08-24')
  })
})
