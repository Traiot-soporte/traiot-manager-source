import { describe, expect, it } from 'vitest'

import { safeExternalUrl, urlActionLabel } from '@/views/url-utils'

describe('enlaces externos', () => {
  it('acepta fichas técnicas HTTP y HTTPS', () => {
    expect(safeExternalUrl(' https://drive.google.com/file/d/abc/view '))
      .toBe('https://drive.google.com/file/d/abc/view')
    expect(safeExternalUrl('http://example.com/ficha.pdf'))
      .toBe('http://example.com/ficha.pdf')
  })

  it('rechaza protocolos inseguros y valores inválidos', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeExternalUrl('sin-url')).toBeUndefined()
    expect(safeExternalUrl('')).toBeUndefined()
  })

  it('nombra específicamente la acción de ficha técnica', () => {
    expect(urlActionLabel('Ficha_Tecnica')).toBe('Abrir ficha técnica')
    expect(urlActionLabel('Pagina_empresa')).toBe('Abrir enlace')
  })
})
