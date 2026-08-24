import type { RowData } from '@/schema'

export type CrmLifecycleStage = 'Cliente' | 'Prospecto' | 'Descartado'

export interface CrmAccountState {
  readonly key: string
  readonly stage: CrmLifecycleStage
  readonly latestRow: RowData
}

export function getCurrentCrmAccounts(rows: readonly RowData[]): readonly CrmAccountState[] {
  const grouped = new Map<string, RowData[]>()

  rows.forEach((row, index) => {
    const key = crmAccountKey(row, index)
    const current = grouped.get(key) ?? []
    current.push(row)
    grouped.set(key, current)
  })

  return [...grouped.entries()].map(([key, accountRows]) => {
    const ordered = [...accountRows].sort(compareCrmRows)
    const latestRow = ordered.at(-1)
    if (!latestRow) {
      throw new Error('El grupo CRM no contiene actividades.')
    }

    return {
      key,
      latestRow,
      stage: resolveCrmStage(ordered, latestRow),
    }
  })
}

function crmAccountKey(row: RowData, index: number): string {
  const uuid = String(row.cliente_uuid ?? '').trim().toLowerCase()
  if (uuid) return 'uuid:' + uuid

  const company = normalizeCrmText(row.Nombre_empresa)
  return company ? 'empresa:' + company : 'registro:' + String(index)
}

function compareCrmRows(left: RowData, right: RowData): number {
  const dateDifference = crmTimestamp(left) - crmTimestamp(right)
  if (dateDifference !== 0) return dateDifference

  const idDifference = crmSequence(left.Id_CRM) - crmSequence(right.Id_CRM)
  if (idDifference !== 0) return idDifference

  return String(left._updatedAt ?? '').localeCompare(String(right._updatedAt ?? ''))
}

function crmTimestamp(row: RowData): number {
  const parsed = Date.parse(String(row.Fecha_contacto ?? ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function crmSequence(value: unknown): number {
  const matches = crmCellText(value).match(/\d+(?:\.\d+)?/g)
  const parsed = Number(matches?.at(-1) ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function resolveCrmStage(
  orderedRows: readonly RowData[],
  latestRow: RowData,
): CrmLifecycleStage {
  const authoritative = normalizeCrmText(latestRow.Etapa_actual)
  if (authoritative.includes('DESCART')) return 'Descartado'
  if (authoritative.includes('CLIENTE')) return 'Cliente'
  if (authoritative.includes('PROSPECT')) return 'Prospecto'

  if (orderedRows.some((row) => normalizeCrmText(row.Estatus_prospeccion).includes('CLIENTE'))) {
    return 'Cliente'
  }

  if (normalizeCrmText(latestRow.Tipo_cliente).includes('ACTIVO')) return 'Cliente'
  if (normalizeCrmText(latestRow.Estatus_prospeccion).includes('NO INTERESADO')) {
    return 'Descartado'
  }
  return 'Prospecto'
}

function normalizeCrmText(value: unknown): string {
  return crmCellText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function crmCellText(value: unknown): string {
  if (Array.isArray(value)) return value.join(' ')
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}
