import { describe, expect, it } from 'vitest'

import { purchaseDashboardMetrics } from '@/views/purchase-dashboard'

describe('panel de Compras', () => {
  it('calcula productos y accesorios vendidos con datos relacionados', () => {
    const products = [
      { _uuid: 'p1', 'ID PRODUCTO': 'GPS-1', NOMBRE: 'GPS Uno', CATEGORIA: 'GPS' },
      { _uuid: 'p2', 'ID PRODUCTO': 'GPS-2', NOMBRE: 'GPS Dos', CATEGORIA: 'GPS' },
      { _uuid: 'a1', 'ID PRODUCTO': 'SEN-1', NOMBRE: 'Sensor de combustible', CATEGORIA: 'SENSOR' },
      { _uuid: 'a2', 'ID PRODUCTO': 'SEN-2', NOMBRE: 'Sensor de temperatura', CATEGORIA: 'SENSOR' },
    ]
    const orders = [
      { producto_uuid: 'p1', 'EQUIPOS A VENDER': 8, 'ESTATUS PEDIDO': 'APROBADO' },
      { producto_uuid: 'p2', 'EQUIPOS A VENDER': 2, 'ESTATUS PEDIDO': 'APROBADO' },
      { producto_uuid: 'a1', 'EQUIPOS A VENDER': 10, 'ESTATUS PEDIDO': '' },
      { producto_uuid: 'a2', 'EQUIPOS A VENDER': 1, 'ESTATUS PEDIDO': 'APROBADO' },
      { producto_uuid: 'p1', 'EQUIPOS A VENDER': 99, 'ESTATUS PEDIDO': 'NO APROBADO' },
    ]

    expect(purchaseDashboardMetrics([{}, {}, {}], orders, products)).toEqual({
      purchases: 3,
      mostSoldEquipment: { name: 'GPS Uno', units: 8 },
      leastSoldEquipment: { name: 'GPS Dos', units: 2 },
      mostSoldAccessory: { name: 'Sensor de combustible', units: 10 },
      leastSoldAccessory: { name: 'Sensor de temperatura', units: 1 },
    })
  })
})
