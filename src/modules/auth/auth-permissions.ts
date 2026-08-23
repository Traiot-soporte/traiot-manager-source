export function isAdministratorRole(role: string | undefined): boolean {
  const normalized = String(role ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
  return normalized === 'ADMIN' || normalized === 'ADMINISTRADOR'
}
