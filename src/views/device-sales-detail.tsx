import {
  AlertTriangle,
  BadgeCheck,
  ExternalLink,
  Gauge,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
} from 'lucide-react'

import { findDeviceSalesProfile } from '@/data/device-sales-profiles'
import type { RowData, TableDef } from '@/schema'
import { CellDisplay } from '@/views/cell-display'
import { safeExternalUrl } from '@/views/url-utils'
import { getDisplayColumns } from '@/views/view-utils'

interface DeviceSalesDetailProps {
  readonly row: RowData
  readonly table: TableDef
}

const identityColumns = new Set(['Modelo', 'Marca', 'Imagen', 'Ficha_Tecnica'])

export function DeviceSalesDetail({ row, table }: DeviceSalesDetailProps) {
  const profile = findDeviceSalesProfile(row.Modelo)
  const model = text(row.Modelo) || profile?.model || 'Modelo sin nombre'
  const brand = text(row.Marca) || profile?.brand || 'Marca por definir'
  const imageColumn = table.columns.find((column) => column.name === 'Imagen')
  const technicalSheetColumn = table.columns.find((column) => column.name === 'Ficha_Tecnica')
  const technicalColumns = getDisplayColumns(table).filter((column) => !identityColumns.has(column.name))
  const technicalSheetUrl = safeExternalUrl(row.Ficha_Tecnica)
  const sourceUrl = safeExternalUrl(profile?.sourceUrl)

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="flex min-h-80 items-center justify-center border-b border-black/5 bg-gradient-to-br from-brand-50 via-white to-brand-100/60 p-6 lg:border-b-0 lg:border-r">
            {imageColumn
              ? <CellDisplay column={imageColumn} table={table.name} value={row.Imagen} />
              : <span className="text-sm font-bold text-ink-800/45">Sin imagen</span>}
          </div>

          <div className="flex flex-col justify-between p-6 sm:p-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-brand-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-brand-700">Guía comercial</span>
                {profile?.competitionLevel && <span className="rounded-full border border-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-ink-800/55">Competencia {profile.competitionLevel}</span>}
                {profile?.differentialValue && <span aria-label="Valor diferencial" className="rounded-full bg-emerald-50 px-3 py-1 text-sm tracking-widest ring-1 ring-inset ring-emerald-200">{profile.differentialValue}</span>}
              </div>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-brand-600">{brand}</p>
              <h2 className="mt-1 text-3xl font-black text-ink-950 sm:text-4xl">{model}</h2>
              <p className="mt-3 max-w-3xl text-base font-semibold leading-relaxed text-ink-800/65">{profile?.segment || text(row.Tipo) || 'Perfil técnico y comercial del dispositivo.'}</p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {sourceUrl && <a className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink-950 px-4 text-xs font-black text-white transition hover:bg-brand-600" href={sourceUrl} rel="noopener noreferrer" target="_blank">FUENTE OFICIAL <ExternalLink className="size-4" /></a>}
              {technicalSheetUrl && technicalSheetColumn && <a className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 text-xs font-black text-brand-700 transition hover:bg-brand-100" href={technicalSheetUrl} rel="noopener noreferrer" target="_blank">FICHA TÉCNICA <ExternalLink className="size-4" /></a>}
            </div>
          </div>
        </div>
      </section>

      {profile ? <>
        <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
          <article className="rounded-3xl bg-ink-950 p-6 text-white shadow-lg sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-500 text-ink-950"><Target className="size-6" /></span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-300">Argumento recomendado</p>
                <h3 className="mt-2 text-xl font-black leading-snug sm:text-2xl">{profile.salesArgument}</h3>
                <p className="mt-4 border-l-2 border-brand-400 pl-4 text-sm font-semibold leading-relaxed text-white/65">{profile.mainStrength}</p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Swords className="size-5" /></span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-800/40">Panorama competitivo</p>
                <h3 className="text-lg font-black text-ink-950">Rivales de referencia</h3>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <CompetitorCard index="01" name={profile.competitor1} />
              <CompetitorCard index="02" name={profile.competitor2} />
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <SalesInsightCard
            body={profile.capabilities}
            icon={<Gauge className="size-5" />}
            kicker="Lo que ofrece"
            title="Capacidades clave"
          />
          <SalesInsightCard
            accent="positive"
            body={profile.whyBetter}
            icon={<ShieldCheck className="size-5" />}
            kicker="Cómo posicionarlo"
            title="Por qué puede ganar"
          />
          <SalesInsightCard
            accent="warning"
            body={profile.commercialCaution}
            icon={<AlertTriangle className="size-5" />}
            kicker="Antes de prometer"
            title="Precaución comercial"
          />
        </section>

        <section className="rounded-3xl border border-brand-200 bg-brand-50 p-6 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-500 text-ink-950"><Lightbulb className="size-5" /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-700">Mensaje para el vendedor</p>
              <h3 className="mt-1 text-xl font-black text-ink-950">Fortaleza principal: {profile.mainStrength}</h3>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-ink-800/70">Presenta primero el caso de uso y después respáldalo con las capacidades. La comparación sirve como guía; confirma siempre cobertura, interfaces y accesorios requeridos para el proyecto.</p>
            </div>
          </div>
        </section>
      </> : <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div>
            <h3 className="font-black text-amber-950">Perfil comercial pendiente de relacionar</h3>
            <p className="mt-1 text-sm font-semibold text-amber-900/65">La ficha técnica se conserva completa. Este modelo todavía no tiene una coincidencia en la matriz comparativa proporcionada.</p>
          </div>
        </div>
      </section>}

      <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><BadgeCheck className="size-5" /></span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-600">Consulta técnica</p>
            <h2 className="text-lg font-black text-ink-950">Información del dispositivo</h2>
          </div>
        </div>
        <dl className="mt-6 grid gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          {technicalColumns.map((column) => (
            <div className={column.type === 'LongText' ? 'md:col-span-2 xl:col-span-3' : undefined} key={column.name}>
              <dt className="text-[11px] font-black uppercase tracking-wide text-ink-800/40">{column.label ?? column.name}</dt>
              <dd className="mt-1 break-words text-sm font-semibold text-ink-800"><CellDisplay column={column} table={table.name} value={row[column.name]} /></dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}

function CompetitorCard({ index, name }: { readonly index: string; readonly name: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-[#f8f5f3] p-4">
      <span className="text-[10px] font-black text-brand-600">{index}</span>
      <p className="mt-1 text-sm font-black leading-snug text-ink-950">{name || 'Sin referencia'}</p>
    </div>
  )
}

interface SalesInsightCardProps {
  readonly accent?: 'positive' | 'warning'
  readonly body: string
  readonly icon: React.ReactNode
  readonly kicker: string
  readonly title: string
}

function SalesInsightCard({ accent, body, icon, kicker, title }: SalesInsightCardProps) {
  const iconStyle = accent === 'positive'
    ? 'bg-emerald-50 text-emerald-700'
    : accent === 'warning'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-brand-50 text-brand-600'

  return (
    <article className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <span className={'grid size-10 place-items-center rounded-xl ' + iconStyle}>{icon}</span>
      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-ink-800/40">{kicker}</p>
      <h3 className="mt-1 text-lg font-black text-ink-950">{title}</h3>
      <p className="mt-3 text-sm font-semibold leading-relaxed text-ink-800/65">{body}</p>
    </article>
  )
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value).trim()
    : ''
}
