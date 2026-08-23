import { useQuery } from '@tanstack/react-query'
import { ShieldX } from 'lucide-react'
import { Link, Outlet, useParams } from 'react-router'

import { useRepository } from '@/data/use-repository'
import { canRoleAccessTable } from '@/modules/auth/auth-permissions'
import { AuthLoading, AuthUnavailable } from '@/modules/auth/login-page'
import { getTableDefinition } from '@/schema'

export function TableAccessBoundary() {
  const { tableName = '' } = useParams()
  const repository = useRepository()
  const currentUser = useQuery({
    queryKey: ['current-user'],
    queryFn: () => repository.getCurrentUser(),
  })

  if (currentUser.isPending) return <AuthLoading />
  if (currentUser.isError || !currentUser.data) return <AuthUnavailable />

  const table = getTableDefinition(tableName)
  if (!table || canRoleAccessTable(currentUser.data.role, table.name)) {
    return <Outlet />
  }

  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-700">
        <ShieldX className="size-7" />
      </span>
      <h1 className="mt-5 text-2xl font-black text-ink-950">Módulo no autorizado</h1>
      <p className="mt-2 text-sm leading-6 text-ink-800/60">
        Tu rol {currentUser.data.role} no tiene acceso a {table.name}.
      </p>
      <Link
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-ink-950 px-5 text-sm font-black text-white"
        replace
        to="/"
      >
        Volver al resumen
      </Link>
    </section>
  )
}
