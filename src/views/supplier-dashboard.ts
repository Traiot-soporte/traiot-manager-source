import type { RowData } from '@/schema'

export interface SupplierDashboardMetrics {
  readonly suppliers: number
  readonly countries: number
  readonly cities: number
  readonly withEmail: number
}

export function supplierDashboardMetrics(rows: readonly RowData[]): SupplierDashboardMetrics {
  const countries = new Set<string>()
  const cities = new Set<string>()
  let withEmail = 0

  for (const row of rows) {
    const country = normalizedText(row.PAIS)
    const city = normalizedText(row.CIUDAD)
    if (country) countries.add(country)
    if (city) cities.add(city)
    if (normalizedText(row.CORREO_E)) withEmail += 1
  }

  return {
    suppliers: rows.length,
    countries: countries.size,
    cities: cities.size,
    withEmail,
  }
}

function normalizedText(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return String(value).trim().toLocaleUpperCase('es-MX')
}
