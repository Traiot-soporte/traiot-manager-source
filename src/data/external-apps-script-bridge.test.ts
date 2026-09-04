import { afterEach, describe, expect, it, vi } from 'vitest'

import { createExternalAppsScriptCaller } from '@/data/external-apps-script-bridge'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('conexión HTTP externa con Apps Script', () => {
  it('envía una solicitud CORS simple y devuelve los datos del servicio', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      data: { configured: true, mode: 'SHEET_PASSWORD' },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const call = createExternalAppsScriptCaller(
      'https://script.google.com/macros/s/deployment-id/exec?action=bridge',
    )

    await expect(call({ action: 'auth-status' })).resolves.toEqual({
      configured: true,
      mode: 'SHEET_PASSWORD',
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://script.google.com/macros/s/deployment-id/exec',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ action: 'auth-status' }),
        redirect: 'follow',
      }),
    )
  })

  it('muestra el mensaje funcional devuelto por el servidor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      error: { message: 'Correo o contraseña incorrectos.' },
    }), { status: 200 })))
    const call = createExternalAppsScriptCaller(
      'https://script.google.com/macros/s/deployment-id/exec',
    )

    await expect(call({ action: 'login' })).rejects.toThrow('Correo o contraseña incorrectos.')
  })

  it('rechaza direcciones que no pertenezcan al Web App de Apps Script', () => {
    expect(() => createExternalAppsScriptCaller('https://example.com/api')).toThrow(
      'La dirección del servidor no es válida.',
    )
  })
})
