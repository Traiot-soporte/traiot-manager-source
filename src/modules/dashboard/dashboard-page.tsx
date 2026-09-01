import { useQuery } from '@tanstack/react-query'
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Boxes,
  CheckCircle2, Clock3, FlaskConical, Headphones, PackageX, RefreshCw,
  Target, Users, Wrench, type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { ModuleHeader } from '@/components/module-header'
import type { DashboardOverview } from '@/data/repository'
import { useRepository } from '@/data/use-repository'
import { cn } from '@/lib/utils'

interface Priority {
  readonly title: string
  readonly detail: string
  readonly count: number
  readonly severity: 'critical' | 'warning' | 'info'
  readonly to: string
  readonly icon: LucideIcon
}

const numberFormatter = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })

export function DashboardPage() {
  const repository = useRepository()
  const overview = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => repository.getDashboardOverview(),
    refetchInterval: 60_000,
  })
  const data = overview.data
  const priorities = data ? buildPriorities(data) : []

  return (
    <div className="space-y-5">
      <ModuleHeader
        action={(
          <button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-ink-950 transition hover:bg-brand-50 disabled:opacity-50" disabled={overview.isFetching} onClick={() => void overview.refetch()} type="button">
            <RefreshCw className={cn('size-4', overview.isFetching && 'animate-spin')} /> ACTUALIZAR
          </button>
        )}
        description="Alertas, ritmo operativo y oportunidades ordenadas por impacto."
        eyebrow="Resumen ejecutivo"
        icon={<Target className="size-5" />}
        title="CENTRO DE DECISIONES"
        tone="light"
      />

      {overview.isPending && <DashboardSkeleton />}
      {overview.isError && <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-800">No fue posible preparar los indicadores. Actualiza la pantalla para intentarlo nuevamente.</section>}
      {data && (
        <>
          <FocusSection priorities={priorities.slice(0, 6)} total={priorities.length} />
          <ExecutiveKpis data={data} />
          <AreaDecisions data={data} />
          <p className="text-right text-[10px] font-bold uppercase tracking-wide text-ink-800/35">Corte: {formatGeneratedAt(data.generatedAt)} · actualización automática cada minuto</p>
        </>
      )}
    </div>
  )
}

function FocusSection({ priorities, total }: { readonly priorities: readonly Priority[]; readonly total: number }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-ink-950 text-white shadow-lg">
      <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400">Prioridad del día</p><h2 className="mt-1 text-xl font-black">EN QUÉ PONER ATENCIÓN</h2></div>
        <p className="text-xs font-bold text-white/45">{total === 0 ? 'Sin alertas activas' : `${total} ${total === 1 ? 'situación detectada' : 'situaciones detectadas'}`}</p>
      </div>
      {priorities.length === 0 ? (
        <div className="flex items-center gap-4 p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300"><CheckCircle2 className="size-6" /></span>
          <div><h3 className="font-black">Operación sin alertas críticas</h3><p className="mt-1 text-sm text-white/50">No hay pendientes que requieran intervención inmediata.</p></div>
        </div>
      ) : (
        <div className="grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-3">
          {priorities.map((priority, index) => <PriorityCard key={`${priority.title}-${index}`} priority={priority} rank={index + 1} />)}
        </div>
      )}
    </section>
  )
}

function PriorityCard({ priority, rank }: { readonly priority: Priority; readonly rank: number }) {
  const Icon = priority.icon
  const tone = { critical: 'bg-red-400/15 text-red-300', warning: 'bg-amber-400/15 text-amber-300', info: 'bg-sky-400/15 text-sky-300' }[priority.severity]
  return (
    <Link className="group flex min-h-32 flex-col justify-between bg-ink-950 p-4 transition hover:bg-white/[0.04]" to={priority.to}>
      <div className="flex items-start justify-between gap-3"><span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tone)}><Icon className="size-5" /></span><span className="text-[10px] font-black text-white/25">PRIORIDAD {rank}</span></div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div><p className="text-lg font-black">{formatNumber(priority.count)} · {priority.title}</p><p className="mt-1 text-xs leading-5 text-white/45">{priority.detail}</p></div>
        <ArrowRight className="mb-1 size-4 shrink-0 text-brand-400 transition group-hover:translate-x-1" />
      </div>
    </Link>
  )
}

function ExecutiveKpis({ data }: { readonly data: DashboardOverview }) {
  const sections = new Set(data.availableSections)
  const kpis: KpiProps[] = []
  if (sections.has('inventory')) {
    kpis.push({ icon: Boxes, label: 'Existencias actuales', value: formatNumber(data.inventory.units), hint: `${formatNumber(data.inventory.products)} productos` })
    kpis.push({ icon: data.inventory.netUnits30Days >= 0 ? ArrowUpRight : ArrowDownRight, label: 'Flujo neto · 30 días', value: signedNumber(data.inventory.netUnits30Days), hint: `${formatNumber(data.inventory.purchasedUnits30Days)} entradas · ${formatNumber(data.inventory.exitedUnits30Days)} salidas`, tone: data.inventory.netUnits30Days < 0 ? 'warning' : 'positive' })
  }
  if (sections.has('crm')) {
    kpis.push({ icon: Users, label: 'Directorio comercial', value: formatNumber(data.crm.contacts), hint: `${formatNumber(data.crm.contactsUpdated30Days)} actualizados en 30 días` })
    kpis.push({ icon: Target, label: 'Prospectos', value: formatNumber(data.crm.prospects), hint: `${formatNumber(data.crm.clients)} clientes` })
  }
  if (sections.has('engineering')) {
    kpis.push({ icon: Headphones, label: 'Tickets abiertos', value: formatNumber(data.engineering.openTickets), hint: `${formatNumber(data.engineering.ticketsInFollowUp)} en seguimiento`, tone: data.engineering.openTickets ? 'warning' : 'positive' })
    kpis.push({ icon: FlaskConical, label: 'Equipos en laboratorio', value: formatNumber(data.engineering.laboratoryOpen), hint: `${formatNumber(data.engineering.laboratoryUrgent)} urgentes`, tone: data.engineering.laboratoryUrgent ? 'warning' : 'positive' })
  }
  if (sections.has('technical')) kpis.push({ icon: Wrench, label: 'Servicios · 30 días', value: formatNumber(data.technical.services30Days), hint: `${formatNumber(data.technical.openServices)} abiertos` })

  return <section><SectionHeading eyebrow="Pulso operativo" title="INDICADORES CLAVE" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{kpis.map((kpi) => <Kpi key={kpi.label} {...kpi} />)}</div></section>
}

interface KpiProps { readonly icon: LucideIcon; readonly label: string; readonly value: string; readonly hint: string; readonly tone?: 'positive' | 'warning' }

function Kpi({ icon: Icon, label, value, hint, tone }: KpiProps) {
  return (
    <article className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3"><span className={cn('grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600', tone === 'positive' && 'bg-emerald-50 text-emerald-700', tone === 'warning' && 'bg-amber-50 text-amber-700')}><Icon className="size-5" /></span><Activity className="size-4 text-ink-800/15" /></div>
      <p className="mt-4 text-2xl font-black leading-none text-ink-950">{value}</p><p className="mt-2 text-[10px] font-black uppercase tracking-wide text-ink-800/45">{label}</p><p className="mt-1 text-xs font-semibold text-ink-800/55">{hint}</p>
    </article>
  )
}

function AreaDecisions({ data }: { readonly data: DashboardOverview }) {
  const sections = new Set(data.availableSections)
  return (
    <section><SectionHeading eyebrow="Lectura por área" title="DECISIONES RECOMENDADAS" /><div className="grid gap-4 xl:grid-cols-2">
      {sections.has('inventory') && <InventoryDecision data={data} />}{sections.has('crm') && <CrmDecision data={data} />}{sections.has('engineering') && <EngineeringDecision data={data} />}{sections.has('technical') && <TechnicalDecision data={data} />}
    </div></section>
  )
}

function InventoryDecision({ data }: { readonly data: DashboardOverview }) {
  const inventory = data.inventory
  const total = Math.max(1, inventory.outOfStock + inventory.reorder + inventory.adequate + inventory.overstock)
  const recommendation = inventory.outOfStock ? `Atiende primero ${inventory.outOfStock} productos sin existencias.` : inventory.reorder ? `Prepara reposición para ${inventory.reorder} productos bajo mínimo.` : inventory.overstock ? `Revisa rotación de ${inventory.overstock} productos con sobrestock.` : 'El inventario se encuentra dentro de los niveles definidos.'
  return (
    <DecisionCard action="Revisar inventario" icon={Boxes} recommendation={recommendation} title="Inventario y abastecimiento" to="/tablas/ALMACEN">
      <div className="flex h-2 overflow-hidden rounded-full bg-black/5" aria-label="Distribución del estado del inventario"><span className="bg-red-500" style={{ width: `${inventory.outOfStock / total * 100}%` }} /><span className="bg-amber-400" style={{ width: `${inventory.reorder / total * 100}%` }} /><span className="bg-emerald-500" style={{ width: `${inventory.adequate / total * 100}%` }} /><span className="bg-sky-500" style={{ width: `${inventory.overstock / total * 100}%` }} /></div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><Fact color="red" label="Agotados" value={inventory.outOfStock} /><Fact color="amber" label="Reabastecer" value={inventory.reorder} /><Fact color="emerald" label="Adecuados" value={inventory.adequate} /><Fact color="sky" label="Sobrestock" value={inventory.overstock} /></div>
    </DecisionCard>
  )
}

function CrmDecision({ data }: { readonly data: DashboardOverview }) {
  const crm = data.crm
  const coverage = crm.contacts ? Math.round(crm.contactsUpdated30Days / crm.contacts * 100) : 0
  const recommendation = crm.contactsWithoutChannel ? `Completa datos de contacto en ${crm.contactsWithoutChannel} registros sin teléfono ni correo.` : crm.contactsWithoutResponsible ? `Asigna responsable a ${crm.contactsWithoutResponsible} contactos.` : `${coverage}% del directorio tuvo actividad durante los últimos 30 días.`
  return <DecisionCard action="Abrir seguimiento" icon={Users} recommendation={recommendation} title="Cobertura comercial" to="/tablas/Gestion%20Clientes"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Fact label="Contactos" value={crm.contacts} /><Fact label="Actualizados" value={crm.contactsUpdated30Days} /><Fact color="amber" label="Sin canal" value={crm.contactsWithoutChannel} /><Fact color="red" label="Sin responsable" value={crm.contactsWithoutResponsible} /></div></DecisionCard>
}

function EngineeringDecision({ data }: { readonly data: DashboardOverview }) {
  const value = data.engineering
  const recommendation = value.laboratoryUrgent ? `Escala ${value.laboratoryUrgent} diagnósticos con más de 6 días.` : value.openTickets ? `Da seguimiento a ${value.openTickets} tickets aún sin solución.` : 'Soporte y laboratorio no presentan pendientes críticos.'
  return <DecisionCard action="Revisar laboratorio" icon={FlaskConical} recommendation={recommendation} title="Ingeniería y soporte" to="/tablas/Laboratorio"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Fact label="Tickets abiertos" value={value.openTickets} /><Fact color="amber" label="En seguimiento" value={value.ticketsInFollowUp} /><Fact color="red" label="Lab. urgentes" value={value.laboratoryUrgent} /><Fact color="amber" label="Por vencer" value={value.laboratoryDueSoon} /></div></DecisionCard>
}

function TechnicalDecision({ data }: { readonly data: DashboardOverview }) {
  const recommendation = data.technical.openServices ? `Revisa el avance de ${data.technical.openServices} servicios todavía abiertos.` : 'No hay servicios pendientes de cierre.'
  return <DecisionCard action="Abrir servicios" icon={Wrench} recommendation={recommendation} title="Operación técnica" to="/tablas/INSTALACIONES"><div className="grid grid-cols-3 gap-2"><Fact label="Históricos" value={data.technical.services} /><Fact label="Últimos 30 días" value={data.technical.services30Days} /><Fact color="amber" label="Abiertos" value={data.technical.openServices} /></div></DecisionCard>
}

interface DecisionCardProps { readonly action: string; readonly children: ReactNode; readonly icon: LucideIcon; readonly recommendation: string; readonly title: string; readonly to: string }

function DecisionCard({ action, children, icon: Icon, recommendation, title, to }: DecisionCardProps) {
  return (
    <article className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-950 text-brand-400"><Icon className="size-5" /></span><div className="min-w-0 flex-1"><h3 className="font-black text-ink-950">{title}</h3><p className="mt-1 text-xs font-semibold leading-5 text-ink-800/55">{recommendation}</p></div></div><div className="mt-5">{children}</div><Link className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-50 px-4 text-xs font-black text-brand-700 transition hover:bg-brand-100" to={to}>{action} <ArrowRight className="size-4" /></Link></article>
  )
}

function Fact({ color, label, value }: { readonly color?: 'red' | 'amber' | 'emerald' | 'sky'; readonly label: string; readonly value: number }) {
  const dot = { red: 'bg-red-500', amber: 'bg-amber-400', emerald: 'bg-emerald-500', sky: 'bg-sky-500' }[color ?? 'emerald']
  return <div className="rounded-xl bg-black/[0.025] p-2.5"><p className="flex items-center gap-1.5 text-lg font-black text-ink-950"><span className={cn('size-2 rounded-full', dot)} />{formatNumber(value)}</p><p className="mt-1 text-[9px] font-black uppercase tracking-wide text-ink-800/40">{label}</p></div>
}

function SectionHeading({ eyebrow, title }: { readonly eyebrow: string; readonly title: string }) {
  return <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600">{eyebrow}</p><h2 className="mt-1 text-lg font-black text-ink-950">{title}</h2></div>
}

function DashboardSkeleton() {
  return <div className="space-y-4" aria-label="Preparando indicadores"><div className="h-52 animate-pulse rounded-3xl bg-ink-950/10" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div className="h-36 animate-pulse rounded-2xl bg-black/5" key={index} />)}</div></div>
}

function buildPriorities(data: DashboardOverview): readonly Priority[] {
  const sections = new Set(data.availableSections)
  const priorities: Priority[] = []
  if (sections.has('inventory') && data.inventory.outOfStock > 0) priorities.push({ title: 'productos agotados', detail: 'No pueden surtirse hasta registrar una entrada.', count: data.inventory.outOfStock, severity: 'critical', to: '/tablas/ALMACEN', icon: PackageX })
  if (sections.has('engineering') && data.engineering.laboratoryUrgent > 0) priorities.push({ title: 'diagnósticos urgentes', detail: 'Equipos abiertos con más de 6 días en laboratorio.', count: data.engineering.laboratoryUrgent, severity: 'critical', to: '/tablas/Laboratorio', icon: FlaskConical })
  if (data.communications.due > 0) priorities.push({ title: 'comunicaciones por atender', detail: 'La fecha programada ya llegó y falta confirmar el envío.', count: data.communications.due, severity: 'critical', to: '/comunicaciones', icon: Clock3 })
  if (sections.has('inventory') && data.inventory.reorder > 0) priorities.push({ title: 'productos por reabastecer', detail: 'Existencia igual o menor al mínimo definido.', count: data.inventory.reorder, severity: 'warning', to: '/tablas/ALMACEN', icon: AlertTriangle })
  if (sections.has('engineering') && data.engineering.openTickets > 0) priorities.push({ title: 'tickets abiertos', detail: 'Solicitudes de soporte que aún no están solucionadas.', count: data.engineering.openTickets, severity: 'warning', to: '/tablas/Ticket%20Soporte', icon: Headphones })
  if (sections.has('crm') && data.crm.contactsWithoutChannel > 0) priorities.push({ title: 'contactos incompletos', detail: 'Sin teléfono, móvil ni correo para dar seguimiento.', count: data.crm.contactsWithoutChannel, severity: 'warning', to: '/tablas/Gestion%20Clientes', icon: Users })
  if (sections.has('crm') && data.crm.contactsWithoutResponsible > 0) priorities.push({ title: 'contactos sin responsable', detail: 'Requieren asignación para evitar oportunidades abandonadas.', count: data.crm.contactsWithoutResponsible, severity: 'warning', to: '/tablas/Gestion%20Clientes', icon: Target })
  if (sections.has('inventory') && data.inventory.overstock > 0) priorities.push({ title: 'productos con sobrestock', detail: 'Conviene revisar rotación antes de volver a comprar.', count: data.inventory.overstock, severity: 'info', to: '/tablas/ALMACEN', icon: Boxes })
  return priorities
}

function formatNumber(value: number): string { return numberFormatter.format(value) }
function signedNumber(value: number): string { return `${value > 0 ? '+' : ''}${formatNumber(value)}` }
function formatGeneratedAt(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'ahora'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(date)
}
