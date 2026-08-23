import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LogOut,
  Search,
  ShieldCheck,
  Unlock,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { useRepository } from '@/data/use-repository'
import { isAdministratorRole } from '@/modules/auth/auth-permissions'

export function SecurityUsersPage() {
  const repository = useRepository()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [resetUserUuid, setResetUserUuid] = useState<string>()
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [formError, setFormError] = useState<string>()
  const currentUser = useQuery({
    queryKey: ['current-user'],
    queryFn: () => repository.getCurrentUser(),
  })
  const securityUsers = useQuery({
    queryKey: ['auth-security-users'],
    queryFn: () => repository.listAuthSecurityUsers(),
    enabled: isAdministratorRole(currentUser.data?.role),
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['auth-security-users'] })
  }
  const resetPassword = useMutation({
    mutationFn: ({ password, userUuid }: { password: string; userUuid: string }) =>
      repository.setTemporaryPassword(userUuid, password),
    onSuccess: async () => {
      closeReset()
      await refresh()
    },
  })
  const unlock = useMutation({
    mutationFn: (userUuid: string) => repository.unlockAuthUser(userUuid),
    onSuccess: refresh,
  })
  const revoke = useMutation({
    mutationFn: (userUuid: string) => repository.revokeAuthUserSessions(userUuid),
    onSuccess: refresh,
  })
  const setActive = useMutation({
    mutationFn: ({ active, userUuid }: { active: boolean; userUuid: string }) =>
      repository.setAuthUserActive(userUuid, active),
    onSuccess: refresh,
  })

  const users = securityUsers.data ?? []
  const normalizedSearch = search.trim().toLocaleLowerCase('es-MX')
  const filteredUsers = normalizedSearch
    ? users.filter((user) =>
      [user.name, user.email, user.userId, user.role]
        .some((value) => value.toLocaleLowerCase('es-MX').includes(normalizedSearch)),
    )
    : users

  if (currentUser.isPending) return <PageMessage text="Validando permisos…" />
  if (!currentUser.data || !isAdministratorRole(currentUser.data.role)) {
    return <PageMessage text="Esta pantalla está reservada para el UserRole Administrador." />
  }

  const submitReset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(undefined)
    if (!resetUserUuid) return
    if (temporaryPassword !== confirmation) {
      setFormError('La confirmación de contraseña no coincide.')
      return
    }
    resetPassword.mutate({ userUuid: resetUserUuid, password: temporaryPassword })
  }

  function closeReset() {
    setResetUserUuid(undefined)
    setTemporaryPassword('')
    setConfirmation('')
    setFormError(undefined)
  }

  const lockedCount = users.filter((user) => user.locked).length
  const activeSessions = users.reduce((total, user) => total + user.activeSessions, 0)
  const error = mutationError(resetPassword.error) ?? mutationError(unlock.error) ??
    mutationError(revoke.error) ?? mutationError(setActive.error) ?? formError

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-[2rem] bg-ink-950 text-white shadow-xl">
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-400 text-[#191919]">
              <ShieldCheck className="size-7" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-400">Administración</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">SEGURIDAD DE USUARIOS</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
                Restablece accesos, desbloquea cuentas y controla sesiones sin ver contraseñas.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-300">
            <ShieldCheck className="size-4" /> SOLO ADMINISTRADOR
          </span>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label="Usuarios" value={users.length} />
        <Metric icon={UserCheck} label="Activos" value={users.filter((user) => user.active).length} />
        <Metric icon={Unlock} label="Bloqueados" value={lockedCount} />
        <Metric icon={Activity} label="Sesiones activas" value={activeSessions} />
      </section>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-800/30" />
        <input
          className="min-h-13 w-full rounded-2xl border border-black/5 bg-white pl-12 pr-4 text-sm font-semibold outline-none shadow-sm focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar usuario, correo o rol…"
          value={search}
        />
      </div>

      {securityUsers.isPending && <PageMessage text="Consultando seguridad…" />}
      {securityUsers.isError && <PageMessage text="No fue posible consultar la seguridad de usuarios." />}
      {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p>}

      <section className="grid gap-4 xl:grid-cols-2">
        {filteredUsers.map((user) => {
          const isCurrentUser = user.userUuid === currentUser.data.userUuid
          return (
            <article className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-6" key={user.userUuid}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-xl font-black text-ink-950">{user.name || user.userId}</h2>
                    {isCurrentUser && <Badge tone="orange">TÚ</Badge>}
                    <Badge tone={user.active ? 'green' : 'gray'}>{user.active ? 'ACTIVO' : 'INACTIVO'}</Badge>
                    {user.locked && <Badge tone="red">BLOQUEADO</Badge>}
                    {user.mustChangePassword && <Badge tone="yellow">CAMBIO PENDIENTE</Badge>}
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-ink-800/55">{user.email}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-wide text-brand-600">{user.role || 'SIN ROL'}</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-xl bg-ink-950 px-3 py-2 text-xs font-black text-white">
                  <Activity className="size-3.5 text-brand-400" /> {user.activeSessions} SESIÓN{user.activeSessions === 1 ? '' : 'ES'}
                </span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-black/5 py-4 text-sm">
                <SecurityDatum label="Último acceso" value={formatSecurityDate(user.lastLoginAt)} />
                <SecurityDatum label="Contraseña actualizada" value={formatSecurityDate(user.passwordUpdatedAt)} />
                <SecurityDatum label="Intentos fallidos" value={String(user.failedAttempts)} />
                <SecurityDatum label="Credencial" value={user.credentialConfigured ? 'Configurada' : 'Pendiente'} />
              </dl>

              {resetUserUuid === user.userUuid ? (
                <form className="mt-5 space-y-3 rounded-2xl bg-brand-50 p-4" onSubmit={submitReset}>
                  <p className="text-xs font-black uppercase tracking-wide text-brand-700">Nueva contraseña temporal</p>
                  <PasswordField onChange={setTemporaryPassword} value={temporaryPassword} visible={passwordVisible} />
                  <PasswordField onChange={setConfirmation} placeholder="Confirmar contraseña" value={confirmation} visible={passwordVisible} />
                  <div className="flex flex-wrap gap-2">
                    <button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-500 px-4 text-xs font-black text-[#191919] disabled:opacity-60" disabled={resetPassword.isPending} type="submit">
                      {resetPassword.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />} GUARDAR TEMPORAL
                    </button>
                    <button className="min-h-11 rounded-xl px-4 text-xs font-black text-ink-800/50" onClick={closeReset} type="button">CANCELAR</button>
                    <button className="ml-auto grid min-h-11 min-w-11 place-items-center rounded-xl text-ink-800/45" onClick={() => setPasswordVisible((current) => !current)} type="button">
                      {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-5 flex flex-wrap gap-2">
                  <ActionButton icon={KeyRound} label="RESTABLECER" onClick={() => setResetUserUuid(user.userUuid)} />
                  <ActionButton disabled={!user.locked && user.failedAttempts === 0} icon={Unlock} label="DESBLOQUEAR" onClick={() => unlock.mutate(user.userUuid)} />
                  <ActionButton disabled={isCurrentUser || user.activeSessions === 0} icon={LogOut} label="REVOCAR SESIONES" onClick={() => {
                    if (window.confirm('¿Revocar todas las sesiones de este usuario?')) revoke.mutate(user.userUuid)
                  }} />
                  <ActionButton
                    disabled={isCurrentUser}
                    icon={user.active ? UserX : UserCheck}
                    label={user.active ? 'DESACTIVAR' : 'ACTIVAR'}
                    onClick={() => {
                      if (window.confirm(`¿${user.active ? 'Desactivar' : 'Activar'} a ${user.name}?`)) {
                        setActive.mutate({ userUuid: user.userUuid, active: !user.active })
                      }
                    }}
                  />
                </div>
              )}
            </article>
          )
        })}
      </section>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { readonly icon: typeof Users; readonly label: string; readonly value: number }) {
  return <article className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm"><span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon className="size-5" /></span><div><p className="text-2xl font-black text-ink-950">{value}</p><p className="text-xs font-bold uppercase tracking-wide text-ink-800/40">{label}</p></div></article>
}

function SecurityDatum({ label, value }: { readonly label: string; readonly value: string }) {
  return <div><dt className="text-[10px] font-black uppercase tracking-wide text-ink-800/35">{label}</dt><dd className="mt-1 font-bold text-ink-950">{value}</dd></div>
}

function Badge({ children, tone }: { readonly children: string; readonly tone: 'green' | 'gray' | 'red' | 'yellow' | 'orange' }) {
  const tones = { green: 'bg-emerald-100 text-emerald-800', gray: 'bg-slate-100 text-slate-600', red: 'bg-red-100 text-red-800', yellow: 'bg-amber-100 text-amber-800', orange: 'bg-brand-100 text-brand-700' }
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${tones[tone]}`}>{children}</span>
}

function ActionButton({ disabled = false, icon: Icon, label, onClick }: { readonly disabled?: boolean; readonly icon: typeof KeyRound; readonly label: string; readonly onClick: () => void }) {
  return <button className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/8 px-3 text-[11px] font-black text-ink-950 transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-35" disabled={disabled} onClick={onClick} type="button"><Icon className="size-3.5" />{label}</button>
}

function PasswordField({ onChange, placeholder = 'Contraseña temporal', value, visible }: { readonly onChange: (value: string) => void; readonly placeholder?: string; readonly value: string; readonly visible: boolean }) {
  return <input autoComplete="new-password" className="min-h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" minLength={12} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required type={visible ? 'text' : 'password'} value={value} />
}

function PageMessage({ text }: { readonly text: string }) {
  return <section className="rounded-3xl border border-black/5 bg-white p-8 text-sm font-bold text-ink-800/55 shadow-sm">{text}</section>
}

function formatSecurityDate(value: string): string {
  if (!value) return 'Sin registro'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function mutationError(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined
}
