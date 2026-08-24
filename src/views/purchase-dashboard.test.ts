import { describe, expect, it } from 'vitest'

import { purchaseDashboardMetrics } from '@/views/purchase-dashboard'

describe('panel de Compras', () => {
  it('calcula productos y accesorios vendidos con datos relacionados', () => {
    const products = [
      { _uuid: 'p1', 'ID PRODUCTO': 'GPS-1', NOMBRE: 'GPS Uno', CATEGORIA: 'GPS' },
      { _uuid: 'p2', 'ID PRODUCTO': 'GPS-2', NOMBRE: 'GPS Dos', CATEGORIA: 'GPS' },
      { _uuid: 's1', 'ID PRODUCTO': 'SEN-1', NOMBRE: 'Sensor de combustible', CATEGORIA: 'Sensor' },
      { _uuid: 's2', 'ID PRODUCTO': 'SEN-2', NOMBRE: 'Sensor de temperatura', CATEGORIA: 'Sensor' },
      { _uuid: 'a1', 'ID PRODUCTO': 'ACC-1', NOMBRE: 'Imanes', CATEGORIA: 'Accesorio' },
      { _uuid: 'a2', 'ID PRODUCTO': 'ACC-2', NOMBRE: 'Adaptador CAN', CATEGORIA: 'Accesorio' },
    ]
    const orders = [
      { producto_uuid: 'p1', 'EQUIPOS A VENDER': 8, 'ESTATUS PEDIDO': 'APROBADO' },
      { producto_uuid: 'p2', 'EQUIPOS A VENDER': 2, 'ESTATUS PEDIDO': 'APROBADO' },
      { producto_uuid: 's1', 'EQUIPOS A VENDER': 10, 'ESTATUS PEDIDO': '' },
      { producto_uuid: 's2', 'EQUIPOS A VENDER': 1, 'ESTATUS PEDIDO': 'APROBADO' },
      { producto_uuid: 'a1', 'EQUIPOS A VENDER': 4, 'ESTATUS PEDIDO': 'APROBADO' },
      { producto_uuid: 'a2', 'EQUIPOS A VENDER': 3, 'ESTATUS PEDIDO': 'APROBADO' },
      { producto_uuid: 'p1', 'EQUIPOS A VENDER': 99, 'ESTATUS PEDIDO': 'NO APROBADO' },
    ]

    expect(purchaseDashboardMetrics([{}, {}, {}], orders, products)).toEqual({
      purchases: 3,
      categories: {
        GPS: {
          mostSold: { name: 'GPS Uno', units: 8 },
          leastSold: { name: 'GPS Dos', units: 2 },
        },
        SENSOR: {
          mostSold: { name: 'Sensor de combustible', units: 10 },
          leastSold: { name: 'Sensor de temperatura', units: 1 },
        },
        ACCESORIO: {
          mostSold: { name: 'Imanes', units: 4 },
          leastSold: { name: 'Adaptador CAN', units: 3 },
        },
      },
    })
  })
})
