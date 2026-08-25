import { describe, expect, it } from 'vitest'

import { kardexDashboardMetrics } from '@/views/kardex-dashboard'

describe('panel de Kardex', () => {
  it('resume entradas, salidas y productos con movimiento', () => {
    const rows = [
      { TIPO: 'SALDO INICIAL', PRODUCTO: 'GPS-1', CANTIDAD: 10 },
      { TIPO: 'ENTRADA', producto_uuid: 'p1', PRODUCTO: 'GPS-1', CANTIDAD: 20 },
      { TIPO: 'SALIDA', producto_uuid: 'p1', PRODUCTO: 'GPS-1', CANTIDAD: -4 },
      { TIPO: 'ENTRADA', producto_uuid: 'p2', PRODUCTO: 'SENSOR-1', CANTIDAD: '1,000' },
      { TIPO: 'AJUSTE', producto_uuid: 'p2', PRODUCTO: 'SENSOR-1', CANTIDAD: 2 },
    ]

    expect(kardexDashboardMetrics(rows)).toEqual({
      movements: 5,
      incomingUnits: 1020,
      outgoingUnits: 4,
      movedProducts: 2,
    })
  })
})
