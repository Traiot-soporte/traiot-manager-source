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
  const fallbackTitle = value(row, 'Nombre_empresa', 'Id_CRM', '_uuid')
  return {
    title: value(source, 'RAZON SOCIAL', 'ID CLIENTE') || fallbackTitle,
    contactName: value(row, 'Contacto') || value(source, 'CONTACTO'),
    email: value(row, 'Email') || value(source, 'EMAIL'),
    phone: value(row, 'Telefono') || value(source, 'TELEFONO CONTACTO', 'TELEFONO'),
  }
}

export function defaultCommunicationMessage(target: CommunicationTarget): string {
  const greeting = target.contactName ? 'Hola ' + target.contactName + ',' : 'Hola,'
  const company = target.title ? ' sobre ' + target.title : ''
  return `${greeting}\n\nTe contactamos de TRAIOT para dar seguimiento${company}.\n\nQuedamos atentos.`
}

export function defaultCommunicationSubject(target: CommunicationTarget): string {
  return 'Seguimiento TRAIOT' + (target.title ? ' - ' + target.title : '')
}
