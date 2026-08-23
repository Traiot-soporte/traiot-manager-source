import { Eye, EyeOff, KeyRound, LoaderCircle, LogOut, ShieldCheck } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import logoUrl from '../../../logo.jpeg'

interface ChangePasswordScreenProps {
  readonly email: string
  readonly onChangePassword: (input: {
    currentPassword: string
    nextPassword: string
  }) => Promise<void>
  readonly onLogout: () => void
}

export function ChangePasswordScreen({ email, onChangePassword, onLogout }: ChangePasswordScreenProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(undefined)
    if (nextPassword !== confirmation) {
      setError('La confirmación no coincide con la contraseña nueva.')
      return
    }
    setSubmitting(true)
    try {
      await onChangePassword({ currentPassword, nextPassword })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible cambiar la contraseña.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#11100f] px-4 py-16 text-white">
      <div className="pointer-events-none absolute -left-32 -top-32 size-[32rem] rounded-full bg-brand-500/15 blur-[130px]" />
      <section className="relative w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/[0.065] p-6 shadow-2xl backdrop-blur-2xl sm:p-9">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center overflow-hidden rounded-2xl bg-[#191919]">
            <img alt="" aria-hidden="true" className="size-full scale-[1.5] object-cover" src={logoUrl} />
          </span>
          <div><p className="font-black tracking-[0.15em]">TRAIOT</p><p className="text-xs text-white/40">MANAGER</p></div>
        </div>

        <span className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-400/10 px-3 py-1.5 text-xs font-black text-brand-400">
          <ShieldCheck className="size-4" /> PRIMER ACCESO
        </span>
        <h1 className="mt-5 text-3xl font-black tracking-tight">Protege tu cuenta</h1>
        <p className="mt-3 text-sm leading-6 text-white/45">
          La contraseña asignada a <strong className="text-white/70">{email}</strong> es temporal. Crea una contraseña personal para continuar.
        </p>

        <form className="mt-7 space-y-4" onSubmit={(event) => void submit(event)}>
          <PasswordInput label="Contraseña temporal" onChange={setCurrentPassword} value={currentPassword} visible={visible} />
          <PasswordInput label="Contraseña nueva" onChange={setNextPassword} value={nextPassword} visible={visible} />
          <PasswordInput label="Confirmar contraseña nueva" onChange={setConfirmation} value={confirmation} visible={visible} />

          <button className="flex min-h-11 items-center gap-2 text-xs font-bold text-white/45 hover:text-white" onClick={() => setVisible((current) => !current)} type="button">
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {visible ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
          </button>

          <p className="rounded-2xl bg-black/20 p-4 text-xs leading-5 text-white/40">
            Usa al menos 12 caracteres e incluye mayúscula, minúscula, número y símbolo.
          </p>

          {error && <p className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-semibold text-red-100">{error}</p>}

          <button className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-400 px-5 text-sm font-black text-[#191919] disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? <LoaderCircle className="size-5 animate-spin" /> : <KeyRound className="size-5" />}
            {submitting ? 'GUARDANDO…' : 'CAMBIAR CONTRASEÑA'}
          </button>
        </form>

        <button className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 text-xs font-bold text-white/40 hover:text-white" onClick={onLogout} type="button">
          <LogOut className="size-4" /> Cerrar sesión
        </button>
      </section>
    </main>
  )
}

function PasswordInput({ label, onChange, value, visible }: {
  readonly label: string
  readonly onChange: (value: string) => void
  readonly value: string
  readonly visible: boolean
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-white/50">{label}</span>
      <input
        autoComplete="new-password"
        className="min-h-13 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-400/10"
        minLength={12}
        onChange={(event) => onChange(event.target.value)}
        required
        type={visible ? 'text' : 'password'}
        value={value}
      />
    </label>
  )
}
