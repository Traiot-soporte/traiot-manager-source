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
  const due = (communications.data ?? []).filter((item) =>
    (item.status === 'PROGRAMADO' || item.status === 'ABIERTO') &&
    new Date(item.scheduledAt).getTime() <= communications.dataUpdatedAt,
  ).length

  return (
    <Link
      aria-label={due ? `${due} comunicaciones pendientes` : 'Abrir comunicaciones'}
      className={due
        ? 'relative grid min-h-11 min-w-11 place-items-center rounded-full border border-amber-300 bg-amber-100 text-amber-800 transition hover:bg-amber-200'
        : 'relative grid min-h-11 min-w-11 place-items-center rounded-full border border-black/10 bg-white text-ink-800/55 transition hover:border-brand-300 hover:text-brand-600'}
      title={due ? `${due} comunicaciones pendientes` : 'Comunicaciones'}
      to="/comunicaciones"
    >
      <BellRing className="size-4" />
      {due > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[9px] font-black text-white">{due > 9 ? '9+' : due}</span>}
    </Link>
  )
}
