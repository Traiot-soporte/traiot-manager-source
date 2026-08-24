import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Construction,
  Cpu,
  Handshake,
  Home,
  IdCard,
  LockKeyhole,
  type LucideIcon,
  Menu,
  Package,
  Power,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { SyncStatus } from '@/components/sync-status'
import { TableIcon } from '@/components/table-icon'
import { ThemeToggle, type ThemeMode } from '@/components/theme-toggle'
import { useRepository } from '@/data/use-repository'
import { cn } from '@/lib/utils'
import { AuthLoading, AuthUnavailable } from '@/modules/auth/login-page'
import {
  canRoleAccessSection,
  canRoleAccessTable,
  isAdministratorRole,
  type AppSectionId,
} from '@/modules/auth/auth-permissions'
import { tableDefinitions } from '@/schema'
import logoUrl from '../../../logo.jpeg'

type NavigationItem =
  | { readonly kind: 'table'; readonly label: string; readonly table: string }
  | { readonly administratorOnly: true; readonly kind: 'route'; readonly label: string; readonly to: string }
  | { readonly kind: 'pending'; readonly label: string }

interface NavigationSection {
  readonly id: AppSectionId
  readonly label: string
  readonly icon: LucideIcon
  readonly items: readonly NavigationItem[]
}

const navigationSections: readonly NavigationSection[] = [
  {
    id: 'administracion-comercial',
    icon: BriefcaseBusiness,
    label: 'Administración Comercial',
    items: [
      { kind: 'table', label: 'Almacén', table: 'ALMACEN' },
      { kind: 'table', label: 'Kardex', table: 'KARDEX' },
      { kind: 'table', label: 'Compras', table: 'COMPRAS' },
      { kind: 'table', label: 'Salidas', table: 'PEDIDOS' },
      { kind: 'table', label: 'Proveedores', table: 'PROVEEDORES' },
    ],
  },
  {
    id: 'crm',
    icon: Handshake,
    label: 'CRM',
    items: [
      { kind: 'table', label: 'Clientes', table: 'CLIENTES' },
      { kind: 'table', label: 'Seguimiento Clientes', table: 'Gestion Clientes' },
    ],
  },
  {
    id: 'ingenieria',
    icon: Cpu,
    label: 'Ingeniería',
    items: [
      { kind: 'table', label: 'Ticket Soporte', table: 'Ticket Soporte' },
      { kind: 'table', label: 'Laboratorio', table: 'Laboratorio' },
      { kind: 'table', label: 'Matriz Dispositivos', table: 'MATRIZ DISPOSITIVOS' },
    ],
  },
  {
    id: 'tecnico',
    icon: Wrench,
    label: 'Técnico',
    items: [
      { kind: 'table', label: 'Servicios GPS', table: 'INSTALACIONES' },
      { kind: 'pending', label: 'Diagramas' },
    ],
  },
  {
    id: 'seguridad',
    icon: ShieldCheck,
    label: 'Seguridad',
    items: [
      { kind: 'table', label: 'Perfiles', table: 'Perfiles' },
      { kind: 'table', label: 'Usuarios', table: 'Usuarios' },
      {
        kind: 'route',
        label: 'Seguridad de usuarios',
        to: '/seguridad-usuarios',
        administratorOnly: true,
      },
    ],
  },
] as const

const mobileLinks = [
  { label: 'Inicio', to: '/', icon: Home },
  { label: 'Serv. GPS', to: '/tablas/INSTALACIONES', icon: Wrench, table: 'INSTALACIONES' },
  { label: 'Clientes', to: '/tablas/CLIENTES', icon: Users, table: 'CLIENTES' },
  { label: 'Almacén', to: '/tablas/ALMACEN', icon: Package, table: 'ALMACEN' },
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

function readOpenSections(): ReadonlySet<string> | undefined {
  const stored = readPreference('traiot-sidebar-sections')
  if (!stored) return undefined

  try {
    const values: unknown = JSON.parse(stored)
    return new Set(
      Array.isArray(values)
        ? values.filter((value): value is string => typeof value === 'string')
        : [],
    )
  } catch {
    return undefined
  }
}

function tablePath(tableName: string): string {
  return '/tablas/' + encodeURIComponent(tableName)
}

function activeNavigationSection(pathname: string): string | undefined {
  const decodedPath = decodeURIComponent(pathname)
  return navigationSections.find((section) => section.items.some((item) => {
    if (item.kind === 'table') return decodedPath.startsWith('/tablas/' + item.table)
    if (item.kind === 'route') return decodedPath.startsWith(item.to)
    return false
  }))?.id
}

export function AppShell() {
  const repository = useRepository()
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => readPreference('traiot-sidebar-collapsed') === 'true',
  )
  const [openSections, setOpenSections] = useState<ReadonlySet<string>>(() => {
    const stored = readOpenSections()
    if (stored) return stored
    const activeSection = activeNavigationSection(location.pathname)
    return new Set([activeSection ?? 'administracion-comercial'])
  })
  const [theme, setTheme] = useState<ThemeMode>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )
  const authStatus = useQuery({
    queryKey: ['auth-status'],
    queryFn: () => repository.getAuthStatus(),
  })
  const passwordLoginActive = authStatus.data?.passwordLoginActive === true
  const sessionAvailable = repository.hasSession()
  const authenticated = !passwordLoginActive || sessionAvailable
  const currentUser = useQuery({
    queryKey: ['current-user'],
    queryFn: () => repository.getCurrentUser(),
    enabled: Boolean(authStatus.data) && authenticated,
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

  const toggleSection = (sectionId: string) => {
    setOpenSections((current) => {
      const next = new Set(current)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      savePreference('traiot-sidebar-sections', JSON.stringify([...next]))
      return next
    })
  }

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  const logout = async () => {
    await repository.logout()
    setMenuOpen(false)
    queryClient.removeQueries()
    void navigate('/login', { replace: true })
  }

  if (authStatus.isPending) {
    return <AuthLoading />
  }

  if (authStatus.isError) {
    return <AuthUnavailable />
  }

  if (passwordLoginActive && !sessionAvailable) {
    return <Navigate replace to="/login" />
  }

  if (currentUser.isPending) {
    return <AuthLoading />
  }

  if (passwordLoginActive && (currentUser.isError || !currentUser.data)) {
    return <Navigate replace to="/login" />
  }

  if (currentUser.isError || !currentUser.data) {
    return <AuthUnavailable />
  }

  if (currentUser.data?.mustChangePassword) {
    return <Navigate replace to="/cambiar-contrasena" />
  }

  const email = currentUser.data?.email ?? 'usuario@traiot.mx'
  const displayName = currentUser.data?.name ||
    email.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Usuario'
  const currentRole = currentUser.data.role
  const canAccess = (tableName: string) => canRoleAccessTable(currentRole, tableName)
  const isAdministrator = isAdministratorRole(currentUser.data.role)
  const visibleNavigationSections = navigationSections
    .filter((section) => canRoleAccessSection(currentRole, section.id))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.kind === 'table') return canAccess(item.table)
        if (item.kind === 'route') return !item.administratorOnly || isAdministrator
        return true
      }),
    }))
    .filter((section) => section.items.length > 0)
  const visibleMobileLinks = mobileLinks.filter(
    (link) => !('table' in link) || canAccess(link.table),
  )
  const activeSection = activeNavigationSection(location.pathname)

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
                'mb-2 flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl px-2.5 text-[13px] font-bold text-white/70',
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
            <span className={cn('min-w-0 flex-1 whitespace-nowrap', sidebarCollapsed && 'lg:hidden')}>
              RESUMEN
            </span>
          </NavLink>
          <div className="space-y-1">
            {visibleNavigationSections.map((section) => {
              const expanded = openSections.has(section.id)
              const sectionActive = activeSection === section.id
              const SectionIcon = section.icon

              return (
                <section key={section.id}>
                  <button
                    aria-controls={'sidebar-section-' + section.id}
                    aria-expanded={expanded}
                    className={cn(
                      'flex min-h-10 w-full min-w-0 items-center gap-2 rounded-xl px-2 text-left text-[11px] font-black tracking-[0.04em] text-white/45 transition hover:bg-white/5 hover:text-white/80',
                      sidebarCollapsed && 'lg:justify-center lg:px-0',
                      sectionActive && 'text-brand-300',
                    )}
                    onClick={() => toggleSection(section.id)}
                    title={section.label.toLocaleUpperCase('es-MX')}
                    type="button"
                  >
                    <span className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-[10px] text-white/65',
                      sectionActive && 'border-brand-400/40 bg-brand-500/15 text-brand-300',
                    )}>
                      <SectionIcon className="size-4" strokeWidth={2} />
                    </span>
                    <span className={cn('min-w-0 flex-1 leading-tight', sidebarCollapsed && 'lg:hidden')}>
                      {section.label.toLocaleUpperCase('es-MX')}
                    </span>
                    <ChevronDown className={cn(
                      'size-4 shrink-0 transition-transform',
                      expanded && 'rotate-180',
                      sidebarCollapsed && 'lg:hidden',
                    )} />
                  </button>

                  {expanded && (
                    <div
                      className={cn(
                        'ml-3 space-y-0.5 border-l border-white/10 py-1 pl-2',
                        sidebarCollapsed && 'lg:ml-0 lg:border-l-0 lg:pl-0',
                      )}
                      id={'sidebar-section-' + section.id}
                    >
                      {section.items.map((item) => (
                        <SidebarNavigationItem
                          collapsed={sidebarCollapsed}
                          item={item}
                          key={item.kind + '-' + item.label}
                          onNavigate={() => setMenuOpen(false)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
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
              onClick={() => void logout()}
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
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-black/5 bg-[#f7f3f1]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
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
            <p className="text-xs capitalize text-ink-800/60">{formatOperationDate(new Date())}</p>
          </div>
          <SyncStatus />
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navegación principal móvil"
        className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-2xl border border-black/5 bg-white/95 p-1.5 shadow-2xl shadow-ink-950/20 backdrop-blur lg:hidden"
      >
        {visibleMobileLinks.map(({ icon: Icon, label, to }) => (
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

function SidebarNavigationItem({
  collapsed,
  item,
  onNavigate,
}: {
  readonly collapsed: boolean
  readonly item: NavigationItem
  readonly onNavigate: () => void
}) {
  const sharedClassName = cn(
    'flex min-h-10 min-w-0 items-center gap-2.5 rounded-xl px-2.5 text-[12px] font-semibold transition',
    collapsed && 'lg:justify-center lg:px-0',
  )

  if (item.kind === 'pending') {
    return (
      <div
        aria-disabled="true"
        className={cn(sharedClassName, 'cursor-not-allowed text-white/30')}
        title={item.label.toLocaleUpperCase('es-MX') + ' · PENDIENTE'}
      >
        <Construction className="size-5 shrink-0" />
        <span className={cn('min-w-0 flex-1 whitespace-nowrap', collapsed && 'lg:hidden')}>
          {item.label.toLocaleUpperCase('es-MX')}
        </span>
        <span className={cn(
          'rounded-full border border-white/10 px-1.5 py-0.5 text-[8px] font-black tracking-wide text-white/35',
          collapsed && 'lg:hidden',
        )}>
          PENDIENTE
        </span>
      </div>
    )
  }

  const table = item.kind === 'table'
    ? tableDefinitions.find((candidate) => candidate.name === item.table)
    : undefined
  const to = item.kind === 'table' ? tablePath(item.table) : item.to

  return (
    <NavLink
      className={({ isActive }) => cn(
        sharedClassName,
        'text-white/65 hover:bg-white/5 hover:text-white',
        isActive && 'bg-brand-400 text-[#191919] hover:bg-brand-400 hover:text-[#191919]',
      )}
      onClick={onNavigate}
      title={item.label.toLocaleUpperCase('es-MX')}
      to={to}
    >
      {item.kind === 'route'
        ? <LockKeyhole className="size-5 shrink-0" strokeWidth={2} />
        : item.table === 'Perfiles'
          ? <IdCard className="size-5 shrink-0" strokeWidth={2} />
          : <TableIcon className="shrink-0" name={table?.icon ?? 'LayoutGrid'} />}
      <span className={cn(
        'min-w-0 flex-1 whitespace-nowrap',
        item.label.length >= 18 && 'text-[11px]',
        collapsed && 'lg:hidden',
      )}>
        {item.label.toLocaleUpperCase('es-MX')}
      </span>
    </NavLink>
  )
}

function formatOperationDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'full',
    timeZone: 'America/Mexico_City',
  }).format(date)
}
