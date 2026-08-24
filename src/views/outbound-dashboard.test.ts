import { describe, expect, it } from 'vitest'

import { outboundDashboardMetrics } from '@/views/outbound-dashboard'

describe('panel de Salidas', () => {
  it('calcula máximos y mínimos despachados por categoría usando solo salidas aprobadas', () => {
    const products = [
      { _uuid: 'p1', 'ID PRODUCTO': 'GPS-1', NOMBRE: 'GPS Uno', CATEGORIA: 'GPS' },
      { _uuid: 'p2', 'ID PRODUCTO': 'GPS-2', NOMBRE: 'GPS Dos', CATEGORIA: 'GPS' },
      { _uuid: 's1', 'ID PRODUCTO': 'SEN-1', NOMBRE: 'Sensor de combustible', CATEGORIA: 'Sensor' },
      { _uuid: 's2', 'ID PRODUCTO': 'SEN-2', NOMBRE: 'Sensor de temperatura', CATEGORIA: 'Sensor' },
      { _uuid: 'a1', 'ID PRODUCTO': 'ACC-1', NOMBRE: 'Imanes', CATEGORIA: 'Accesorio' },
      { _uuid: 'a2', 'ID PRODUCTO': 'ACC-2', NOMBRE: 'Adaptador CAN', CATEGORIA: 'Accesorio' },
    ]
    const exits = [
      { producto_uuid: 'p1', 'EQUIPOS A VENDER': 8, 'ESTATUS PEDIDO': 'APROBADO' },
      { producto_uuid: 'p1', 'EQUIPOS A VENDER': 2, 'ESTATUS PEDIDO': 'aprobado' },
      { producto_uuid: 'p2', 'EQUIPOS A VENDER': 3, 'ESTATUS PEDIDO': 'APROBADO' },
      { producto_uuid: 's1', 'EQUIPOS A VENDER': 12, 'ESTATUS PEDIDO': 'APROBADO' },
      { producto_uuid: 's2', 'EQUIPOS A VENDER': 5, 'ESTATUS PEDIDO': 'APROBADO' },
      { producto_uuid: 'a1', 'EQUIPOS A VENDER': 4, 'ESTATUS PEDIDO': 'APROBADO' },
      { producto_uuid: 'a2', 'EQUIPOS A VENDER': 1, 'ESTATUS PEDIDO': 'APROBADO' },
      { producto_uuid: 'p2', 'EQUIPOS A VENDER': 500, 'ESTATUS PEDIDO': 'PENDIENTE APROBACION' },
    ]

    expect(outboundDashboardMetrics(exits, products)).toEqual({
      exits: 7,
      categories: {
        GPS: {
          mostDispatched: { name: 'GPS Uno', units: 10 },
          leastDispatched: { name: 'GPS Dos', units: 3 },
        },
        SENSOR: {
          mostDispatched: { name: 'Sensor de combustible', units: 12 },
          leastDispatched: { name: 'Sensor de temperatura', units: 5 },
        },
        ACCESORIO: {
          mostDispatched: { name: 'Imanes', units: 4 },
          leastDispatched: { name: 'Adaptador CAN', units: 1 },
        },
      },
    })
  })

  it('usa la categoría guardada en una salida histórica si el producto ya no está disponible', () => {
    const metrics = outboundDashboardMetrics([{
      'ID PRODUCTO': 'SENSOR-X',
      NOMBRE: 'Sensor histórico',
      CATEGORIA: 'SENSOR',
      'EQUIPOS A VENDER': 7,
      'ESTATUS PEDIDO': 'APROBADO',
    }], [])

    expect(metrics.categories.SENSOR.mostDispatched).toEqual({
      name: 'Sensor histórico',
      units: 7,
    })
  })
})
