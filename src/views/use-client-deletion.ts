import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useRepository } from '@/data/use-repository'

export function useClientDeletion(tableName: string) {
  const repository = useRepository()
  const queryClient = useQueryClient()
  const remove = useMutation({
    mutationFn: (rowUuid: string) => repository.delete({ table: tableName, rowUuid }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['table', tableName] }),
        queryClient.invalidateQueries({ queryKey: ['table-summaries'] }),
      ])
    },
  })

  const request = (rowUuid: string, title: string) => {
    const accepted = window.confirm(
      '¿Eliminar a ' + title + '?\n\n' +
      'El contacto dejará de aparecer en Clientes, pero sus seguimientos históricos se conservarán.',
    )
    if (accepted) remove.mutate(rowUuid)
  }

  return {
    available: tableName === 'CLIENTES' && repository.writable,
    errorFor: (rowUuid: string) => remove.isError && remove.variables === rowUuid,
    pendingFor: (rowUuid: string) => remove.isPending && remove.variables === rowUuid,
    request,
  }
}
