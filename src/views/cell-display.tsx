import { useQuery } from '@tanstack/react-query'

import { useRepository } from '@/data/use-repository'
import { formatCell } from '@/lib/format'
import { getTableDefinition } from '@/schema'
import type { CellValue, ColumnDef } from '@/schema'
import { getRowTitle } from '@/views/view-utils'

interface CellDisplayProps {
  readonly column: ColumnDef
  readonly table: string
  readonly value: CellValue | undefined
}

export function CellDisplay({ column, table, value }: CellDisplayProps) {
  const repository = useRepository()
  const isMedia = column.type === 'Image' || column.type === 'Signature'
  const referenceTable = column.ref?.table ?? ''
  const rowUuid = typeof value === 'string' ? value : ''
  const reference = useQuery({
    queryKey: ['reference', referenceTable, rowUuid],
    queryFn: () => repository.get(referenceTable, rowUuid),
    enabled: column.type === 'Ref' && Boolean(referenceTable) && Boolean(rowUuid),
  })
  const media = useQuery({
    queryKey: ['media', table, column.name, rowUuid],
    queryFn: () => repository.getMedia(table, rowUuid),
    enabled: isMedia && Boolean(rowUuid),
  })

  if (isMedia && typeof value === 'string') {
    if (media.isPending) return <>Cargando archivo…</>
    if (!media.data) return <>{value}</>

    return (
      <img
        alt={column.label ?? column.name}
        className="max-h-56 w-auto rounded-2xl border border-black/5 object-contain"
        loading="lazy"
        src={media.data}
      />
    )
  }

  if (column.type === 'Color' && typeof value === 'string') {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="size-4 rounded-full border border-black/10" style={{ background: value }} />
        {value}
      </span>
    )
  }

  if (column.type === 'Ref' && reference.data) {
    const table = getTableDefinition(referenceTable)
    if (table) return <>{getRowTitle(table, reference.data)}</>
  }

  return <>{formatCell(value, column.type)}</>
}
