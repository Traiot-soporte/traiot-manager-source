import { describe, expect, it } from 'vitest'

import { MockRepository } from '@/data/mock-repository'

const fixedNow = () => new Date('2026-08-22T00:00:00.000Z')

describe('MockRepository', () => {
  it('lista datos de ejemplo sin exponer filas eliminadas', async () => {
    const repository = new MockRepository({}, fixedNow, () => 'new-id')
    await repository.create({
      table: 'CLIENTES',
      values: { _uuid: 'client-test', 'ID CLIENTE': 'CLI-TEST' },
    })
    await repository.delete({ table: 'CLIENTES', rowUuid: 'client-test' })

    await expect(repository.list('CLIENTES')).resolves.toEqual([])
  })

  it('recalcula el total corregido al crear un pedido', async () => {
    const repository = new MockRepository({}, fixedNow, () => 'order-test')
    const order = await repository.create({
      table: 'PEDIDOS',
      values: {
        'ID PEDIDO': 'PED-TEST',
        'PRECIO VENTA PARA ASESOR': 1000,
        'EQUIPOS A VENDER': 2,
        'COSTO INSTALACION': 500,
        ENVIO: 200,
      },
    })

    expect(order.SUBTOTAL).toBe(2700)
    expect(order.IVA).toBe(432)
    expect(order.TOTAL).toBe(3132)
  })

  it('rechaza tablas que no forman parte del esquema', async () => {
    const repository = new MockRepository({}, fixedNow, () => 'new-id')
    await expect(repository.list('DESCONOCIDA')).rejects.toThrow('Tabla no registrada')
  })

  it('asigna automaticamente el consecutivo de nuevos productos', async () => {
    const repository = new MockRepository({
      ALMACEN: [
        { _uuid: 'product-38', _deleted: true, 'No. Item': 38, 'ID PRODUCTO': 'ANTERIOR' },
      ],
    }, fixedNow, () => 'product-39')

    const product = await repository.create({
      table: 'ALMACEN',
      values: { 'ID PRODUCTO': 'ARNES OBD2' },
    })

    expect(product['No. Item']).toBe(39)
  })
})
