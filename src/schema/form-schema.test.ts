import { describe, expect, it } from 'vitest'

import { buildFormSchema } from '@/schema/form-schema'
import { tableDefinitions } from '@/schema'
import { clientesTable } from '@/schema/tables/clientes'
import { gestionClientesTable } from '@/schema/tables/gestion-clientes'
import { pedidosTable } from '@/schema/tables/pedidos'
import { usuariosTable } from '@/schema/tables/usuarios'

describe('schema Zod derivado de metadata', () => {
  it('genera campos editables para las tablas de captura', () => {
    for (const table of tableDefinitions) {
      const keys = Object.keys(buildFormSchema(table).shape)
      if (table.readOnly) expect(keys, table.name).toHaveLength(0)
      else expect(keys.length, table.name).toBeGreaterThan(0)
    }
  })

  it('exige columnas marcadas como obligatorias', () => {
    const schema = buildFormSchema(clientesTable)
    const result = schema.safeParse({})

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'ID CLIENTE')).toBe(true)
    }
  })

  it('valida enums contra el catálogo', () => {
    const schema = buildFormSchema(pedidosTable)
    const result = schema.safeParse({
      FECHA: '2026-08-21',
      'TIPO DE PEDIDO': 'VALOR INVENTADO',
      'ID PRODUCTO': 'product-001',
      'EQUIPOS A VENDER': 1,
    })

    expect(result.success).toBe(false)
  })

  it('acepta un pedido mínimo válido', () => {
    const schema = buildFormSchema(pedidosTable)
    const result = schema.safeParse({
      FECHA: '2026-08-21',
      'TIPO DE PEDIDO': 'INSTALACION',
      'ID PRODUCTO': 'product-001',
      CATEGORIA: 'GPS',
      'EQUIPOS A VENDER': 1,
    })

    expect(result.success).toBe(true)
  })

  it('no solicita el folio de Salidas porque se genera en el servidor', () => {
    const fields = Object.keys(buildFormSchema(pedidosTable).shape)

    expect(fields).not.toContain('ID PEDIDO')
    expect(pedidosTable.columns.find((column) => column.name === 'ID PEDIDO')).toMatchObject({
      readOnly: true,
      required: true,
    })
  })

  it('no solicita el consecutivo CRM porque se genera en el servidor', () => {
    const fields = Object.keys(buildFormSchema(gestionClientesTable).shape)

    expect(fields).not.toContain('Id_CRM')
    expect(fields).not.toContain('ID')
    expect(gestionClientesTable.columns.find((column) => column.name === 'Id_CRM')).toMatchObject({
      readOnly: true,
      required: true,
    })
    expect(gestionClientesTable.columns.find((column) => column.name === 'ID')).toMatchObject({
      readOnly: true,
      required: true,
    })
  })

  it.each([true, false])('acepta UserActive=%s como booleano válido', (active) => {
    const schema = buildFormSchema(usuariosTable)
    const result = schema.safeParse({
      UserID: 'jpruebas',
      UserEmail: 'jpruebas@traiot.com.mx',
      UserRole: 'perfil-tecnico',
      UserActive: active,
    })

    expect(result.success).toBe(true)
  })
})
