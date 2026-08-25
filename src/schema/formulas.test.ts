import { describe, expect, it } from 'vitest'

import {
  isTruthyUserActive,
  laboratoryDays,
  laboratorySemaphore,
  roundCurrency,
  warehouseStockStatus,
} from '@/schema/formulas'
import { pedidosTable } from '@/schema/tables/pedidos'
import type { FormulaContext, RowData } from '@/schema/types'

const context: FormulaContext = {
  now: new Date('2026-08-21T18:00:00.000Z'),
  user: {
    email: 'admin@traiot.mx',
    role: 'ADMIN',
    permissions: new Set(['*']),
  },
  can: () => true,
  lookup: () => undefined,
}

function runOrderFormula(name: string, row: RowData): number {
  const formula = pedidosTable.columns.find((column) => column.name === name)?.formula
  const result = formula?.(row, context)
  if (typeof result !== 'number') {
    throw new Error('La fórmula ' + name + ' no devolvió un número.')
  }
  return result
}

describe('fórmulas corregidas', () => {
  it('no cobra el envío dos veces en pedidos', () => {
    const subtotal = runOrderFormula('SUBTOTAL', {
      'PRECIO VENTA PARA ASESOR': 1_000,
      'EQUIPOS A VENDER': 2,
      'COSTO INSTALACION': 500,
      ENVIO: 200,
    })
    const iva = runOrderFormula('IVA', { SUBTOTAL: subtotal })
    const total = runOrderFormula('TOTAL', { SUBTOTAL: subtotal, IVA: iva, ENVIO: 200 })

    expect(subtotal).toBe(2_700)
    expect(iva).toBe(432)
    expect(total).toBe(3_132)
  })

  it('redondea moneda a dos decimales', () => {
    expect(roundCurrency(10.005)).toBe(10.01)
  })

  it('deduce el estatus de inventario con los limites configurados', () => {
    expect(warehouseStockStatus(0, 5, 10)).toBe('STOCK AGOTADO')
    expect(warehouseStockStatus(1, 5, 10)).toBe('STOCK BAJO')
    expect(warehouseStockStatus(5, 5, 10)).toBe('STOCK BAJO')
    expect(warehouseStockStatus(6, 5, 10)).toBe('STOCK SUFICIENTE')
    expect(warehouseStockStatus(10, 5, 10)).toBe('STOCK SUFICIENTE')
    expect(warehouseStockStatus(11, 5, 10)).toBe('SOBRESTOCK')
  })

  it('cierra estados válidos de laboratorio', () => {
    expect(laboratorySemaphore('📦 ENTREGADO', 20)).toBe('🔵 CERRADO')
    expect(laboratorySemaphore('✅ FUNCIONAL', 20)).toBe('🔵 CERRADO')
    expect(laboratorySemaphore('🛠️ EN REVISION', 4)).toBe('🟡 POR VENCER')
    expect(laboratorySemaphore('🛠️ EN REVISION', 7)).toBe('🔴 URGENTE')
  })

  it('calcula días de laboratorio', () => {
    expect(laboratoryDays('2026-08-18', context.now)).toBe(3)
  })

  it.each(['TRUE', 'true', 'VERDADERO', 'SI', 'Sí', '1'])(
    'normaliza UserActive=%s',
    (value) => {
      expect(isTruthyUserActive(value)).toBe(true)
    },
  )
})
