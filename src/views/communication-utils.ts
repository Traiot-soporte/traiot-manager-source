import type { CellValue, ColumnDef } from '@/schema'

export function emailHref(value: CellValue | undefined): string | undefined {
  const email = String(value ?? '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'mailto:' + email : undefined
}

export function phoneHrefs(column: ColumnDef, value: CellValue | undefined): { readonly tel: string; readonly sms: string } | undefined {
  if (column.type !== 'Phone' && !/TELEFONO|TELÉFONO|CELULAR|MOVIL|MÓVIL/i.test(column.name)) return undefined
  const phone = String(value ?? '').trim().replace(/[^\d+]/g, '')
  if (phone.replace(/\D/g, '').length < 7) return undefined
  return { tel: 'tel:' + phone, sms: 'sms:' + phone }
}

export function mapHref(column: ColumnDef, value: CellValue | undefined): string | undefined {
  if (column.type !== 'Address' && !/DIRECCION|DIRECCIÓN|DOMICILIO/i.test(column.name)) return undefined
  const address = String(value ?? '').trim()
  return address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address) : undefined
}
