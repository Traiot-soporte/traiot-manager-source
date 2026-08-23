export interface StoredAuthSession {
  readonly token: string
  readonly expiresAt: string
  readonly remember: boolean
}

const storageKey = 'traiot-auth-session-v1'

export function readAuthSession(): StoredAuthSession | undefined {
  if (typeof window === 'undefined') return undefined
  const stored = readStorage(window.sessionStorage) ?? readStorage(window.localStorage)

  if (!stored) return undefined
  if (new Date(stored.expiresAt).getTime() <= Date.now()) {
    clearAuthSession()
    return undefined
  }

  return stored
}

export function saveAuthSession(session: StoredAuthSession): void {
  if (typeof window === 'undefined') return
  clearAuthSession()
  writeStorage(session.remember ? window.localStorage : window.sessionStorage, session)
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(storageKey)
    window.sessionStorage.removeItem(storageKey)
  } catch {
    // El navegador puede bloquear almacenamiento; el backend conserva la seguridad.
  }
}

function readStorage(storage: Storage): StoredAuthSession | undefined {
  try {
    const raw = storage.getItem(storageKey)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Partial<StoredAuthSession>
    return typeof parsed.token === 'string' && typeof parsed.expiresAt === 'string'
      ? { token: parsed.token, expiresAt: parsed.expiresAt, remember: Boolean(parsed.remember) }
      : undefined
  } catch {
    return undefined
  }
}

function writeStorage(storage: Storage, session: StoredAuthSession): void {
  try {
    storage.setItem(storageKey, JSON.stringify(session))
  } catch {
    // Si no se puede recordar, la sesión seguirá vigente durante esta carga.
  }
}
