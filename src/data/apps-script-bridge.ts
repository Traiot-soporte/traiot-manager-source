interface AppsScriptRunner {
  withSuccessHandler(handler: (result: unknown) => void): AppsScriptRunner
  withFailureHandler(handler: (error: unknown) => void): AppsScriptRunner
  apiRequest(request: Readonly<Record<string, unknown>>): void
}

interface AppsScriptGoogle {
  readonly script?: {
    readonly run?: AppsScriptRunner
  }
}

declare global {
  interface Window {
    readonly google?: AppsScriptGoogle
  }
}

export function isAppsScriptRuntime(): boolean {
  return Boolean(window.google?.script?.run) || /(^|\.)googleusercontent\.com$/i.test(window.location.hostname)
}

export function callAppsScript<T>(request: Readonly<Record<string, unknown>>): Promise<T> {
  const runner = window.google?.script?.run

  if (!runner) {
    return Promise.reject(new Error('El servicio privado no está disponible.'))
  }

  return new Promise<T>((resolve, reject) => {
    runner
      .withSuccessHandler((result) => resolve(result as T))
      .withFailureHandler((error) => reject(normalizeAppsScriptError(error)))
      .apiRequest(request)
  })
}

function normalizeAppsScriptError(error: unknown): Error {
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(sanitizeServiceMessage(String(error.message)))
  }

  const message = typeof error === 'string' && error
    ? error
    : 'El servicio no pudo completar la solicitud.'
  return new Error(sanitizeServiceMessage(message))
}

function sanitizeServiceMessage(message: string): string {
  return message
    .replace(/Google\s*Sheets?/gi, 'servidor')
    .replace(/Google\s*Drive/gi, 'almacenamiento')
    .replace(/Apps\s*Script/gi, 'servicio')
    .replace(/Spreadsheet(?:App)?/gi, 'servicio de datos')
}
