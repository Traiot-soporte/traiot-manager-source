import { describe, expect, it } from 'vitest'

import {
  appendCrmCommentHistory,
  formatCrmCommentTimestamp,
  parseCrmCommentHistory,
} from '@/lib/crm-comments'

const fixedDate = new Date('2026-08-25T18:30:00.000Z')

describe('historial de comentarios CRM', () => {
  it('usa la fecha y hora de Ciudad de México', () => {
    expect(formatCrmCommentTimestamp(fixedDate)).toBe('25/08/2026 12:30')
  })

  it('anexa una entrada sin sobrescribir el historial anterior', () => {
    expect(appendCrmCommentHistory(
      'Comentario importado',
      'Se confirmó la reunión.',
      fixedDate,
      'Manuel Soto',
    )).toBe(
      'Comentario importado\n\n[25/08/2026 12:30 · Manuel Soto]\nSe confirmó la reunión.',
    )
  })

  it('conserva el historial cuando no se captura un comentario nuevo', () => {
    expect(appendCrmCommentHistory('Anterior', '', fixedDate, 'Manuel Soto')).toBe('Anterior')
  })

  it('separa entradas históricas y entradas auditadas para mostrarlas', () => {
    expect(parseCrmCommentHistory(
      'Comentario importado\n\n[25/08/2026 12:30 · Manuel Soto]\nSe confirmó la reunión.',
    )).toEqual([
      { body: 'Comentario importado' },
      {
        author: 'Manuel Soto',
        body: 'Se confirmó la reunión.',
        timestamp: '25/08/2026 12:30',
      },
    ])
  })
})
