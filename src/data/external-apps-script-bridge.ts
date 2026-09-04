const REQUEST_TIMEOUT_MS = 90_000

interface AppsScriptHttpEnvelope {
  readonly ok?: boolean
  readonly data?: unknown
  readonly error?: {
    readonly message?: string
  }
}

type ApiCaller = (request: Readonly<Record<string, unknown>>) => Promise<unknown>

/**
 * Calls the public Apps Script Web App directly. Using text/plain keeps the
 * request CORS-simple, so mobile browsers do not need an OPTIONS preflight.
 */
export function createExternalAppsScriptCaller(serviceUrl: string): ApiCaller {
  const endpoint = validateServiceUrl(serviceUrl)

  return async (request) => {
    const controller = new AbortController()
    const timeoutId = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
        },
        body: JSON.stringify(request),
        redirect: 'follow',
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error('El servidor no respondió correctamente.')
      }

      const envelope = await readEnvelope(response)
      if (!envelope.ok) {
        throw new Error(envelope.error?.message || 'El servidor no pudo completar la solicitud.')
      }

      return envelope.data
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('El servidor tardó demasiado en responder.')
      }

      if (error instanceof Error) throw error
      throw new Error('No fue posible conectar con el servidor.')
    } finally {
      globalThis.clearTimeout(timeoutId)
    }
  }
}

function validateServiceUrl(value: string): string {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com') {
    throw new Error('La dirección del servidor no es válida.')
  }

  url.searchParams.delete('action')
  return url.toString()
}

async function readEnvelope(response: Response): Promise<AppsScriptHttpEnvelope> {
  try {
    const value: unknown = await response.json()
    if (value && typeof value === 'object') {
      return value
    }
  } catch {
    // Converted below to a stable, user-facing server error.
  }

  throw new Error('El servidor devolvió una respuesta no válida.')
}
