import { describe, expect, it } from 'vitest'

import {
  buildCalendarMonthCells,
  calendarDateKey,
  findCalendarDateColumn,
  groupCalendarRowsByDate,
} from '@/views/calendar-utils'
import { laboratorioTable } from '@/schema/tables/laboratorio'

describe('vista mensual de calendario', () => {
  it('usa la fecha de entrada y omite la fecha técnica de actualización', () => {
    expect(findCalendarDateColumn(laboratorioTable)?.name).toBe('FECHA ENTRADA')
  })

  it('conserva el día de una fecha ISO sin desplazarla por zona horaria', () => {
    expect(calendarDateKey('2026-08-22T18:00:00.000Z')).toBe('2026-08-22')
  })

  it('construye agosto de 2026 en una cuadrícula de seis semanas', () => {
    const cells = buildCalendarMonthCells(new Date(2026, 7, 1, 12))

    expect(cells).toHaveLength(42)
    expect(cells[5]).toEqual({ key: '2026-08-01', number: 1 })
    expect(cells[35]).toEqual({ key: '2026-08-31', number: 31 })
  })

  it('agrupa los equipos por su fecha de entrada', () => {
    const rows = [
      { _uuid: 'equipo-1', 'FECHA ENTRADA': '2026-08-22T12:00:00.000Z' },
      { _uuid: 'equipo-2', 'FECHA ENTRADA': '2026-08-22' },
      { _uuid: 'equipo-3', 'FECHA ENTRADA': '2026-08-23' },
    ]

    const grouped = groupCalendarRowsByDate(rows, 'FECHA ENTRADA')

    expect(grouped.get('2026-08-22')).toHaveLength(2)
    expect(grouped.get('2026-08-23')).toHaveLength(1)
  })
})
