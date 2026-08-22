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
    return Promise.reject(new Error('El puente privado de Apps Script no esta disponible.'))
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
    return new Error(String(error.message))
  }

  return new Error(
    typeof error === 'string' && error ? error : 'Apps Script no pudo completar la solicitud.',
  )
}
