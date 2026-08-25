import { createHash, createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

interface AuthSandbox {
  TRAIOT_AUTH_BCRYPT_ROUNDS: number
  validateAuthPassword_: (password: string) => void
  constantTimeAuthEqual_: (left: string, right: string) => boolean
  hashAuthPassword_: (password: string) => string
  compareAuthPassword_: (password: string, hash: string) => boolean
  shouldRequireCurrentAuthPassword_: (
    apiUser: { mustChangePassword: boolean },
    userRecord: { MustChangePassword: boolean },
  ) => boolean
  assertAuthAdministrator_: (user: { role: string; permissions: readonly string[] }) => void
  cacheResolvedAuthUser_: (
    sessionHash: string,
    expiresAt: string,
    user: Readonly<Record<string, unknown>>,
  ) => void
  readCachedAuthUser_: (sessionHash: string) => Readonly<Record<string, unknown>> | null
  invalidateAuthUserCache_: () => void
}

function bytes(buffer: Buffer): number[] {
  return Array.from(buffer.values())
}

function bufferFromBytes(values: readonly number[]): Buffer {
  return Buffer.from(values.map((value) => value < 0 ? value + 256 : value))
}

function loadAuthSandbox(): AuthSandbox {
  const properties = new Map<string, string>([
    ['TRAIOT_AUTH_PEPPER', 'pepper-secreto-de-prueba'],
    ['TRAIOT_AUTH_DUMMY_HASH', 'hash-ficticio'],
  ])
  const cache = new Map<string, string>()
  let uuidSequence = 0
  const sandbox = createContext({
    normalizeLookupValue_: (value: unknown) =>
      (typeof value === 'string' ? value : '').trim().toUpperCase(),
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key: string) => properties.get(key) ?? null,
        setProperty: (key: string, value: string) => { properties.set(key, value) },
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (key: string) => cache.get(key) ?? null,
        put: (key: string, value: string) => { cache.set(key, value) },
        remove: (key: string) => { cache.delete(key) },
      }),
    },
    Utilities: {
      Charset: { UTF_8: 'UTF_8' },
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      getUuid: () => `00000000-0000-4000-8000-${String(++uuidSequence).padStart(12, '0')}`,
      computeDigest: (_algorithm: string, value: string) =>
        bytes(createHash('sha256').update(String(value), 'utf8').digest()),
      computeHmacSha256Signature: (value: string, key: string) =>
        bytes(createHmac('sha256', key).update(String(value), 'utf8').digest()),
      base64Encode: (values: readonly number[]) => bufferFromBytes(values).toString('base64'),
      base64EncodeWebSafe: (values: readonly number[]) => bufferFromBytes(values)
        .toString('base64url'),
    },
  })

  runInContext(readFileSync('apps-script/82_Bcrypt.gs', 'utf8'), sandbox)
  runInContext(readFileSync('apps-script/85_Auth.gs', 'utf8'), sandbox)
  ;(sandbox as unknown as AuthSandbox).TRAIOT_AUTH_BCRYPT_ROUNDS = 4
  return sandbox as unknown as AuthSandbox
}

describe('autenticacion privada de Apps Script', () => {
  it('exige una contrasena larga con cuatro clases de caracteres', () => {
    const { validateAuthPassword_ } = loadAuthSandbox()

    expect(() => validateAuthPassword_('Temporal#2026A')).not.toThrow()
    expect(() => validateAuthPassword_('demasiado-simple')).toThrow('12 a 128 caracteres')
    expect(() => validateAuthPassword_('Corta#1a')).toThrow('12 a 128 caracteres')
    expect(() => validateAuthPassword_(' Temporal#2026A')).toThrow('sin espacios')
  })

  it('genera un hash bcrypt con pepper y nunca compara texto plano', () => {
    const { hashAuthPassword_, compareAuthPassword_ } = loadAuthSandbox()
    const hash = hashAuthPassword_('Temporal#2026A')

    expect(hash).toMatch(/^\$2[aby]\$04\$/)
    expect(hash).not.toContain('Temporal#2026A')
    expect(compareAuthPassword_('Temporal#2026A', hash)).toBe(true)
    expect(compareAuthPassword_('Incorrecta#2026A', hash)).toBe(false)
  })

  it('compara hashes de sesion sin salida temprana', () => {
    const { constantTimeAuthEqual_ } = loadAuthSandbox()

    expect(constantTimeAuthEqual_('abc123', 'abc123')).toBe(true)
    expect(constantTimeAuthEqual_('abc123', 'abc124')).toBe(false)
    expect(constantTimeAuthEqual_('abc123', 'abc1234')).toBe(false)
  })

  it('no repite la contraseña temporal durante una sesión válida de primer acceso', () => {
    const { shouldRequireCurrentAuthPassword_ } = loadAuthSandbox()

    expect(shouldRequireCurrentAuthPassword_(
      { mustChangePassword: true },
      { MustChangePassword: true },
    )).toBe(false)
    expect(shouldRequireCurrentAuthPassword_(
      { mustChangePassword: false },
      { MustChangePassword: false },
    )).toBe(true)
  })

  it('reserva la administración al rol Administrador aunque otro perfil tenga comodín', () => {
    const { assertAuthAdministrator_ } = loadAuthSandbox()

    expect(() => assertAuthAdministrator_({ role: 'ADMINISTRADOR', permissions: [] })).not.toThrow()
    expect(() => assertAuthAdministrator_({ role: 'SOPORTE', permissions: ['*'] }))
      .toThrow('administrador')
  })

  it('reutiliza sesiones válidas e invalida la caché al cambiar seguridad', () => {
    const {
      cacheResolvedAuthUser_,
      invalidateAuthUserCache_,
      readCachedAuthUser_,
    } = loadAuthSandbox()
    const user = { userUuid: 'user-1', role: 'ADMINISTRADOR', permissions: ['*'] }
    const expiresAt = new Date(Date.now() + 60_000).toISOString()

    cacheResolvedAuthUser_('session-hash', expiresAt, user)
    expect(readCachedAuthUser_('session-hash')).toEqual(user)

    invalidateAuthUserCache_()
    expect(readCachedAuthUser_('session-hash')).toBeNull()
  })
})
