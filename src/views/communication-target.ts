import type { RowData } from '@/schema'

export interface CommunicationTarget {
  readonly title: string
  readonly contactName: string
  readonly email: string
  readonly phone: string
}

function value(row: RowData | undefined, ...keys: readonly string[]): string {
  for (const key of keys) {
    const candidate = String(row?.[key] ?? '').trim()
    if (candidate && !/^(?:-|--|—|N\/?A|SIN DATO)$/i.test(candidate)) return candidate
  }
  return ''
}

export function resolveCommunicationTarget(
  tableName: string,
  row: RowData,
  client?: RowData,
): CommunicationTarget {
  const source = tableName === 'CLIENTES' ? row : client
  const fallbackTitle = value(row, 'Compañía', 'Nombre_empresa', 'ID', 'Id_CRM', '_uuid')
  return {
    title: value(source, 'RAZON SOCIAL', 'ID CLIENTE') || fallbackTitle,
    contactName: contactFullName(row) || value(row, 'Contacto') || value(source, 'CONTACTO'),
    email: value(row, 'E-mail del trabajo', 'Email') || value(source, 'EMAIL'),
    phone: value(row, 'Móvil', 'Teléfono del trabajo', 'Otro número de teléfono', 'Telefono') || value(source, 'TELEFONO CONTACTO', 'TELEFONO'),
  }
}

function contactFullName(row: RowData): string {
  return [value(row, 'Nombre'), value(row, 'Segundo Nombre'), value(row, 'Apellido')]
    .filter(Boolean)
    .join(' ')
}

export function defaultCommunicationMessage(target: CommunicationTarget): string {
  const greeting = target.contactName ? 'Hola ' + target.contactName + ',' : 'Hola,'
  const company = target.title ? ' sobre ' + target.title : ''
  return `${greeting}\n\nTe contactamos de TRAIOT para dar seguimiento${company}.\n\nQuedamos atentos.`
}

export function defaultCommunicationSubject(target: CommunicationTarget): string {
  return 'Seguimiento TRAIOT' + (target.title ? ' - ' + target.title : '')
}
