import { ChevronLeft, ChevronRight, Home, Menu, Package, Users, Wrench, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'

import { SyncStatus } from '@/components/sync-status'
import { TableIcon } from '@/components/table-icon'
import { cn } from '@/lib/utils'
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

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem('traiot-sidebar-collapsed') === 'true',
  )

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current
      window.localStorage.setItem('traiot-sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <div className="min-h-screen bg-[#f7f3f1]">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[286px] border-r border-white/10 bg-ink-950 text-white transition-[width,transform] duration-300 lg:translate-x-0',
          sidebarCollapsed && 'lg:w-[88px]',
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
          className="h-[calc(100vh-5rem)] overflow-x-hidden overflow-y-auto p-3 uppercase"
        >
          <NavLink
            className={({ isActive }) =>
              cn(
                'mb-2 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-white/70',
                sidebarCollapsed && 'lg:justify-center lg:px-0',
                isActive && 'bg-white/10 text-white',
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
                  isActive && 'bg-brand-400 text-ink-950 hover:bg-brand-400 hover:text-ink-950',
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
          'transition-[padding] duration-300 lg:pl-[286px]',
          sidebarCollapsed && 'lg:pl-[88px]',
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
