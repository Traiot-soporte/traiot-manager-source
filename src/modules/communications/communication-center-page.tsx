import { useQuery } from '@tanstack/react-query'
import { CalendarClock } from 'lucide-react'
import { Navigate } from 'react-router'

import { ModuleHeader } from '@/components/module-header'
import { useRepository } from '@/data/use-repository'
import { canRoleAccessSection } from '@/modules/auth/auth-permissions'
import { CommunicationList } from '@/views/communication-list'

export function CommunicationCenterPage() {
  const repository = useRepository()
  const currentUser = useQuery({
    queryKey: ['current-user'],
    queryFn: () => repository.getCurrentUser(),
  })
  const communications = useQuery({
    queryKey: ['communications'],
    queryFn: () => repository.listCommunications(),
    enabled: Boolean(currentUser.data && canRoleAccessSection(currentUser.data.role, 'crm')),
    refetchInterval: 60_000,
    staleTime: 0,
  })

  if (currentUser.isPending) return <Status text="Preparando comunicaciones…" />
  if (!currentUser.data || !canRoleAccessSection(currentUser.data.role, 'crm')) return <Navigate replace to="/" />

  const active = (communications.data ?? []).filter((item) => item.status === 'PROGRAMADO' || item.status === 'ABIERTO')
  const history = (communications.data ?? [])
    .filter((item) => item.status === 'ENVIADO' || item.status === 'CANCELADO')
    .sort((left, right) => right.scheduledAt.localeCompare(left.scheduledAt))
  const dueCount = active.filter((item) => new Date(item.scheduledAt).getTime() <= Date.now()).length

  return (
    <div className="space-y-5">
      <ModuleHeader
        description="Mensajes preparados para abrir, confirmar y registrar desde tu cuenta."
        eyebrow="CRM"
        footer={<span>{active.length} programadas · {dueCount} pendientes</span>}
        icon={<CalendarClock className="size-5" />}
        title="Comunicaciones"
        tone="light"
      />
      {communications.isPending && <Status text="Consultando agenda…" />}
      {communications.isError && <Status error text="No fue posible consultar las comunicaciones." />}
      {communications.data && <>
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600">Agenda personal</p>
              <h2 className="mt-1 text-xl font-black text-ink-950">Próximas y pendientes</h2>
            </div>
            {dueCount > 0 && <span className="rounded-full bg-amber-100 px-3 py-1.5 text-[10px] font-black text-amber-800">{dueCount} POR ATENDER</span>}
          </div>
          <CommunicationList communications={active} emptyText="No tienes comunicaciones pendientes. Prográmalas desde Clientes o Seguimiento Clientes." />
        </section>
        <section>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-800/40">Historial</p>
          <h2 className="mb-3 mt-1 text-xl font-black text-ink-950">Enviadas y canceladas</h2>
          <CommunicationList communications={history} compact emptyText="Todavía no hay comunicaciones cerradas." />
        </section>
      </>}
    </div>
  )
}

function Status({ error = false, text }: { readonly error?: boolean; readonly text: string }) {
  return <p className={error ? 'rounded-2xl bg-red-50 p-5 text-sm font-bold text-red-700' : 'rounded-2xl bg-white p-5 text-sm font-semibold text-ink-800/50'}>{text}</p>
}
