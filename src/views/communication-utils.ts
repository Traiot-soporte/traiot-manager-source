import type { CellValue, ColumnDef } from '@/schema'

interface EmailHrefOptions {
  readonly subject?: string
  readonly body?: string
}

export function callHref(value: string): string | undefined {
  const raw = value.trim()
  if (!/^\+?[\d\s().-]+$/.test(raw)) return undefined
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) return undefined
  return 'tel:' + (raw.startsWith('+') ? '+' : '') + digits
}

export function visitHref(value: string): string | undefined {
  const address = value.trim()
  if (address.length < 5 || address.length > 2000) return undefined
  if (/^https?:\/\//i.test(address)) {
    try {
      const url = new URL(address)
      return url.username || url.password ? undefined : url.href
    } catch { return undefined }
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(address) || /^\/\//.test(address)) return undefined
  const href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address)
  return href.length <= 2048 ? href : undefined
}

export function emailHref(value: CellValue | undefined, options: EmailHrefOptions = {}): string | undefined {
  const emails = [...new Set(String(value ?? '')
    .split(/[,;\n]+/)
    .map((email) => email.trim())
    .filter(Boolean))]
  if (emails.length === 0 || emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return undefined
  const parameters: string[] = []
  if (options.subject) parameters.push('subject=' + encodeURIComponent(options.subject))
  if (options.body) parameters.push('body=' + encodeURIComponent(options.body))
  const query = parameters.join('&')
  return 'mailto:' + emails.join(',') + (query ? '?' + query : '')
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
