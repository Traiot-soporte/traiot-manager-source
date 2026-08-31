import { describe, expect, it } from 'vitest'

import { laboratoryTests } from '@/schema/catalogs'
import { buildLaboratoryDiagnosticHtml } from '@/views/laboratory-report'

describe('laboratory diagnostic report', () => {
  it('includes the complete technical diagnosis, evidence and TRAIOT identity', () => {
    const html = buildLaboratoryDiagnosticHtml({
      row: {
        FOLIO: 'LAB-0042',
        'FECHA ENTRADA': '2026-08-22',
        'FECHA SALIDA': '2026-08-25',
        'PROBLEMA DETECTADO': 'NO COMUNICA A PLATAFORMA',
        ESTATUS: 'FUNCIONAL',
        MARCA: 'RUPTELA',
        MODELO: 'TRACE5',
        IMEI: '123456789012345',
        'TEL SIM': '5551234567',
        'REVISADO POR': 'Manuel Soto',
        'PRUEBAS REALIZADAS': ['Alimentación', 'Comunicación'],
        'NOTAS DE REVISION': 'Equipo recuperado y validado.',
        'IMAGEN 1': 'Laboratorio_Images/evidencia.jpg',
        'NOTAS IMAGEN 1': 'Tarjeta sin daño visible.',
        'DIAS LABORATORIO': 3,
        SEMAFORO: 'CERRADO',
      },
      imageData: { 'IMAGEN 1': 'data:image/jpeg;base64,AAAA' },
      logoData: 'data:image/jpeg;base64,LOGO',
      clientName: 'CLIENTE DEMO · C-001',
      generatedAt: new Date('2026-08-31T18:30:00Z'),
      generatedBy: { name: 'Manuel Soto', email: 'soporte@traiot.com.mx', role: 'Administrador' },
    })

    expect(html).toContain('TRAIOT')
    expect(html).toContain('Diagnóstico de laboratorio')
    expect(html).toContain('LAB-0042')
    expect(html).toContain('NO COMUNICA A PLATAFORMA')
    expect(html).toContain('Equipo recuperado y validado.')
    expect(html).toContain('Alimentación')
    expect(html).toContain('Tarjeta sin daño visible.')
    expect(html).toContain('data:image/jpeg;base64,AAAA')
    expect(html).toContain('CLIENTE DEMO · C-001')
    expect(html).toContain('Manuel Soto')
  })

  it('escapes unsafe record content and reports unavailable evidence', () => {
    const html = buildLaboratoryDiagnosticHtml({
      row: {
        FOLIO: '<script>alert(1)</script>',
        'IMAGEN 2': 'missing.jpg',
        'NOTAS IMAGEN 2': '<b>observación</b>',
      },
      imageData: {},
    })

    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('&lt;b&gt;observación&lt;/b&gt;')
    expect(html).toContain('no fue posible cargar el archivo')
  })

  it('reconstructs catalog tests that the legacy comma parser fragmented', () => {
    const visualInspection = laboratoryTests.find((test) => test.includes('humedad')) ?? ''
    const analogInputs = laboratoryTests.find((test) => test.includes('cuando aplica')) ?? ''
    const html = buildLaboratoryDiagnosticHtml({
      row: {
        FOLIO: 'LAB-0043',
        'PRUEBAS REALIZADAS': [
          ...visualInspection.split(/\s*,\s*/),
          ...analogInputs.split(/\s*,\s*/),
        ],
      },
      imageData: {},
    })

    expect(html).toContain(visualInspection)
    expect(html).toContain(analogInputs)
    expect(html).not.toMatch(/<span>humedad<\/span>/i)
    expect(html).not.toMatch(/<span>cuando aplica\.<\/span>/i)
  })
})
