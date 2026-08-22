import { describe, expect, it } from 'vitest'

import { buildFormSchema } from '@/schema/form-schema'
import { tableDefinitions } from '@/schema'
import { clientesTable } from '@/schema/tables/clientes'
import { pedidosTable } from '@/schema/tables/pedidos'

describe('schema Zod derivado de metadata', () => {
  it('genera campos editables para las 16 tablas', () => {
    for (const table of tableDefinitions) {
      const keys = Object.keys(buildFormSchema(table).shape)
      expect(keys.length, table.name).toBeGreaterThan(0)
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
      'ID PEDIDO': 'PED-TEST',
      'TIPO DE PEDIDO': 'VALOR INVENTADO',
    })

    expect(result.success).toBe(false)
  })

  it('acepta un pedido mínimo válido', () => {
    const schema = buildFormSchema(pedidosTable)
    const result = schema.safeParse({
      FECHA: '2026-08-21',
      'ID PEDIDO': 'PED-TEST',
      'TIPO DE PEDIDO': 'INSTALACION',
    })

    expect(result.success).toBe(true)
  })
})
