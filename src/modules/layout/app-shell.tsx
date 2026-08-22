import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Menu,
  Package,
  Power,
  UserRound,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'

import { SyncStatus } from '@/components/sync-status'
import { TableIcon } from '@/components/table-icon'
import { ThemeToggle, type ThemeMode } from '@/components/theme-toggle'
import { useRepository } from '@/data/use-repository'
import { cn } from '@/lib/utils'
import { LoginScreen } from '@/modules/auth/login-screen'
import { tableDefinitions } from '@/schema'
import logoUrl from '../../../logo.jpeg'

const primaryTables = tableDefinitions.filter(
  (table) => !table.name.startsWith('instalacion_') && table.name !== 'Menu',
)

const mobileLinks = [
  { label: 'Inicio', to: '/', icon: Home },
  { label: 'Servicios', to: '/tablas/INSTALACIONES', icon: Wrench },
  { label: 'Clientes', to: '/tablas/CLIENTES', icon: Users },
  { label: 'Almacén', to: '/tablas/ALMACEN', icon: Package },
] as const

function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function savePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // La sesión sigue funcionando aunque el navegador bloquee el almacenamiento local.
  }
}

export function AppShell() {
  const repository = useRepository()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => readPreference('traiot-sidebar-collapsed') === 'true',
  )
  const [theme, setTheme] = useState<ThemeMode>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )
  const [sessionActive, setSessionActive] = useState(
    () => readPreference('traiot-session-active') !== 'false',
  )
  const currentUser = useQuery({
    queryKey: ['current-user'],
    queryFn: () => repository.getCurrentUser(),
    enabled: sessionActive,
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    savePreference('traiot-theme', theme)
  }, [theme])

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current
      savePreference('traiot-sidebar-collapsed', String(next))
      return next
    })
  }

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  const login = () => {
    savePreference('traiot-session-active', 'true')
    setSessionActive(true)
  }
  const logout = () => {
    savePreference('traiot-session-active', 'false')
    setMenuOpen(false)
    setSessionActive(false)
  }

  if (!sessionActive) {
    return <LoginScreen onLogin={login} onToggleTheme={toggleTheme} theme={theme} />
  }

  const email = currentUser.data?.email ?? 'usuario@traiot.mx'
  const displayName = email.split('@')[0]?.replace(/[._-]+/g, ' ') ?? 'Usuario'

  return (
    <div className="min-h-screen bg-[#f7f3f1]">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col border-r border-white/10 bg-ink-950 text-white transition-[width,transform] duration-300 lg:translate-x-0',
          sidebarCollapsed && 'lg:w-[76px]',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div
          className={cn(
            'relative flex h-20 items-center justify-between border-b border-white/10 px-5',
            sidebarCollapsed && 'lg:justify-center lg:px-3',
          )}
        >
          <NavLink
            aria-label="Ir al inicio"
            className={cn(
              'flex min-h-11 items-center gap-3',
              sidebarCollapsed && 'lg:justify-center',
            )}
            onClick={() => setMenuOpen(false)}
            to="/"
          >
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#191919]">
              <img
                alt=""
                aria-hidden="true"
                className="size-full scale-[1.55] object-cover"
                src={logoUrl}
              />
            </span>
            <span className={cn(sidebarCollapsed && 'lg:hidden')}>
              <span className="block text-sm font-black tracking-[0.12em]">TRAIOT</span>
              <span className="block text-xs text-white/55">MANAGER</span>
            </span>
          </NavLink>
          <button
            aria-label="Cerrar menú"
            className="grid min-h-11 min-w-11 place-items-center rounded-xl hover:bg-white/10 lg:hidden"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            <X className="size-5" />
          </button>
          <button
            aria-label={sidebarCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
            className="absolute -right-4 top-[22px] z-10 hidden size-9 place-items-center rounded-full border border-white/15 bg-ink-900 text-white shadow-lg transition hover:bg-brand-600 lg:grid"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
            type="button"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </button>
        </div>

        <nav
          aria-label="Módulos"
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 uppercase"
        >
          <NavLink
            className={({ isActive }) =>
              cn(
                'mb-2 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-white/70',
                sidebarCollapsed && 'lg:justify-center lg:px-0',
                isActive &&
                  'bg-brand-400 text-[#191919] hover:bg-brand-400 hover:text-[#191919]',
              )
            }
            end
            onClick={() => setMenuOpen(false)}
            title="RESUMEN"
            to="/"
          >
            <Home className="size-5 shrink-0" />
            <span className={cn(sidebarCollapsed && 'lg:hidden')}>RESUMEN</span>
          </NavLink>
          {primaryTables.map((table) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/65 transition hover:bg-white/5 hover:text-white',
                  sidebarCollapsed && 'lg:justify-center lg:px-0',
                  isActive && 'bg-brand-400 text-[#191919] hover:bg-brand-400 hover:text-[#191919]',
                )
              }
              key={table.name}
              onClick={() => setMenuOpen(false)}
              title={table.name.toLocaleUpperCase('es-MX')}
              to={'/tablas/' + encodeURIComponent(table.name)}
            >
              <TableIcon className="shrink-0" name={table.icon} />
              <span className={cn('truncate', sidebarCollapsed && 'lg:hidden')}>
                {table.name.toLocaleUpperCase('es-MX')}
              </span>
            </NavLink>
          ))}
        </nav>

        <footer className="shrink-0 space-y-2 border-t border-white/10 p-3 uppercase">
          <ThemeToggle compact={sidebarCollapsed} onToggle={toggleTheme} theme={theme} />
          <div
            className={cn(
              'flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2',
              sidebarCollapsed && 'lg:flex-col',
            )}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500 text-[#191919]">
              <UserRound className="size-5" />
            </span>
            <span className={cn('min-w-0 flex-1', sidebarCollapsed && 'lg:hidden')}>
              <span className="block truncate text-xs font-black text-white">
                {displayName}
              </span>
              <span className="block truncate text-[10px] font-bold text-white/45">
                {currentUser.data?.role ?? 'CARGANDO…'}
              </span>
            </span>
            <button
              aria-label="Cerrar sesión"
              className="grid min-h-10 min-w-10 place-items-center rounded-xl border border-white/10 text-white/65 transition hover:bg-brand-600 hover:text-white"
              onClick={logout}
              title="Cerrar sesión"
              type="button"
            >
              <Power className="size-4" />
            </button>
          </div>
        </footer>
      </aside>

      {menuOpen && (
        <button
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-ink-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}

      <div
        className={cn(
          'transition-[padding] duration-300 lg:pl-[240px]',
          sidebarCollapsed && 'lg:pl-[76px]',
        )}
      >
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-black/5 bg-[#f7f3f1]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            aria-label="Abrir menú"
            className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-black/10 bg-white lg:hidden"
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <Menu className="size-5" />
          </button>
          <div className="hidden lg:block">
            <p className="text-sm font-bold text-ink-950">Centro de operación</p>
            <p className="text-xs text-ink-800/60">Viernes, 21 de agosto de 2026</p>
          </div>
          <SyncStatus />
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navegación principal móvil"
        className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-2xl border border-black/5 bg-white/95 p-1.5 shadow-2xl shadow-ink-950/20 backdrop-blur lg:hidden"
      >
        {mobileLinks.map(({ icon: Icon, label, to }) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-ink-800/55',
                isActive && 'bg-ink-950 text-white',
              )
            }
            end={to === '/'}
            key={to}
            to={to}
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
