import { describe, expect, it } from 'vitest'

import { purchaseDashboardMetrics } from '@/views/purchase-dashboard'

describe('panel de Compras', () => {
  it('calcula máximos y mínimos comprados por categoría', () => {
    const products = [
      { _uuid: 'p1', 'ID PRODUCTO': 'GPS-1', NOMBRE: 'GPS Uno', CATEGORIA: 'GPS' },
      { _uuid: 'p2', 'ID PRODUCTO': 'GPS-2', NOMBRE: 'GPS Dos', CATEGORIA: 'GPS' },
      { _uuid: 's1', 'ID PRODUCTO': 'SEN-1', NOMBRE: 'Sensor de combustible', CATEGORIA: 'Sensor' },
      { _uuid: 's2', 'ID PRODUCTO': 'SEN-2', NOMBRE: 'Sensor de temperatura', CATEGORIA: 'Sensor' },
      { _uuid: 'a1', 'ID PRODUCTO': 'ACC-1', NOMBRE: 'Imanes', CATEGORIA: 'Accesorio' },
      { _uuid: 'a2', 'ID PRODUCTO': 'ACC-2', NOMBRE: 'Adaptador CAN', CATEGORIA: 'Accesorio' },
    ]
    const purchases = [
      { producto_uuid: 'p1', CANTIDAD: 8 },
      { producto_uuid: 'p1', CANTIDAD: 2 },
      { producto_uuid: 'p2', CANTIDAD: 3 },
      { producto_uuid: 's1', CANTIDAD: 1000, CATEGORIA: 'SENSOR' },
      { producto_uuid: 's2', CANTIDAD: 5 },
      { producto_uuid: 'a1', CANTIDAD: 4 },
      { producto_uuid: 'a2', CANTIDAD: 1 },
    ]

    expect(purchaseDashboardMetrics(purchases, products)).toEqual({
      purchases: 7,
      categories: {
        GPS: {
          mostPurchased: { name: 'GPS Uno', units: 10 },
          leastPurchased: { name: 'GPS Dos', units: 3 },
        },
        SENSOR: {
          mostPurchased: { name: 'Sensor de combustible', units: 1000 },
          leastPurchased: { name: 'Sensor de temperatura', units: 5 },
        },
        ACCESORIO: {
          mostPurchased: { name: 'Imanes', units: 4 },
          leastPurchased: { name: 'Adaptador CAN', units: 1 },
        },
      },
    })
  })

  it('usa la categoría guardada en la compra si el producto no está disponible', () => {
    const metrics = purchaseDashboardMetrics([{
      'ID PRODUCTO': 'SENSOR-X',
      NOMBRE: 'Sensor histórico',
      CATEGORIA: 'SENSOR',
      CANTIDAD: 12,
    }], [])

    expect(metrics.categories.SENSOR.mostPurchased).toEqual({
      name: 'Sensor histórico',
      units: 12,
    })
  })
})
