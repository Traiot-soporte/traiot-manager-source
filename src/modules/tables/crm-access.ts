export function canManageAllCrmRecords(role: string | null | undefined) {
  const normalized = String(role ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()

  return normalized === 'ADMIN' || normalized === 'ADMINISTRADOR' || normalized === 'GERENCIA'
}
