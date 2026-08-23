import { describe, expect, it } from 'vitest'

import { appsheetColumnCount } from '@/schema/helpers'
import { tableDefinitions } from '@/schema'

const expectedAppSheetColumns: Readonly<Record<string, number>> = {
  ALMACEN: 29,
  COMPRAS: 15,
  PEDIDOS: 26,
  PROVEEDORES: 26,
  CLIENTES: 13,
  'Gestion Clientes': 13,
  'Ticket Soporte': 15,
  INSTALACIONES: 93,
  Laboratorio: 25,
  'MATRIZ DISPOSITIVOS': 46,
  Usuarios: 5,
  Perfiles: 3,
  Menu: 4,
}

describe('registro de metadata', () => {
  it('contiene las 13 tablas funcionales y las 3 tablas hijas', () => {
    expect(tableDefinitions).toHaveLength(16)
    expect(tableDefinitions.some((table) => table.name === '_Per User Settings')).toBe(false)
  })

  it('conserva todas las columnas de AppSheet salvo _RowNumber', () => {
    let total = 0
    for (const [tableName, expectedCount] of Object.entries(expectedAppSheetColumns)) {
      const table = tableDefinitions.find((candidate) => candidate.name === tableName)
      expect(table, tableName).toBeDefined()
      expect(appsheetColumnCount(table!), tableName).toBe(expectedCount)
      total += expectedCount
    }
    expect(total).toBe(313)
  })

  it('agrega las columnas de sincronización a todas las tablas', () => {
    for (const table of tableDefinitions) {
      expect(table.key).toBe('_uuid')
      expect(table.columns.some((column) => column.name === '_uuid')).toBe(true)
      expect(table.columns.some((column) => column.name === '_updatedAt')).toBe(true)
      expect(table.columns.some((column) => column.name === '_deleted')).toBe(true)
    }
  })

  it('mantiene nombres de tabla y columna únicos', () => {
    const tableNames = tableDefinitions.map((table) => table.name)
    expect(new Set(tableNames).size).toBe(tableNames.length)

    for (const table of tableDefinitions) {
      const columnNames = table.columns.map((column) => column.name)
      expect(new Set(columnNames).size, table.name).toBe(columnNames.length)
    }
  })

  it('presenta Gestion Clientes como CRM sin cambiar su hoja ni permisos', () => {
    const crm = tableDefinitions.find((table) => table.name === 'Gestion Clientes')
    expect(crm?.displayName).toBe('CRM')
    expect(crm?.sheet).toBe('Gestion Clientes')
    expect(crm?.permissionView).toBe('Gestion Clientes')
    expect(crm?.defaultView).toBe('dashboard')
    expect(crm?.columns.find((column) => column.name === 'Id_CRM')?.readOnly)
      .toBe(true)
    expect(crm?.columns.find((column) => column.name === 'Responsable')).toMatchObject({
      type: 'EnumList',
      required: true,
      values: ['Luis Baca', 'Jesús Ortiz', 'Oscar Malagón', 'Rembrand Castaneda', 'Manuel Soto'],
    })
    expect(crm?.columns.find((column) => column.name === 'Calendario')?.values)
      .toEqual(['Personal', 'Empresarial'])
    expect(crm?.columns.find((column) => column.name === '_calendarOwnerUuid')?.origin)
      .toBe('system')
  })

  it('conserva el doble espacio del canal de atención', () => {
    const support = tableDefinitions.find((table) => table.name === 'Ticket Soporte')
    const channel = support?.columns.find((column) => column.name === '🎫Canal de  Atención')
    expect(channel).toBeDefined()
    expect(channel?.sourceHeader).toBe('🎫Canal de \nAtención')
  })

  it('respeta el orden intercalado de evidencias de Laboratorio', () => {
    const laboratory = tableDefinitions.find((table) => table.name === 'Laboratorio')
    const evidenceColumns = laboratory?.columns
      .filter((column) => /^(IMAGEN|NOTAS IMAGEN) \d$/.test(column.name))
      .map((column) => column.name)

    expect(evidenceColumns).toEqual([
      'IMAGEN 1',
      'NOTAS IMAGEN 1',
      'IMAGEN 2',
      'NOTAS IMAGEN 2',
      'IMAGEN 3',
      'NOTAS IMAGEN 3',
      'IMAGEN 4',
      'NOTAS IMAGEN 4',
      'IMAGEN 5',
      'NOTAS IMAGEN 5',
    ])
  })
})
