export function uniqueEnumOptions(values: readonly string[]): readonly string[] {
  const unique = new Map<string, string>()
  for (const value of values) {
    const cleanValue = value.trim()
    const key = cleanValue
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleUpperCase('es-MX')
    if (key && !unique.has(key)) unique.set(key, cleanValue)
  }
  return [...unique.values()]
}
