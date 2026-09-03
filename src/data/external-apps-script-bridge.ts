const BRIDGE_NAMESPACE = 'traiot-apps-script-bridge-v1'
const READY_TIMEOUT_MS = 20_000
const REQUEST_TIMEOUT_MS = 90_000

interface BridgeMessage {
  readonly namespace?: string
  readonly type?: string
  readonly requestId?: string
  readonly ok?: boolean
  readonly result?: unknown
  readonly error?: string
}

interface PendingRequest {
  readonly resolve: (value: unknown) => void
  readonly reject: (error: Error) => void
  readonly timeoutId: number
}

type ApiCaller = (request: Readonly<Record<string, unknown>>) => Promise<unknown>

export function createExternalAppsScriptCaller(bridgeUrl: string): ApiCaller {
  const bridge = new ExternalAppsScriptBridge(bridgeUrl)
  return (request) => bridge.call(request)
}

class ExternalAppsScriptBridge {
  readonly #bridgeUrl: string
  readonly #pending = new Map<string, PendingRequest>()
  readonly #ready: Promise<void>
  #trustedSource: Window | null = null
  #trustedOrigin = ''

  constructor(bridgeUrl: string) {
    this.#bridgeUrl = validateBridgeUrl(bridgeUrl)
    this.#ready = this.#initialize()
  }

  async call(request: Readonly<Record<string, unknown>>): Promise<unknown> {
    await this.#ready

    const target = this.#trustedSource
    if (!target || !this.#trustedOrigin) {
      throw new Error('El servidor no está disponible desde esta dirección.')
    }

    const requestId = globalThis.crypto.randomUUID()
    return await new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.#pending.delete(requestId)
        reject(new Error('El servidor tardó demasiado en responder.'))
      }, REQUEST_TIMEOUT_MS)

      this.#pending.set(requestId, { resolve, reject, timeoutId })
      target.postMessage({
        namespace: BRIDGE_NAMESPACE,
        type: 'request',
        requestId,
        request,
      }, this.#trustedOrigin)
    })
  }

  #initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const readyTimeoutId = window.setTimeout(() => {
        reject(new Error('No fue posible conectar con el servidor.'))
      }, READY_TIMEOUT_MS)

      window.addEventListener('message', (event: MessageEvent<BridgeMessage>) => {
        const message = event.data
        if (!message || message.namespace !== BRIDGE_NAMESPACE || !isTrustedGoogleOrigin(event.origin)) {
          return
        }

        if (message.type === 'ready' && event.source) {
          this.#trustedSource = event.source as Window
          this.#trustedOrigin = event.origin
          window.clearTimeout(readyTimeoutId)
          resolve()
          return
        }

        if (message.type !== 'response' || !message.requestId || event.source !== this.#trustedSource) {
          return
        }

        const pending = this.#pending.get(message.requestId)
        if (!pending) return

        window.clearTimeout(pending.timeoutId)
        this.#pending.delete(message.requestId)
        if (message.ok) {
          pending.resolve(message.result)
        } else {
          pending.reject(new Error(message.error || 'El servidor no pudo completar la solicitud.'))
        }
      })

      const iframe = document.createElement('iframe')
      iframe.src = this.#bridgeUrl
      iframe.title = 'Conexión segura con el servidor'
      iframe.tabIndex = -1
      iframe.setAttribute('aria-hidden', 'true')
      iframe.style.cssText = [
        'position:fixed',
        'left:-10000px',
        'top:0',
        'width:1px',
        'height:1px',
        'border:0',
        'opacity:0',
        'pointer-events:none',
      ].join(';')
      document.body.appendChild(iframe)
    })
  }
}

function validateBridgeUrl(value: string): string {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com') {
    throw new Error('La dirección del servidor no es válida.')
  }
  url.searchParams.set('action', 'bridge')
  return url.toString()
}

function isTrustedGoogleOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return url.protocol === 'https:' && (
      url.hostname === 'script.google.com'
      || url.hostname.endsWith('.googleusercontent.com')
    )
  } catch {
    return false
  }
}
