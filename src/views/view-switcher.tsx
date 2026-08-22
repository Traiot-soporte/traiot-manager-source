import { BarChart3, CalendarDays, CreditCard, Gauge, List, Rows3 } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { CollectionViewKind } from '@/views/view-kinds'

const options = [
  { kind: 'table', label: 'Tabla', icon: Rows3 },
  { kind: 'deck', label: 'Lista', icon: List },
  { kind: 'card', label: 'Tarjetas', icon: CreditCard },
  { kind: 'calendar', label: 'Calendario', icon: CalendarDays },
  { kind: 'chart', label: 'Gráfica', icon: BarChart3 },
  { kind: 'dashboard', label: 'Panel', icon: Gauge },
] as const

interface ViewSwitcherProps {
  readonly value: CollectionViewKind
  readonly onChange: (value: CollectionViewKind) => void
}

export function ViewSwitcher({ onChange, value }: ViewSwitcherProps) {
  return (
    <div aria-label="Cambiar vista" className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-black/5 bg-white p-1 shadow-sm" role="group">
      {options.map(({ icon: Icon, kind, label }) => (
        <button
          aria-pressed={value === kind}
          className={cn(
            'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-black transition',
            value === kind ? 'bg-ink-950 text-white' : 'text-ink-800/55 hover:bg-mint-50 hover:text-mint-600',
          )}
          key={kind}
          onClick={() => onChange(kind)}
          type="button"
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  )
}
