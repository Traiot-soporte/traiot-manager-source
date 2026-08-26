import { describe, expect, it } from 'vitest'

import { almacenTable } from '@/schema/tables/almacen'
import { clientesTable } from '@/schema/tables/clientes'
import { gestionClientesTable } from '@/schema/tables/gestion-clientes'
import { kardexTable } from '@/schema/tables/kardex'
import { proveedoresTable } from '@/schema/tables/proveedores'
import {
  getDisplayColumns,
  getListColumns,
  getNamedListColumns,
  getRowTitle,
  getTableViewColumns,
  crmContactPreviewColumnNames,
  supplierPreviewColumnNames,
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

  it('limita las vistas previas de proveedores a sus datos de contacto principales', () => {
    expect(getTableViewColumns(proveedoresTable).map((column) => column.name)).toEqual([
      'ID',
      'RAZON_SOCIAL',
      'CALLE',
      'TELEFONO',
      'CORREO_E',
      'CIUDAD',
    ])
    expect(getNamedListColumns(proveedoresTable, supplierPreviewColumnNames).map((column) => column.name)).toEqual([
      'RAZON_SOCIAL',
      'CALLE',
      'TELEFONO',
      'CORREO_E',
      'CIUDAD',
    ])
    expect(proveedoresTable.columns.find((column) => column.name === 'CORREO_E')?.label).toBe('EMAIL')
  })

  it('usa la columna label como título del registro', () => {
    expect(getRowTitle(clientesTable, { _uuid: 'client-001', 'ID CLIENTE': 'CLI-001' })).toBe(
      'CLI-001',
    )
  })

  it('presenta la ficha profesional de seguimiento en el orden solicitado', () => {
    expect(getDisplayColumns(gestionClientesTable).map((column) => column.name)).toEqual([
      'ID',
      'Nombre',
      'Cargo',
      'Compañía',
      'Tipo de Contacto',
      'Responsable',
      'Teléfono del trabajo',
      'Móvil',
      'Sitio web Corporativo',
      'E-mail del trabajo',
      'Última actualización en',
      'Origen',
      'Información de origen',
      'Creado por',
      'Creado',
      'Modificado por',
      'Modificado',
      'Comentarios',
    ])
    expect(getTableViewColumns(gestionClientesTable).map((column) => column.name))
      .toEqual(crmContactPreviewColumnNames)
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
