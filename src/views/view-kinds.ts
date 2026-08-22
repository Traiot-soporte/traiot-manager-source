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
