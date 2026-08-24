export const appRoles = [
  'Administrador',
  'Gerencia',
  'Soporte',
  'Ventas',
  'Tecnico',
] as const

export type AppRole = (typeof appRoles)[number]

export const appSectionIds = [
  'administracion-comercial',
  'crm',
  'ingenieria',
  'tecnico',
  'seguridad',
] as const

export type AppSectionId = (typeof appSectionIds)[number]

export const appSectionLabels: Readonly<Record<AppSectionId, string>> = {
  'administracion-comercial': 'Administración Comercial',
  crm: 'CRM',
  ingenieria: 'Ingeniería',
  tecnico: 'Técnico',
  seguridad: 'Seguridad',
}

const roleSections: Readonly<Record<AppRole, readonly AppSectionId[]>> = {
  Administrador: appSectionIds,
  Gerencia: ['administracion-comercial', 'crm', 'ingenieria', 'tecnico'],
  Soporte: ['crm', 'ingenieria', 'tecnico'],
  Ventas: ['crm'],
  Tecnico: ['tecnico'],
}

const tableSections: Readonly<Record<string, AppSectionId>> = {
  ALMACEN: 'administracion-comercial',
  KARDEX: 'administracion-comercial',
  COMPRAS: 'administracion-comercial',
  PEDIDOS: 'administracion-comercial',
  PROVEEDORES: 'administracion-comercial',
  CLIENTES: 'crm',
  'Gestion Clientes': 'crm',
  'Ticket Soporte': 'ingenieria',
  Laboratorio: 'ingenieria',
  INSTALACIONES: 'tecnico',
  instalacion_fotos: 'tecnico',
  instalacion_tanques: 'tecnico',
  instalacion_checklist: 'tecnico',
  'MATRIZ DISPOSITIVOS': 'ingenieria',
  Perfiles: 'seguridad',
  Usuarios: 'seguridad',
  Menu: 'seguridad',
}

function normalize(value: string | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
}

export function normalizeAppRole(role: string | undefined): AppRole | undefined {
  const normalized = normalize(role)
  if (normalized === 'ADMIN' || normalized === 'ADMINISTRADOR') return 'Administrador'
  if (normalized === 'GERENCIA') return 'Gerencia'
  if (normalized === 'SOPORTE') return 'Soporte'
  if (normalized === 'VENTAS') return 'Ventas'
  if (normalized === 'TECNICO') return 'Tecnico'
  return undefined
}

export function getRoleSections(role: string | undefined): ReadonlySet<AppSectionId> {
  const canonicalRole = normalizeAppRole(role)
  return new Set(canonicalRole ? roleSections[canonicalRole] : [])
}

export function canRoleAccessSection(
  role: string | undefined,
  section: AppSectionId,
): boolean {
  return getRoleSections(role).has(section)
}

export function getTableSection(tableName: string): AppSectionId | undefined {
  return tableSections[tableName]
}

export function canRoleAccessTable(role: string | undefined, tableName: string): boolean {
  const section = getTableSection(tableName)
  return Boolean(section && canRoleAccessSection(role, section))
}

export function isAdministratorRole(role: string | undefined): boolean {
  return normalizeAppRole(role) === 'Administrador'
}
