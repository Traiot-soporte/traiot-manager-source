import { describe, expect, it, vi } from 'vitest'

import { AppsScriptRepository } from '@/data/apps-script-repository'

describe('AppsScriptRepository', () => {
  it('convierte los permisos del usuario a un Set', async () => {
    const call = vi.fn(() => Promise.resolve({
      email: 'soporte@traiot.com.mx',
      role: 'ADMIN',
      permissions: ['*'],
    }))
    const repository = new AppsScriptRepository(call)

    const user = await repository.getCurrentUser()

    expect(user.email).toBe('soporte@traiot.com.mx')
    expect(user.permissions.has('*')).toBe(true)
    expect(call).toHaveBeenCalledWith({ action: 'current-user' })
  })

  it('solicita al puente la tabla requerida', async () => {
    const rows = [{ _uuid: '11111111-1111-4111-8111-111111111111', NOMBRE: 'Equipo' }]
    const call = vi.fn(() => Promise.resolve(rows))
    const repository = new AppsScriptRepository(call)

    await expect(repository.list('ALMACEN')).resolves.toEqual(rows)
    expect(call).toHaveBeenCalledWith({ action: 'list', table: 'ALMACEN' })
  })

  it('solicita archivos privados mediante el puente autorizado', async () => {
    const dataUrl = 'data:image/png;base64,AA=='
    const call = vi.fn(() => Promise.resolve(dataUrl))
    const repository = new AppsScriptRepository(call)

    await expect(repository.getMedia('ALMACEN', 'ALMACEN_Images/equipo.png')).resolves.toBe(dataUrl)
    expect(call).toHaveBeenCalledWith({
      action: 'media',
      table: 'ALMACEN',
      value: 'ALMACEN_Images/equipo.png',
    })
  })

  it('envia las escrituras con una clave de mutacion unica', async () => {
    const saved = { _uuid: '11111111-1111-4111-8111-111111111111', NOMBRE: 'Equipo' }
    const call = vi.fn(() => Promise.resolve(saved))
    const mutationId = '22222222-2222-4222-8222-222222222222'
    const repository = new AppsScriptRepository(call, () => mutationId)

    await expect(repository.create({ table: 'ALMACEN', values: { NOMBRE: 'Equipo' } })).resolves.toEqual(saved)
    expect(call).toHaveBeenCalledWith({
      action: 'create',
      table: 'ALMACEN',
      values: { NOMBRE: 'Equipo' },
      mutationId,
    })
  })

  it('guarda el token al iniciar sesion y lo adjunta a las consultas privadas', async () => {
    let stored: { token: string; expiresAt: string; remember: boolean } | undefined
    const session = {
      get: () => stored,
      save: (next: typeof stored) => { stored = next },
      clear: () => { stored = undefined },
    }
    const call = vi.fn((request: Readonly<Record<string, unknown>>) => {
      if (request.action === 'login') {
        return Promise.resolve({
          token: 'token-seguro',
          expiresAt: '2099-01-01T00:00:00.000Z',
          mustChangePassword: true,
          user: {
            userUuid: '11111111-1111-4111-8111-111111111111',
            email: 'soporte@traiot.com.mx',
            name: 'Manuel Soto',
            role: 'Administrador',
            mustChangePassword: true,
            permissions: ['*'],
          },
        })
      }
      return Promise.resolve([])
    })
    const repository = new AppsScriptRepository(call, () => 'mutation-id', session)

    await repository.login({
      email: 'soporte@traiot.com.mx',
      password: 'Temporal#2026A',
      remember: true,
    })
    await repository.list('ALMACEN')

    expect(stored).toEqual({
      token: 'token-seguro',
      expiresAt: '2099-01-01T00:00:00.000Z',
      remember: true,
    })
    expect(call).toHaveBeenLastCalledWith({
      action: 'list',
      table: 'ALMACEN',
      sessionToken: 'token-seguro',
    })
  })
})
