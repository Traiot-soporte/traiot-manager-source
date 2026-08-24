import { describe, expect, it } from 'vitest'

import { emailHref, mapHref, phoneHrefs } from '@/views/communication-utils'

describe('acciones de comunicación', () => {
  it('genera correo, llamada, mensaje y mapa solo con valores válidos', () => {
    expect(emailHref('ventas@traiot.com.mx')).toBe('mailto:ventas@traiot.com.mx')
    expect(emailHref('correo-invalido')).toBeUndefined()
    expect(phoneHrefs({ name: 'TELEFONO', type: 'Text' }, '(81) 1234-5678')).toEqual({
      tel: 'tel:8112345678',
      sms: 'sms:8112345678',
    })
    expect(mapHref({ name: 'DIRECCION', type: 'Text' }, 'Monterrey, NL')).toContain('google.com/maps')
  })
})
