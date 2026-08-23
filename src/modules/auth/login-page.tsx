import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'

import { type ThemeMode } from '@/components/theme-toggle'
import { useRepository } from '@/data/use-repository'
import { LoginScreen } from '@/modules/auth/login-screen'
import logoUrl from '../../../logo.jpeg'

export function LoginPage() {
  const repository = useRepository()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<ThemeMode>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )
  const authStatus = useQuery({
    queryKey: ['auth-status'],
    queryFn: () => repository.getAuthStatus(),
  })
  const sessionAvailable = repository.hasSession()
  const currentUser = useQuery({
    queryKey: ['current-user'],
    queryFn: () => repository.getCurrentUser(),
    enabled: authStatus.data?.passwordLoginActive === true && sessionAvailable,
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    try {
      window.localStorage.setItem('traiot-theme', theme)
    } catch {
      // El tema visual no afecta la seguridad del inicio de sesión.
    }
  }, [theme])

  const login = async (input: { email: string; password: string; remember: boolean }) => {
    const user = await repository.login(input)
    queryClient.setQueryData(['current-user'], user)
    void navigate(user.mustChangePassword ? '/cambiar-contrasena' : '/', { replace: true })
  }

  if (authStatus.isPending) return <AuthLoading />
  if (authStatus.isError) {
    return (
      <LoginScreen
        backendUnavailable
        onLogin={login}
        onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
        theme={theme}
      />
    )
  }
  if (!authStatus.data.passwordLoginActive) return <Navigate replace to="/" />
  if (sessionAvailable && currentUser.isPending) return <AuthLoading />
  if (sessionAvailable && currentUser.data) {
    return (
      <Navigate
        replace
        to={currentUser.data.mustChangePassword ? '/cambiar-contrasena' : '/'}
      />
    )
  }

  return (
    <LoginScreen
      onLogin={login}
      onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
      sessionExpired={sessionAvailable && currentUser.isError}
      theme={theme}
    />
  )
}

export function AuthLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#191919] px-6 text-white">
      <div className="text-center">
        <span className="mx-auto block size-10 animate-spin rounded-full border-4 border-white/15 border-t-brand-400" />
        <p className="mt-4 text-sm font-bold text-white/60">Protegiendo tu sesión…</p>
      </div>
    </main>
  )
}

export function AuthUnavailable() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#191919] px-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <span className="mx-auto grid size-14 place-items-center overflow-hidden rounded-2xl bg-[#191919]">
          <img alt="" aria-hidden="true" className="size-full scale-[1.5] object-cover" src={logoUrl} />
        </span>
        <h1 className="mt-5 text-2xl font-black">Acceso no disponible</h1>
        <p className="mt-3 text-sm leading-6 text-white/50">
          La aplicación está protegida o en mantenimiento. Intenta nuevamente en unos minutos.
        </p>
        <button
          className="mt-6 min-h-12 rounded-xl bg-brand-400 px-5 text-sm font-black text-[#191919]"
          onClick={() => window.location.reload()}
          type="button"
        >
          VOLVER A INTENTAR
        </button>
      </section>
    </main>
  )
}
