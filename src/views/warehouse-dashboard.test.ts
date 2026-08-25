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
    })
  })

  it('acepta categorias sin importar mayusculas o acentos', () => {
    const metrics = warehouseDashboardMetrics([
      { NOMBRE: 'Accesorio especial', CATEGORIA: 'accesorio', STOCK: '7' },
    ])

    expect(metrics.categories.ACCESORIO).toEqual({ name: 'Accesorio especial', units: 7 })
    expect(metrics.categories.CCTV).toBeUndefined()
  })
})
