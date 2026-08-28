import { describe, expect, it } from 'vitest'

import { emailHref, mapHref, normalizeWhatsAppPhone, phoneHrefs, whatsappHref } from '@/views/communication-utils'

describe('acciones de comunicación', () => {
  it('genera correo, llamada, WhatsApp y mapa solo con valores válidos', () => {
    expect(emailHref('ventas@traiot.com.mx')).toBe(
      'https://mail.google.com/mail/?view=cm&fs=1&to=ventas%40traiot.com.mx',
    )
    expect(emailHref('ventas@traiot.com.mx; soporte@traiot.com.mx')).toBe(
      'https://mail.google.com/mail/?view=cm&fs=1&to=ventas%40traiot.com.mx%2Csoporte%40traiot.com.mx',
    )
    expect(emailHref('correo-invalido')).toBeUndefined()
    expect(emailHref('ventas@traiot.com.mx, correo-invalido')).toBeUndefined()
    expect(phoneHrefs({ name: 'TELEFONO', type: 'Text' }, '(81) 1234-5678')).toEqual({
      tel: 'tel:8112345678',
      whatsapp: 'https://wa.me/528112345678',
    })
    expect(normalizeWhatsAppPhone('+52 81 1234 5678')).toBe('528112345678')
    expect(whatsappHref('81 1234 5678', 'Hola, ¿cómo estás?')).toBe(
      'https://wa.me/528112345678?text=Hola%2C%20%C2%BFc%C3%B3mo%20est%C3%A1s%3F',
    )
    expect(emailHref('ventas@traiot.com.mx', { subject: 'Seguimiento', body: 'Hola' })).toBe(
      'https://mail.google.com/mail/?view=cm&fs=1&to=ventas%40traiot.com.mx&su=Seguimiento&body=Hola',
    )
    const preparedEmail = emailHref('s.longoria@ukko.mx', {
      subject: 'Seguimiento TRAIOT - UKKO',
      body: 'Hola Sergio Longoria,\n\nQuedamos atentos.',
    })
    expect(preparedEmail).toBe(
      'https://mail.google.com/mail/?view=cm&fs=1&to=s.longoria%40ukko.mx&su=Seguimiento%20TRAIOT%20-%20UKKO&body=Hola%20Sergio%20Longoria%2C%0A%0AQuedamos%20atentos.',
    )
    expect(preparedEmail).not.toContain('+')
    expect(mapHref({ name: 'DIRECCION', type: 'Text' }, 'Monterrey, NL')).toContain('google.com/maps')
  })
})
