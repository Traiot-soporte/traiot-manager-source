import { LogIn } from 'lucide-react'

import { ThemeToggle, type ThemeMode } from '@/components/theme-toggle'
import logoUrl from '../../../logo.jpeg'

interface LoginScreenProps {
  readonly theme: ThemeMode
  readonly onLogin: () => void
  readonly onToggleTheme: () => void
}

export function LoginScreen({ onLogin, onToggleTheme, theme }: LoginScreenProps) {
  return (
    <main className="relative grid min-h-screen place-items-center bg-[#f7f3f1] px-4 py-20">
      <ThemeToggle
        className="absolute right-4 top-4 w-auto border-black/10 bg-white px-4 text-ink-800 shadow-sm hover:bg-brand-50 hover:text-brand-600 sm:right-7 sm:top-7"
        onToggle={onToggleTheme}
        theme={theme}
      />

      <section className="w-full max-w-md rounded-[2rem] border border-black/5 bg-white p-7 text-center shadow-2xl shadow-ink-950/10 sm:p-10">
        <span className="mx-auto grid size-24 place-items-center overflow-hidden rounded-3xl bg-[#191919]">
          <img alt="" aria-hidden="true" className="size-full scale-[1.5] object-cover" src={logoUrl} />
        </span>
        <p className="mt-7 text-xs font-black uppercase tracking-[0.22em] text-brand-600">
          TRAIOT MANAGER
        </p>
        <h1 className="mt-2 text-3xl font-black text-ink-950">INICIAR SESIÓN</h1>
        <p className="mt-3 text-sm leading-6 text-ink-800/55">
          Accede al centro de operación GPS e IoT.
        </p>
        <button
          className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-black text-[#191919] transition hover:bg-brand-400"
          onClick={onLogin}
          type="button"
        >
          <LogIn className="size-5" />
          INICIAR SESIÓN
        </button>
        <p className="mt-4 text-xs font-semibold text-ink-800/45">
          Acceso de demostración; la autenticación real se conectará con Google Apps Script.
        </p>
      </section>
    </main>
  )
}
