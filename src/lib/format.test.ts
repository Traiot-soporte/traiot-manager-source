import { describe, expect, it } from 'vitest'

import { formatCell } from '@/lib/format'

describe('formato de fechas', () => {
  it('muestra una fecha de Sheets sin hora ni zona UTC', () => {
    const formatted = formatCell('2026-05-18T06:00:00.000Z', 'Date')

    expect(formatted).toContain('2026')
    expect(formatted).not.toContain('T06:00')
    expect(formatted).not.toContain('Z')
  })
})
