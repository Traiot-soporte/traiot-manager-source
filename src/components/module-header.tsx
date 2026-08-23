import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface ModuleHeaderProps {
  readonly action?: ReactNode
  readonly description?: ReactNode
  readonly eyebrow: ReactNode
  readonly footer?: ReactNode
  readonly icon: ReactNode
  readonly title: ReactNode
  readonly tone?: 'dark' | 'light'
}

export function ModuleHeader({
  action,
  description,
  eyebrow,
  footer,
  icon,
  title,
  tone = 'dark',
}: ModuleHeaderProps) {
  const dark = tone === 'dark'

  return (
    <section className={cn(
      'overflow-hidden rounded-3xl shadow-sm',
      dark ? 'bg-ink-950 text-white shadow-lg' : 'bg-white text-ink-950',
    )}>
      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn(
            'grid size-11 shrink-0 place-items-center rounded-xl',
            dark ? 'bg-brand-400 text-[#191919]' : 'bg-ink-950 text-brand-400',
          )}>
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-500">{eyebrow}</p>
            <h1 className="mt-1 truncate text-2xl font-black tracking-tight">{title}</h1>
            {description && (
              <p className={cn(
                'mt-1 max-w-3xl text-xs leading-5 sm:text-sm',
                dark ? 'text-white/50' : 'text-ink-800/55',
              )}>
                {description}
              </p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0 self-start lg:self-center">{action}</div>}
      </div>
      {footer && (
        <div className={cn(
          'flex flex-wrap items-center gap-3 border-t px-4 py-2.5 text-xs font-bold sm:px-5',
          dark ? 'border-white/8 bg-white/[0.03] text-white/55' : 'border-black/5 bg-brand-50 text-brand-600',
        )}>
          {footer}
        </div>
      )}
    </section>
  )
}
