import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import { describe, expect, it, vi } from 'vitest'

interface HttpResult {
  readonly body: string
}

interface HttpSandbox {
  apiRequest: (request: Readonly<Record<string, unknown>>) => unknown
  readonly doPost: (event: Readonly<Record<string, unknown>>) => HttpResult
}

function loadHttpSandbox(apiRequest: HttpSandbox['apiRequest']): HttpSandbox {
  const sandbox = {
    apiRequest,
    console: { error: vi.fn() },
    Utilities: { getUuid: () => 'request-id' },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (body: string) => ({
        body,
        setMimeType() { return this },
      }),
    },
  }
  runInNewContext(readFileSync('apps-script/10_Http.gs', 'utf8'), sandbox)
  return sandbox as unknown as HttpSandbox
}

describe('API HTTP de Apps Script', () => {
  it('delega las acciones POST a la API autenticada', () => {
    const apiRequest = vi.fn(() => ({ configured: true, mode: 'SHEET_PASSWORD' }))
    const sandbox = loadHttpSandbox(apiRequest)
    const result = sandbox.doPost({
      postData: { contents: JSON.stringify({ action: 'auth-status' }) },
      parameter: {},
    })

    expect(apiRequest).toHaveBeenCalledWith({ action: 'auth-status' })
    expect(JSON.parse(result.body)).toMatchObject({
      ok: true,
      requestId: 'request-id',
      data: { configured: true, mode: 'SHEET_PASSWORD' },
    })
  })

  it('conserva los mensajes funcionales de validación', () => {
    const sandbox = loadHttpSandbox(() => {
      throw new Error('Correo o contraseña incorrectos.')
    })
    const result = sandbox.doPost({
      postData: { contents: JSON.stringify({ action: 'login' }) },
      parameter: {},
    })

    expect(JSON.parse(result.body)).toMatchObject({
      ok: false,
      error: {
        code: 'INTERNAL',
        message: 'Correo o contraseña incorrectos.',
      },
    })
  })
})
