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

  it('mantiene bloqueadas las escrituras mientras la API es de solo lectura', async () => {
    const repository = new AppsScriptRepository(() => Promise.resolve(null))

    await expect(repository.delete({ table: 'ALMACEN', rowUuid: 'x' })).rejects.toThrow(
      'solo lectura',
    )
  })
})
