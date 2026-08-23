import type { TableDef } from '@/schema'

export type CollectionViewKind = 'table' | 'deck' | 'card' | 'calendar' | 'chart' | 'dashboard'

const collectionViewKinds: readonly CollectionViewKind[] = [
  'table',
  'deck',
  'card',
  'calendar',
  'chart',
  'dashboard',
]

export function isCollectionViewKind(value: string | null): value is CollectionViewKind {
  return collectionViewKinds.some((kind) => kind === value)
}

export function getAvailableCollectionViews(table: TableDef): readonly CollectionViewKind[] {
  return collectionViewKinds.filter((kind) => !table.disabledViews?.includes(kind))
}

export function resolveCollectionView(table: TableDef, requestedView: string | null): CollectionViewKind {
  const availableViews = getAvailableCollectionViews(table)
  if (isCollectionViewKind(requestedView) && availableViews.includes(requestedView)) {
    return requestedView
  }

  if (isCollectionViewKind(table.defaultView) && availableViews.includes(table.defaultView)) {
    return table.defaultView
  }

  return availableViews[0] ?? 'table'
}
