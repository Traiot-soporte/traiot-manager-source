import { Cloud, CloudOff } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import type { AuthStatus } from '@/data/repository'
import { useRepository } from '@/data/use-repository'

export function SyncStatus() {
  const repository = useRepository()
  const queryClient = useQueryClient()
  const connection = useQuery<AuthStatus>({
    queryKey: ['backend-connection'],
    queryFn: () => repository.getAuthStatus(),
    enabled: repository.source === 'apps-script',
    initialData: () => queryClient.getQueryData<AuthStatus>(['auth-status']),
    refetchInterval: 30_000,
    retry: false,
  })
  const connected = repository.source === 'apps-script' && connection.isSuccess
  const Icon = connected ? Cloud : CloudOff

  return (
    <div
      className={connected
        ? 'flex min-h-11 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-900'
        : 'flex min-h-11 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-800'}
      title={connected ? 'Conexión verificada con el servidor.' : 'No hay conexión con el servidor.'}
    >
      <Icon aria-hidden="true" className="size-4" />
      <span>{connected ? 'Conectado' : 'Desconectado'}</span>
    </div>
  )
}
