import { describe, expect, it } from 'vitest'

import { warehouseDashboardMetrics } from '@/views/warehouse-dashboard'

describe('panel de Almacen', () => {
  it('muestra el producto con mayor existencia por categoria', () => {
    const rows = [
      { 'ID PRODUCTO': 'GPS-1', NOMBRE: 'GPS Uno', CATEGORIA: 'GPS', STOCK: 10 },
      { 'ID PRODUCTO': 'GPS-2', NOMBRE: 'GPS Dos', CATEGORIA: 'GPS', STOCK: 25 },
      { NOMBRE: 'Sensor temperatura', CATEGORIA: 'Sensor', STOCK: 8 },
      { NOMBRE: 'Arnes', CATEGORIA: 'Accesorio', STOCK: 40 },
      { NOMBRE: 'Camara exterior', CATEGORIA: 'CCTV', STOCK: 12 },
    ]

    expect(warehouseDashboardMetrics(rows)).toEqual({
      products: 5,
      categories: {
        GPS: { name: 'GPS Dos', units: 25 },
        SENSOR: { name: 'Sensor temperatura', units: 8 },
        ACCESORIO: { name: 'Arnes', units: 40 },
        CCTV: { name: 'Camara exterior', units: 12 },
      },
      alerts: {
        REABASTECER: [],
        SOBRESTOCK: [],
      },
    })
  })

  it('acepta categorias sin importar mayusculas o acentos', () => {
    const metrics = warehouseDashboardMetrics([
      { NOMBRE: 'Accesorio especial', CATEGORIA: 'accesorio', STOCK: '7' },
    ])

    expect(metrics.categories.ACCESORIO).toEqual({ name: 'Accesorio especial', units: 7 })
    expect(metrics.categories.CCTV).toBeUndefined()
  })

  it('clasifica los productos por estado de existencias', () => {
    const metrics = warehouseDashboardMetrics([
      { _uuid: 'low', 'ID PRODUCTO': 'GPS-LOW', NOMBRE: 'GPS bajo', CATEGORIA: 'GPS', STOCK: 2, 'STOCK MINIMO': 5, 'STOCK MAXIMO': 20 },
      { _uuid: 'over', 'ID PRODUCTO': 'SEN-OVER', NOMBRE: 'Sensor excedido', CATEGORIA: 'Sensor', STOCK: 25, 'STOCK MINIMO': 5, 'STOCK MAXIMO': 20 },
      { _uuid: 'ok', 'ID PRODUCTO': 'GPS-OK', NOMBRE: 'GPS adecuado', CATEGORIA: 'GPS', STOCK: 10, 'STOCK MINIMO': 5, 'STOCK MAXIMO': 20 },
    ])

    expect(metrics.alerts.REABASTECER).toEqual([
      { rowUuid: 'low', productId: 'GPS-LOW', name: 'GPS bajo', category: 'GPS', stock: 2, minimum: 5, maximum: 20 },
    ])
    expect(metrics.alerts.SOBRESTOCK).toEqual([
      { rowUuid: 'over', productId: 'SEN-OVER', name: 'Sensor excedido', category: 'Sensor', stock: 25, minimum: 5, maximum: 20 },
    ])
  })
})
