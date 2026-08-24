import { describe, expect, it } from 'vitest'

import { getAdjacentRecords } from '@/modules/tables/record-navigation'

describe('navegación entre registros', () => {
  const rows = [{ _uuid: 'a' }, { _uuid: 'b' }, { _uuid: 'c' }]

  it('resuelve anterior, siguiente y posición', () => {
    expect(getAdjacentRecords(rows, 'b')).toEqual({
      previous: rows[0],
      next: rows[2],
      position: 2,
      total: 3,
    })
  })

  it('desactiva el extremo inexistente', () => {
    expect(getAdjacentRecords(rows, 'a').previous).toBeUndefined()
    expect(getAdjacentRecords(rows, 'c').next).toBeUndefined()
  })
})
