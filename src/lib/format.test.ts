import { describe, expect, it } from 'vitest'

import { formatCell } from '@/lib/format'

describe('formato de fechas', () => {
  it('muestra una fecha de Sheets sin hora ni zona UTC', () => {
    const formatted = formatCell('2026-05-18T06:00:00.000Z', 'Date')

    expect(formatted).toContain('2026')
    expect(formatted).not.toContain('T06:00')
    expect(formatted).not.toContain('Z')
  })

  it('muestra fecha y hora de auditoría en horario de Ciudad de México', () => {
    const formatted = formatCell('2026-08-25T23:30:00.000Z', 'DateTime')

    expect(formatted).toContain('2026')
    expect(formatted).toContain('5:30')
    expect(formatted).not.toContain('11:30')
  })

  it('oculta errores de fórmula heredados en lugar de mostrarlos al usuario', () => {
    expect(formatCell('#ERROR!', 'Phone')).toBe('—')
  })
})
