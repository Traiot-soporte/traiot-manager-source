import { useQuery } from '@tanstack/react-query'
import { BellRing } from 'lucide-react'
import { Link } from 'react-router'

import { useRepository } from '@/data/use-repository'

export function CommunicationReminderButton() {
  const repository = useRepository()
  const communications = useQuery({
    queryKey: ['communications'],
    queryFn: () => repository.listCommunications(),
    refetchInterval: 60_000,
    staleTime: 0,
  })
  const pending = (communications.data ?? []).filter((item) =>
    item.status === 'PROGRAMADO' || item.status === 'ABIERTO',
  ).length

  return (
    <Link
      aria-label={pending ? `${pending} comunicaciones pendientes de enviar` : 'Abrir comunicaciones'}
      className={pending
        ? 'relative grid min-h-11 min-w-11 place-items-center rounded-full border border-amber-300 bg-amber-100 text-amber-800 transition hover:bg-amber-200'
        : 'relative grid min-h-11 min-w-11 place-items-center rounded-full border border-black/10 bg-white text-ink-800/55 transition hover:border-brand-300 hover:text-brand-600'}
      title={pending ? `${pending} pendientes de enviar` : 'Comunicaciones'}
      to="/comunicaciones"
    >
      <BellRing className="size-4" />
      {pending > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[9px] font-black text-white">{pending > 99 ? '99+' : pending}</span>}
    </Link>
  )
}
