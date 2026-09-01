import { Moon, Sun } from 'lucide-react'

import { cn } from '@/lib/utils'

export type ThemeMode = 'light' | 'dark'

interface ThemeToggleProps {
  readonly theme: ThemeMode
  readonly onToggle: () => void
  readonly compact?: boolean
  readonly className?: string
}

export function ThemeToggle({ className, compact = false, onToggle, theme }: ThemeToggleProps) {
  const dark = theme === 'dark'
  const label = dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'

  return (
    <button
      aria-label={label}
      className={cn(
        'flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black text-white/75 transition hover:border-brand-400/50 hover:bg-white/10 hover:text-white',
        compact && 'lg:justify-center lg:px-0',
        className,
      )}
      onClick={onToggle}
      style={{ fontSize: '12px' }}
      title={label}
      type="button"
    >
      {dark ? <Sun className="size-5 shrink-0" /> : <Moon className="size-5 shrink-0" />}
      <span className={cn(compact && 'lg:hidden')}>{dark ? 'TEMA CLARO' : 'TEMA OSCURO'}</span>
    </button>
  )
}
