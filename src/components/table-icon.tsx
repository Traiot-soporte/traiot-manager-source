import {
  Boxes,
  Building2,
  Cpu,
  Factory,
  FlaskConical,
  Fuel,
  Handshake,
  IdCard,
  Images,
  LayoutGrid,
  LifeBuoy,
  ListChecks,
  Package,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

const iconMap: Readonly<Record<string, LucideIcon>> = {
  Package,
  Truck,
  ShoppingCart,
  Factory,
  Building2,
  Handshake,
  LifeBuoy,
  Wrench,
  Images,
  Fuel,
  ListChecks,
  FlaskConical,
  Cpu,
  Users,
  IdCard,
  ShieldCheck,
  LayoutGrid,
}

interface TableIconProps {
  readonly name: string
  readonly className?: string
}

export function TableIcon({ name, className }: TableIconProps) {
  const Icon = iconMap[name] ?? Boxes
  return <Icon aria-hidden="true" className={cn('size-5', className)} strokeWidth={1.8} />
}
