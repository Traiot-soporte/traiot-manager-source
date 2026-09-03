import { Download, RefreshCw, WifiOff, X } from 'lucide-react'
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

interface PwaContextValue {
  readonly canInstall: boolean
  readonly install: () => Promise<void>
}

const PwaContext = createContext<PwaContextValue>({
  canInstall: false,
  install: () => Promise.resolve(),
})

export function PwaProvider({ children }: PropsWithChildren) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [online, setOnline] = useState(() => window.navigator.onLine)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('No fue posible registrar la aplicación instalable.', error)
    },
  })

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => setInstallPrompt(null)
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('appinstalled', handleInstalled)
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('appinstalled', handleInstalled)
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!offlineReady) return
    const timeout = window.setTimeout(() => setOfflineReady(false), 7000)
    return () => window.clearTimeout(timeout)
  }, [offlineReady, setOfflineReady])

  const install = useCallback(async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }, [installPrompt])

  const value = useMemo<PwaContextValue>(() => ({
    canInstall: installPrompt !== null,
    install,
  }), [install, installPrompt])

  return (
    <PwaContext.Provider value={value}>
      {children}
      {!online ? (
        <PwaNotice
          icon={WifiOff}
          message="Sin conexión. Puedes consultar la interfaz, pero los datos y cambios requieren internet."
          tone="danger"
        />
      ) : needRefresh ? (
        <PwaNotice
          actionLabel="ACTUALIZAR"
          icon={RefreshCw}
          message="Hay una nueva versión de TRAIOT Manager disponible."
          onAction={() => void updateServiceWorker(true)}
          onClose={() => setNeedRefresh(false)}
        />
      ) : offlineReady ? (
        <PwaNotice
          message="TRAIOT Manager quedó instalado para abrirse aun sin conexión. Los datos siguen requiriendo internet."
          onClose={() => setOfflineReady(false)}
        />
      ) : null}
    </PwaContext.Provider>
  )
}

interface PwaInstallButtonProps {
  readonly className?: string
  readonly dark?: boolean
}

export function PwaInstallButton({ className, dark = false }: PwaInstallButtonProps) {
  const { canInstall, install } = useContext(PwaContext)

  if (!canInstall) return null

  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-3 text-xs font-black transition hover:-translate-y-0.5',
        dark
          ? 'border-white/15 bg-white/5 text-white hover:bg-white/10'
          : 'border-black/15 bg-white text-ink-950 hover:border-brand-400',
        className,
      )}
      onClick={() => void install()}
      type="button"
    >
      <Download className="size-4" />
      <span className="hidden sm:inline">INSTALAR APP</span>
    </button>
  )
}

interface PwaNoticeProps {
  readonly actionLabel?: string
  readonly icon?: typeof WifiOff
  readonly message: string
  readonly onAction?: () => void
  readonly onClose?: () => void
  readonly tone?: 'danger' | 'neutral'
}

function PwaNotice({
  actionLabel,
  icon: Icon,
  message,
  onAction,
  onClose,
  tone = 'neutral',
}: PwaNoticeProps) {
  return (
    <aside
      aria-live="polite"
      className={cn(
        'fixed inset-x-3 bottom-20 z-[100] mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border p-3 shadow-2xl lg:bottom-5',
        tone === 'danger'
          ? 'border-red-300 bg-red-50 text-red-900'
          : 'border-white/10 bg-[#191919] text-white',
      )}
      role="status"
    >
      {Icon ? <Icon className="size-5 shrink-0" /> : null}
      <p className="flex-1 text-xs font-bold leading-5 sm:text-sm">{message}</p>
      {onAction && actionLabel ? (
        <button
          className="min-h-10 rounded-xl bg-brand-400 px-3 text-xs font-black text-[#191919]"
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </button>
      ) : null}
      {onClose ? (
        <button
          aria-label="Cerrar aviso"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-current/15"
          onClick={onClose}
          type="button"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </aside>
  )
}
