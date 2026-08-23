import { describe, expect, it } from 'vitest'

import {
  appSectionIds,
  canRoleAccessSection,
  canRoleAccessTable,
  getRoleSections,
  isAdministratorRole,
  normalizeAppRole,
} from '@/modules/auth/auth-permissions'

describe('matriz de roles y permisos', () => {
  it('normaliza los cinco roles y conserva el alias administrativo anterior', () => {
    expect(normalizeAppRole('Administrador')).toBe('Administrador')
    expect(normalizeAppRole('ADMIN')).toBe('Administrador')
    expect(normalizeAppRole('Técnico')).toBe('Tecnico')
    expect(normalizeAppRole('ventas')).toBe('Ventas')
    expect(normalizeAppRole('Invitado')).toBeUndefined()
    expect(isAdministratorRole('ADMINISTRADOR')).toBe(true)
  })

  it('aplica exactamente las secciones definidas para cada rol', () => {
    expect([...getRoleSections('Administrador')]).toEqual(appSectionIds)
    expect([...getRoleSections('Gerencia')]).toEqual([
      'administracion-comercial', 'crm', 'ingenieria', 'tecnico',
    ])
    expect([...getRoleSections('Soporte')]).toEqual(['crm', 'ingenieria', 'tecnico'])
    expect([...getRoleSections('Ventas')]).toEqual(['crm'])
    expect([...getRoleSections('Tecnico')]).toEqual(['tecnico'])
  })

  it('niega tablas y secciones que no pertenecen al rol', () => {
    expect(canRoleAccessTable('Ventas', 'CLIENTES')).toBe(true)
    expect(canRoleAccessTable('Ventas', 'ALMACEN')).toBe(false)
    expect(canRoleAccessTable('Soporte', 'Laboratorio')).toBe(true)
    expect(canRoleAccessTable('Soporte', 'Usuarios')).toBe(false)
    expect(canRoleAccessTable('Soporte', 'MATRIZ DISPOSITIVOS')).toBe(true)
    expect(canRoleAccessTable('Tecnico', 'MATRIZ DISPOSITIVOS')).toBe(false)
    expect(canRoleAccessSection('Gerencia', 'seguridad')).toBe(false)
    expect(canRoleAccessTable('Rol desconocido', 'CLIENTES')).toBe(false)
  })
})
