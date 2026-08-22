import { createContext } from 'react'

import type { Repository } from '@/data/repository'

export const RepositoryContext = createContext<Repository | null>(null)
