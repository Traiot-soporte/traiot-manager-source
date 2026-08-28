import type { CellValue, ColumnDef } from '@/schema'

interface EmailHrefOptions {
  readonly subject?: string
  readonly body?: string
}

export function emailHref(value: CellValue | undefined, options: EmailHrefOptions = {}): string | undefined {
  const emails = [...new Set(String(value ?? '')
    .split(/[,;\n]+/)
    .map((email) => email.trim())
    .filter(Boolean))]
  if (emails.length === 0 || emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return undefined
  const parameters = [
    'view=cm',
    'fs=1',
    'to=' + encodeURIComponent(emails.join(',')),
  ]
  if (options.subject) parameters.push('su=' + encodeURIComponent(options.subject))
  if (options.body) parameters.push('body=' + encodeURIComponent(options.body))
  return 'https://mail.google.com/mail/?' + parameters.join('&')
}

export function normalizeWhatsAppPhone(value: CellValue | undefined): string | undefined {
  const raw = String(value ?? '').trim()
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10) return undefined
  if (raw.startsWith('+')) return digits
  if (digits.length === 10) return '52' + digits
  return digits
}

export function whatsappHref(value: CellValue | undefined, message = ''): string | undefined {
  const phone = normalizeWhatsAppPhone(value)
  if (!phone) return undefined
  const query = message.trim() ? '?text=' + encodeURIComponent(message.trim()) : ''
  return 'https://wa.me/' + phone + query
}

export function phoneHrefs(column: ColumnDef, value: CellValue | undefined): { readonly tel: string; readonly whatsapp: string } | undefined {
  if (column.type !== 'Phone' && !/TELEFONO|TELÉFONO|CELULAR|MOVIL|MÓVIL/i.test(column.name)) return undefined
  const phone = String(value ?? '').trim().replace(/[^\d+]/g, '')
  if (phone.replace(/\D/g, '').length < 7) return undefined
  const whatsapp = whatsappHref(value)
  return whatsapp ? { tel: 'tel:' + phone, whatsapp } : undefined
}

export function mapHref(column: ColumnDef, value: CellValue | undefined): string | undefined {
  if (column.type !== 'Address' && !/DIRECCION|DIRECCIÓN|DOMICILIO/i.test(column.name)) return undefined
  const address = String(value ?? '').trim()
  return address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address) : undefined
}
