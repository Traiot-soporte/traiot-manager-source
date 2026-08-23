export function safeExternalUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const candidate = value.trim()
  if (!candidate) return undefined

  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}

export function urlActionLabel(columnName: string): string {
  return columnName.toLocaleLowerCase('es-MX') === 'ficha_tecnica'
    ? 'Abrir ficha técnica'
    : 'Abrir enlace'
}
