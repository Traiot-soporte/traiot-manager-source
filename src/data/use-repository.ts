import { use } from 'react'

import { RepositoryContext } from '@/data/repository-context'
import type { Repository } from '@/data/repository'

export function useRepository(): Repository {
  const repository = use(RepositoryContext)
  if (!repository) {
    throw new Error('RepositoryProvider no está disponible.')
  }
  return repository
}
