import type { RowData, UserContext } from '@/schema'
import { laboratoryTests } from '@/schema/catalogs'

export const laboratoryImageColumns = Array.from(
  { length: 5 },
  (_, index) => `IMAGEN ${String(index + 1)}`,
)

export function buildLaboratoryPdfFilename(row: RowData): string {
  const folio = sanitizeFilenamePart(cleanText(row.FOLIO)) || 'SIN-FOLIO'
  const imei = sanitizeFilenamePart(cleanText(row.IMEI)) || 'SIN-IMEI'
  return `${folio}-${imei}.pdf`
}

interface LaboratoryReportInput {
  readonly row: RowData
  readonly imageData: Readonly<Record<string, string | undefined>>
  readonly logoData?: string | undefined
  readonly clientName?: string
  readonly generatedAt?: Date
  readonly generatedBy?: Pick<UserContext, 'name' | 'email' | 'role'>
}

interface ReportField {
  readonly label: string
  readonly value: unknown
  readonly kind?: 'date' | 'number'
}

export function buildLaboratoryDiagnosticHtml({
  row,
  imageData,
  logoData,
  clientName,
  generatedAt = new Date(),
  generatedBy,
}: LaboratoryReportInput): string {
  const folio = cleanText(row.FOLIO) || 'SIN FOLIO'
  const status = cleanText(row.ESTATUS) || 'Sin estatus'
  const semaphore = cleanText(row.SEMAFORO) || 'Sin semáforo'
  const tests = normalizeLaboratoryTests(row['PRUEBAS REALIZADAS'])
  const evidence = laboratoryImageColumns.map((column, index) => ({
    number: index + 1,
    sourceValue: cleanText(row[column]),
    image: imageData[column],
    notes: cleanText(row[`NOTAS IMAGEN ${String(index + 1)}`]),
  })).filter((item) => item.sourceValue || item.image || item.notes)

  const equipmentFields: readonly ReportField[] = [
    { label: 'Folio', value: row.FOLIO },
    { label: 'Marca', value: row.MARCA },
    { label: 'Modelo', value: row.MODELO },
    { label: 'IMEI', value: row.IMEI },
    { label: 'Teléfono / SIM', value: row['TEL SIM'] },
    { label: 'Cliente', value: clientName || row.CLIENTE },
  ]
  const traceFields: readonly ReportField[] = [
    { label: 'Fecha de entrada', value: row['FECHA ENTRADA'], kind: 'date' },
    { label: 'Fecha de salida', value: row['FECHA SALIDA'], kind: 'date' },
    { label: 'Revisado por', value: row['REVISADO POR'] },
    { label: 'Estatus', value: row.ESTATUS },
    { label: 'Semáforo', value: row.SEMAFORO },
    { label: 'Días en laboratorio', value: row['DIAS LABORATORIO'], kind: 'number' },
  ]

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(buildLaboratoryPdfFilename(row).replace(/\.pdf$/i, ''))}</title>
  <style>
    :root{color-scheme:light;--ink:#181818;--muted:#716864;--line:#e7ded9;--paper:#fff;--soft:#fff4ef;--brand:#ee7d61;--brand-dark:#bd4638;--green:#13795b;--amber:#a86000;--red:#b42318;--blue:#175cd3}
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:#fff;color:var(--ink);font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{counter-reset:page}
    .document{max-width:190mm;margin:0 auto;background:var(--paper)}
    .header{display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:4px solid var(--brand);padding:0 0 14px}
    .brand{display:flex;align-items:center;gap:13px;min-width:0}
    .logo{width:58px;height:58px;border-radius:14px;object-fit:cover;background:#181818}
    .brand-name{margin:0;font-size:18pt;font-weight:900;letter-spacing:.13em}
    .brand-sub{margin:1px 0 0;color:var(--muted);font-size:8.5pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
    .document-type{text-align:right}
    .document-type p{margin:0;color:var(--brand-dark);font-size:8pt;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
    .document-type h1{margin:2px 0 0;font-size:19pt;line-height:1.05}
    .hero{display:grid;grid-template-columns:1.55fr .8fr;gap:14px;margin:16px 0}
    .hero-main{border-radius:16px;background:var(--ink);color:#fff;padding:19px 21px}
    .hero-main .eyebrow{color:#ff9d84}
    .hero-main h2{margin:5px 0 8px;font-size:23pt;line-height:1.08}
    .hero-main p{margin:0;color:#ddd2cd}
    .status-box{display:flex;flex-direction:column;justify-content:center;border:1px solid var(--line);border-radius:16px;background:var(--soft);padding:16px}
    .eyebrow{margin:0;color:var(--brand-dark);font-size:7.5pt;font-weight:900;letter-spacing:.18em;text-transform:uppercase}
    .status{margin:7px 0 2px;font-size:13pt;font-weight:900}
    .semaphore{margin:0;color:var(--muted);font-weight:700}
    .section{margin-top:16px;break-inside:avoid-page}
    .section-title{display:flex;align-items:center;gap:9px;margin:0 0 8px;font-size:12.5pt;font-weight:900}
    .section-title::before{content:"";display:block;width:6px;height:22px;border-radius:99px;background:var(--brand)}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);overflow:hidden;border:1px solid var(--line);border-radius:13px}
    .field{min-height:62px;padding:11px 13px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
    .field:nth-child(3n){border-right:0}
    .field:nth-last-child(-n+3){border-bottom:0}
    .field-label{margin:0 0 5px;color:var(--muted);font-size:7.4pt;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
    .field-value{margin:0;font-weight:700;overflow-wrap:anywhere;white-space:pre-wrap}
    .diagnosis{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .diagnosis-card{min-height:106px;border:1px solid var(--line);border-radius:13px;padding:13px;break-inside:avoid}
    .diagnosis-card p:last-child{margin:6px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
    .checks{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:0;padding:0;list-style:none}
    .check{display:flex;align-items:flex-start;gap:8px;border:1px solid var(--line);border-radius:10px;padding:9px 11px;font-weight:700;break-inside:avoid}
    .check-mark{display:grid;width:18px;height:18px;flex:0 0 18px;place-items:center;border-radius:5px;background:#e8f7f1;color:var(--green);font-size:9pt;font-weight:900}
    .empty{border:1px dashed var(--line);border-radius:12px;color:var(--muted);padding:15px;text-align:center}
    .evidence{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .evidence-card{overflow:hidden;border:1px solid var(--line);border-radius:14px;break-inside:avoid-page;background:#fff}
    .evidence-head{display:flex;justify-content:space-between;gap:8px;background:var(--ink);color:#fff;padding:9px 12px;font-size:8pt;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
    .evidence-image{display:flex;min-height:86mm;align-items:center;justify-content:center;background:#f7f4f2;padding:7px}
    .evidence-image img{display:block;max-width:100%;max-height:105mm;object-fit:contain}
    .missing-image{color:var(--muted);font-size:9pt;font-weight:700;text-align:center}
    .evidence-notes{min-height:50px;padding:11px 12px}
    .evidence-notes p{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
    .control{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:17px;border-top:2px solid var(--ink);padding-top:12px}
    .control-item{font-size:8.5pt}
    .control-item strong{display:block;margin-bottom:2px;font-size:7pt;letter-spacing:.09em;text-transform:uppercase;color:var(--muted)}
    .signatures{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:28px;break-inside:avoid}
    .signature{border-top:1px solid #777;padding-top:6px;text-align:center;color:var(--muted);font-size:8pt;font-weight:700}
    .footer{margin-top:18px;border-top:1px solid var(--line);padding-top:8px;color:var(--muted);font-size:7.5pt;text-align:center}
    .page-break{break-before:page;page-break-before:always}
    @media print{
      @page{size:A4 portrait;margin:10mm 11mm 12mm}
      .document{max-width:none}
      .evidence{display:block}
      .evidence-card{margin-bottom:12px}
      .evidence-image{min-height:80mm}
    }
  </style>
</head>
<body>
  <main class="document">
    <header class="header">
      <div class="brand">
        ${logoData ? `<img class="logo" src="${escapeAttribute(logoData)}" alt="Logotipo TRAIOT">` : '<div class="logo"></div>'}
        <div><p class="brand-name">TRAIOT</p><p class="brand-sub">Manager · Centro de operación</p></div>
      </div>
      <div class="document-type"><p>Reporte técnico</p><h1>Diagnóstico de laboratorio</h1></div>
    </header>

    <section class="hero">
      <div class="hero-main"><p class="eyebrow">Expediente técnico</p><h2>${escapeHtml(folio)}</h2><p>${escapeHtml([cleanText(row.MARCA), cleanText(row.MODELO)].filter(Boolean).join(' · ') || 'Equipo sin marca o modelo especificado')}</p></div>
      <div class="status-box"><p class="eyebrow">Estado actual</p><p class="status">${escapeHtml(status)}</p><p class="semaphore">${escapeHtml(semaphore)}</p></div>
    </section>

    ${renderSection('Identificación del equipo', equipmentFields)}
    ${renderSection('Recepción y trazabilidad', traceFields)}

    <section class="section">
      <h2 class="section-title">Diagnóstico técnico</h2>
      <div class="diagnosis">
        ${renderTextCard('Problema detectado', row['PROBLEMA DETECTADO'])}
        ${renderTextCard('Notas de revisión', row['NOTAS DE REVISION'])}
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Pruebas realizadas</h2>
      ${tests.length ? `<ul class="checks">${tests.map((test) => `<li class="check"><span class="check-mark">✓</span><span>${escapeHtml(test)}</span></li>`).join('')}</ul>` : '<p class="empty">No se registraron pruebas realizadas.</p>'}
    </section>

    <section class="section page-break">
      <h2 class="section-title">Evidencia fotográfica</h2>
      ${evidence.length ? `<div class="evidence">${evidence.map(renderEvidence).join('')}</div>` : '<p class="empty">Este expediente no contiene evidencia fotográfica.</p>'}
    </section>

    <section class="control">
      <div class="control-item"><strong>Generado por</strong>${escapeHtml(generatedBy?.name || generatedBy?.email || 'Usuario TRAIOT')}</div>
      <div class="control-item"><strong>Rol</strong>${escapeHtml(generatedBy?.role || '—')}</div>
      <div class="control-item"><strong>Fecha de emisión</strong>${escapeHtml(formatDateTime(generatedAt))}</div>
    </section>
    <section class="signatures"><div class="signature">Responsable del diagnóstico</div><div class="signature">Recepción / conformidad</div></section>
    <footer class="footer">Documento generado por TRAIOT Manager · Folio ${escapeHtml(folio)} · La información corresponde al expediente registrado al momento de emitir el reporte.</footer>
  </main>
</body>
</html>`
}

function renderSection(title: string, fields: readonly ReportField[]): string {
  return `<section class="section"><h2 class="section-title">${escapeHtml(title)}</h2><div class="grid">${fields.map(renderField).join('')}</div></section>`
}

function renderField(field: ReportField): string {
  const raw = cleanText(field.value)
  const value = field.kind === 'date' ? formatDate(raw) : field.kind === 'number' && raw ? formatNumber(raw) : raw
  return `<div class="field"><p class="field-label">${escapeHtml(field.label)}</p><p class="field-value">${escapeHtml(value || '—')}</p></div>`
}

function renderTextCard(label: string, value: unknown): string {
  return `<article class="diagnosis-card"><p class="field-label">${escapeHtml(label)}</p><p>${escapeHtml(cleanText(value) || 'Sin información registrada.')}</p></article>`
}

function renderEvidence(item: { readonly number: number; readonly image: string | undefined; readonly sourceValue: string; readonly notes: string }): string {
  const image = item.image
    ? `<img src="${escapeAttribute(item.image)}" alt="Evidencia ${String(item.number)}">`
    : `<p class="missing-image">${item.sourceValue ? 'La evidencia está registrada, pero no fue posible cargar el archivo.' : 'Sin archivo de imagen.'}</p>`
  return `<article class="evidence-card"><header class="evidence-head"><span>Evidencia ${String(item.number)}</span><span>FOTOGRAFÍA</span></header><div class="evidence-image">${image}</div><div class="evidence-notes"><p class="field-label">Observaciones</p><p>${escapeHtml(item.notes || 'Sin observaciones registradas.')}</p></div></article>`
}

function normalizeList(value: unknown): readonly string[] {
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean)
  const text = cleanText(value)
  if (!text) return []
  return text.split(/\s*(?:,|\n|;|\|)\s*/).filter(Boolean)
}

function normalizeLaboratoryTests(value: unknown): readonly string[] {
  const fragments = normalizeList(value)
  if (fragments.length === 0) return []
  const serialized = normalizeComparable(fragments.join(', '))
  const catalogMatches = laboratoryTests
    .map((option) => ({ option, position: serialized.indexOf(normalizeComparable(option)) }))
    .filter((match) => match.position >= 0)
    .sort((left, right) => left.position - right.position)
    .map((match) => match.option)
  return catalogMatches.length > 0 ? catalogMatches : fragments
}

function normalizeComparable(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase()
}

function cleanText(value: unknown): string {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') return ''
  const text = typeof value === 'string' ? value.trim() : value.toString()
  return /^#(?:ERROR|REF|VALUE|NAME|N\/A|DIV\/0)/i.test(text) ? '' : text
}

function formatDate(value: string): string {
  if (!value) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return value
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City',
  }).format(new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00-06:00`))
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
    hour12: true, timeZone: 'America/Mexico_City',
  }).format(value)
}

function formatNumber(value: string): string {
  const number = Number(value)
  return Number.isFinite(number) ? new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(number) : value
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character)
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/\r|\n/g, '')
}

function sanitizeFilenamePart(value: string): string {
  return [...value]
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
}
