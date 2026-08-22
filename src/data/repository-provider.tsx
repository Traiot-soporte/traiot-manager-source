import type { PropsWithChildren } from 'react'

import type { Repository } from '@/data/repository'
import { RepositoryContext } from '@/data/repository-context'

interface RepositoryProviderProps extends PropsWithChildren {
  readonly repository: Repository
}

export function RepositoryProvider({ children, repository }: RepositoryProviderProps) {
  return <RepositoryContext value={repository}>{children}</RepositoryContext>
}
