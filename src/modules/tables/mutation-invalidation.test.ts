import { describe, expect, it } from 'vitest'

import { getMutationAffectedTables } from '@/modules/tables/mutation-invalidation'

describe('invalidacion posterior a mutaciones', () => {
  it.each(['COMPRAS', 'PEDIDOS'])('actualiza inventario y Kardex al modificar %s', (tableName) => {
    expect(getMutationAffectedTables(tableName)).toEqual([tableName, 'ALMACEN', 'KARDEX'])
  })

  it('solo actualiza la tabla cuando no hay efectos cruzados', () => {
    expect(getMutationAffectedTables('CLIENTES')).toEqual(['CLIENTES'])
  })
})
