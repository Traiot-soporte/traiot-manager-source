import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck, TriangleAlert } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { useRepository } from '@/data/use-repository'

interface AuthAdminPanelProps {
  readonly email: string
  readonly userUuid: string
}

export function AuthAdminPanel({ email, userUuid }: AuthAdminPanelProps) {
  const repository = useRepository()
  const queryClient = useQueryClient()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [formError, setFormError] = useState<string>()
  const status = useQuery({
    queryKey: ['auth-admin-status'],
    queryFn: () => repository.getAuthAdminStatus(),
  })
  const initialize = useMutation({
    mutationFn: () => repository.initializeAuthentication(),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['auth-admin-status'] }),
  })
  const assign = useMutation({
    mutationFn: (temporaryPassword: string) =>
      repository.setTemporaryPassword(userUuid, temporaryPassword),
    onSuccess: async () => {
      setPassword('')
      setConfirmation('')
      await queryClient.invalidateQueries({ queryKey: ['auth-admin-status'] })
    },
  })
  const activate = useMutation({
    mutationFn: () => repository.activateAuthentication(),
    onSuccess: () => window.location.reload(),
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(undefined)
    if (password !== confirmation) {
      setFormError('La confirmación de contraseña no coincide.')
      return
    }
    assign.mutate(password)
  }

  const error = formError ?? mutationMessage(assign.error) ?? mutationMessage(initialize.error) ?? mutationMessage(activate.error)
  const currentStatus = status.data
  const passwordReady = currentStatus?.usersMissingPassword.every(
    (user) => user.userUuid !== userUuid,
  ) ?? false

  return (
    <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-sm">
      <header className="flex flex-col gap-4 border-b border-black/5 bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-600">Seguridad de acceso</p>
          <h2 className="mt-1 text-xl font-black text-ink-950">Contraseña de {email}</h2>
        </div>
        <span className={passwordReady
          ? 'inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-800'
          : 'inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-2 text-xs font-black text-amber-800'}>
          {passwordReady ? <ShieldCheck className="size-4" /> : <KeyRound className="size-4" />}
          {passwordReady ? 'CONTRASEÑA CONFIGURADA' : 'PENDIENTE'}
        </span>
      </header>

      <div className="space-y-5 p-5 sm:p-7">
        {!currentStatus?.configured ? (
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <h3 className="font-black text-ink-950">Preparar autenticación</h3>
            <p className="mt-2 text-sm leading-6 text-ink-800/55">
              Agregará campos protegidos a Usuarios y creará las hojas internas de sesiones y auditoría.
            </p>
            <button
              className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-ink-950 px-5 text-sm font-black text-white disabled:opacity-60"
              disabled={initialize.isPending}
              onClick={() => initialize.mutate()}
              type="button"
            >
              {initialize.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              PREPARAR SEGURIDAD
            </button>
          </div>
        ) : (
          <form className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end" onSubmit={submit}>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-ink-800/50">Contraseña temporal</span>
              <span className="relative block">
                <input
                  autoComplete="new-password"
                  className="min-h-12 w-full rounded-xl border border-black/10 bg-white px-4 pr-12 text-sm font-semibold outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  minLength={12}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type={visible ? 'text' : 'password'}
                  value={password}
                />
                <button aria-label="Mostrar u ocultar contraseña" className="absolute right-1 top-1/2 grid min-h-10 min-w-10 -translate-y-1/2 place-items-center text-ink-800/40" onClick={() => setVisible((current) => !current)} type="button">
                  {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-ink-800/50">Confirmar contraseña</span>
              <input
                autoComplete="new-password"
                className="min-h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                minLength={12}
                onChange={(event) => setConfirmation(event.target.value)}
                required
                type={visible ? 'text' : 'password'}
                value={confirmation}
              />
            </label>
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-black text-[#191919] disabled:opacity-60" disabled={assign.isPending} type="submit">
              {assign.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              ASIGNAR
            </button>
          </form>
        )}

        <p className="text-xs leading-5 text-ink-800/45">
          Mínimo 12 caracteres con mayúscula, minúscula, número y símbolo. El usuario deberá cambiarla al entrar por primera vez.
        </p>

        {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p>}

        {currentStatus?.configured && (
          <div className="flex flex-col gap-4 border-t border-black/5 pt-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="text-sm text-ink-800/55">
              <strong className="text-ink-950">{currentStatus.credentialsReady}/{currentStatus.activeUsers}</strong> usuarios activos con contraseña.
              {currentStatus.duplicates.length > 0 && (
                <span className="mt-2 flex items-center gap-2 font-bold text-amber-700">
                  <TriangleAlert className="size-4" /> Corrige correos duplicados: {currentStatus.duplicates.join(', ')}
                </span>
              )}
            </div>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-black/10 px-5 text-sm font-black text-ink-950 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={activate.isPending || currentStatus.credentialsReady !== currentStatus.activeUsers || currentStatus.duplicates.length > 0}
              onClick={() => activate.mutate()}
              type="button"
            >
              {activate.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              ACTIVAR PÁGINA DE LOGIN
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function mutationMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined
}
