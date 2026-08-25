import { describe, expect, it } from 'vitest'

import { almacenTable } from '@/schema/tables/almacen'
import { clientesTable } from '@/schema/tables/clientes'
import { kardexTable } from '@/schema/tables/kardex'
import {
  getDisplayColumns,
  getListColumns,
  getNamedListColumns,
  getRowTitle,
  getTableViewColumns,
  warehouseCardColumnNames,
  warehouseDeckColumnNames,
} from '@/views/view-utils'

describe('utilidades de vistas genéricas', () => {
  it('oculta columnas técnicas y virtuales en el detalle', () => {
    const names = getDisplayColumns(clientesTable).map((column) => column.name)

    expect(names).toContain('ID CLIENTE')
    expect(names).not.toContain('_updatedAt')
    expect(names).not.toContain('Related INSTALACIONESs')
  })

  it('limita las columnas y excluye imágenes en colecciones', () => {
    const columns = getListColumns(clientesTable, 3)

    expect(columns).toHaveLength(3)
    expect(columns.every((column) => column.type !== 'Image')).toBe(true)
  })

  it('muestra categoria y existencias en la tabla de almacen', () => {
    const columns = getTableViewColumns(almacenTable)

    expect(columns.map((column) => column.name)).toEqual([
      'No. Item',
      'ID PRODUCTO',
      'PROVEEDOR',
      'NOMBRE',
      'CATEGORIA',
      'STOCK',
      'STOCK MINIMO',
      'STOCK MAXIMO',
      'AVISO DE COMPRA',
    ])
    expect(columns.find((column) => column.name === 'STOCK')?.label).toBe('EXISTENCIAS')
  })

  it('incluye existencias y categoria en tarjetas y lista de almacen', () => {
    expect(getNamedListColumns(almacenTable, warehouseCardColumnNames).map((column) => column.name)).toEqual([
      'NOMBRE',
      'CATEGORIA',
      'PROVEEDOR',
      'STOCK',
    ])
    expect(getNamedListColumns(almacenTable, warehouseDeckColumnNames).map((column) => column.name)).toEqual([
      'NOMBRE',
      'CATEGORIA',
      'STOCK',
      'PROVEEDOR',
    ])
  })

  it('usa la columna label como título del registro', () => {
    expect(getRowTitle(clientesTable, { _uuid: 'client-001', 'ID CLIENTE': 'CLI-001' })).toBe(
      'CLI-001',
    )
  })

  it('muestra los campos auditables del Kardex y oculta sus identificadores internos', () => {
    const names = getDisplayColumns(kardexTable).map((column) => column.name)

    expect(names).toEqual([
      'MOVIMIENTO ID',
      'FECHA',
      'TIPO',
      'PRODUCTO',
      'CANTIDAD',
      'SALDO ANTERIOR',
      'SALDO NUEVO',
      'ORIGEN',
      'REFERENCIA',
      'USUARIO',
      'MOTIVO',
    ])
    expect(names).not.toContain('producto_uuid')
    expect(names).not.toContain('ORIGEN UUID')
  })
})
