import { describe, expect, it } from 'vitest'

import { callHref, emailHref, mapHref, normalizeWhatsAppPhone, phoneHrefs, visitHref, whatsappHref } from '@/views/communication-utils'

describe('acciones de comunicación', () => {
  it('abre llamadas externas y ubicaciones sin aceptar protocolos peligrosos', () => {
    expect(callHref('+52 (81) 1234-5678')).toBe('tel:+528112345678')
    expect(callHref('8112345678')).toBe('tel:8112345678')
    expect(callHref('123')).toBeUndefined()
    expect(callHref('javascript:8112345678')).toBeUndefined()
    expect(callHref('1234567890123456')).toBeUndefined()
    expect(visitHref('Av. Reforma 10, CDMX')).toBe('https://www.google.com/maps/search/?api=1&query=Av.%20Reforma%2010%2C%20CDMX')
    expect(visitHref('https://maps.app.goo.gl/abc123')).toBe('https://maps.app.goo.gl/abc123')
    for (const invalid of ['', 'javascript:alert(1)', 'data:text/html,test', '//evil.test', 'https://', 'https://user:pass@example.com', 'á'.repeat(1000)]) {
      expect(visitHref(invalid)).toBeUndefined()
    }
  })
  it('genera correo, llamada, WhatsApp y mapa solo con valores válidos', () => {
    expect(emailHref('ventas@traiot.com.mx')).toBe('mailto:ventas@traiot.com.mx')
    expect(emailHref('ventas@traiot.com.mx; soporte@traiot.com.mx')).toBe(
      'mailto:ventas@traiot.com.mx,soporte@traiot.com.mx',
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
      'mailto:ventas@traiot.com.mx?subject=Seguimiento&body=Hola',
    )
    const preparedEmail = emailHref('s.longoria@ukko.mx', {
      subject: 'Seguimiento TRAIOT - UKKO',
      body: 'Hola Sergio Longoria,\n\nQuedamos atentos.',
    })
    expect(preparedEmail).toBe(
      'mailto:s.longoria@ukko.mx?subject=Seguimiento%20TRAIOT%20-%20UKKO&body=Hola%20Sergio%20Longoria%2C%0A%0AQuedamos%20atentos.',
    )
    expect(preparedEmail).not.toContain('+')
    expect(mapHref({ name: 'DIRECCION', type: 'Text' }, 'Monterrey, NL')).toContain('google.com/maps')
  })
})
