import { describe, expect, it } from 'vitest'

import { emailHref, mapHref, normalizeWhatsAppPhone, phoneHrefs, whatsappHref } from '@/views/communication-utils'

describe('acciones de comunicación', () => {
  it('genera correo, llamada, WhatsApp y mapa solo con valores válidos', () => {
    expect(emailHref('ventas@traiot.com.mx')).toBe('mailto:ventas@traiot.com.mx')
    expect(emailHref('correo-invalido')).toBeUndefined()
    expect(phoneHrefs({ name: 'TELEFONO', type: 'Text' }, '(81) 1234-5678')).toEqual({
      tel: 'tel:8112345678',
      whatsapp: 'https://wa.me/528112345678',
    })
    expect(normalizeWhatsAppPhone('+52 81 1234 5678')).toBe('528112345678')
    expect(whatsappHref('81 1234 5678', 'Hola, ¿cómo estás?')).toBe(
      'https://wa.me/528112345678?text=Hola%2C%20%C2%BFc%C3%B3mo%20est%C3%A1s%3F',
    )
    expect(emailHref('ventas@traiot.com.mx', { subject: 'Seguimiento', body: 'Hola' })).toBe(
      'mailto:ventas@traiot.com.mx?subject=Seguimiento&body=Hola',
    )
    expect(mapHref({ name: 'DIRECCION', type: 'Text' }, 'Monterrey, NL')).toContain('google.com/maps')
  })
})
