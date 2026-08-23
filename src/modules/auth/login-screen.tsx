import {
  Activity,
  Eye,
  EyeOff,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { ThemeToggle, type ThemeMode } from '@/components/theme-toggle'
import logoUrl from '../../../logo.jpeg'

interface LoginScreenProps {
  readonly theme: ThemeMode
  readonly backendUnavailable?: boolean
  readonly sessionExpired?: boolean
  readonly onLogin: (input: {
    email: string
    password: string
    remember: boolean
  }) => Promise<void>
  readonly onToggleTheme: () => void
}

export function LoginScreen({
  backendUnavailable = false,
  onLogin,
  onToggleTheme,
  sessionExpired = false,
  theme,
}: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(undefined)
    setSubmitting(true)
    try {
      await onLogin({ email: email.trim(), password, remember })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#11100f] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 size-[36rem] rounded-full bg-brand-500/15 blur-[120px]" />
        <div className="absolute -bottom-56 right-[15%] size-[34rem] rounded-full bg-brand-400/10 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      <ThemeToggle
        className="absolute right-5 top-5 z-20 w-auto border-white/10 bg-white/5 px-4 text-white shadow-xl backdrop-blur hover:bg-white/10 sm:right-8 sm:top-8"
        onToggle={onToggleTheme}
        theme={theme}
      />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[1.15fr_.85fr]">
        <section className="hidden flex-col justify-between px-12 py-12 lg:flex xl:px-20 xl:py-16">
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-[#191919] shadow-2xl">
              <img alt="" aria-hidden="true" className="size-full scale-[1.5] object-cover" src={logoUrl} />
            </span>
            <div>
              <p className="font-black tracking-[0.18em]">TRAIOT</p>
              <p className="text-xs font-bold tracking-[0.12em] text-white/45">MANAGER</p>
            </div>
          </div>

          <div className="max-w-2xl pb-8">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-brand-400">
              Centro de operación inteligente
            </p>
            <h1 className="mt-6 text-5xl font-black leading-[1.03] tracking-[-0.04em] xl:text-7xl">
              Control total.
              <span className="block text-brand-400">Una sola plataforma.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/50 xl:text-lg">
              Inventario, instalaciones, clientes y soporte conectados en tiempo real con tu operación TRAIOT.
            </p>
            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
              <TrustItem icon={ShieldCheck} label="Acceso protegido" />
              <TrustItem icon={Activity} label="Datos en tiempo real" />
              <TrustItem icon={LayoutDashboard} label="CRM integral" />
            </div>
          </div>

          <p className="text-xs font-semibold text-white/25">
            © 2026 TRAIOT · Desarrollado por: MolTech
          </p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-24 sm:px-8 lg:px-12">
          <div className="w-full max-w-[29rem]">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="grid size-12 place-items-center overflow-hidden rounded-2xl bg-[#191919]">
                <img alt="" aria-hidden="true" className="size-full scale-[1.5] object-cover" src={logoUrl} />
              </span>
              <div><p className="font-black tracking-[0.16em]">TRAIOT</p><p className="text-xs text-white/40">MANAGER</p></div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.065] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-9">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-400/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-brand-400">
                <LockKeyhole className="size-3.5" /> Acceso seguro
              </span>
              <h2 className="mt-6 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Bienvenido</h2>
              <p className="mt-3 text-sm leading-6 text-white/45">
                Ingresa con el correo autorizado en TRAIOT Manager.
              </p>

              <form className="mt-8 space-y-5" onSubmit={(event) => void submit(event)}>
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-white/55">Correo electrónico</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-white/30" />
                    <input
                      autoComplete="username"
                      autoFocus
                      className="min-h-14 w-full rounded-2xl border border-white/10 bg-black/20 pl-12 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/20 focus:border-brand-400 focus:ring-4 focus:ring-brand-400/10"
                      disabled={submitting || backendUnavailable}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="nombre@empresa.com"
                      required
                      type="email"
                      value={email}
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-white/55">Contraseña</span>
                  <span className="relative block">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-white/30" />
                    <input
                      autoComplete="current-password"
                      className="min-h-14 w-full rounded-2xl border border-white/10 bg-black/20 pl-12 pr-14 text-sm font-semibold text-white outline-none transition placeholder:text-white/20 focus:border-brand-400 focus:ring-4 focus:ring-brand-400/10"
                      disabled={submitting || backendUnavailable}
                      minLength={12}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••••••"
                      required
                      type={passwordVisible ? 'text' : 'password'}
                      value={password}
                    />
                    <button
                      aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-2 top-1/2 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center rounded-xl text-white/35 hover:bg-white/5 hover:text-white"
                      onClick={() => setPasswordVisible((current) => !current)}
                      type="button"
                    >
                      {passwordVisible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </span>
                </label>

                <div className="flex items-center justify-between gap-4 text-xs">
                  <label className="flex cursor-pointer items-center gap-2 font-semibold text-white/55">
                    <input
                      checked={remember}
                      className="size-4 accent-[#ed8b70]"
                      onChange={(event) => setRemember(event.target.checked)}
                      type="checkbox"
                    />
                    Mantener sesión
                  </label>
                  <span className="font-semibold text-white/35">Acceso administrado</span>
                </div>

                {(error || sessionExpired || backendUnavailable) && (
                  <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-semibold leading-5 text-red-100" role="alert">
                    {backendUnavailable
                      ? 'No fue posible conectar con Apps Script. Actualiza la página e intenta nuevamente.'
                      : error ?? 'Tu sesión venció. Ingresa nuevamente.'}
                  </div>
                )}

                <button
                  className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-400 px-5 text-sm font-black text-[#191919] shadow-lg shadow-brand-500/20 transition hover:-translate-y-0.5 hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={submitting || backendUnavailable}
                  type="submit"
                >
                  {submitting ? <LoaderCircle className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />}
                  {submitting ? 'VERIFICANDO…' : 'INICIAR SESIÓN'}
                </button>
              </form>

              <p className="mt-6 text-center text-xs leading-5 text-white/30">
                ¿No puedes acceder? Solicita al administrador que restablezca tu contraseña.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function TrustItem({ icon: Icon, label }: {
  readonly icon: typeof ShieldCheck
  readonly label: string
}) {
  return (
    <span className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-3 text-xs font-bold text-white/45">
      <Icon className="size-4 text-brand-400" /> {label}
    </span>
  )
}
