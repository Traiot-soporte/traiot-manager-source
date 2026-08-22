# Prompt para Claude Code

**Cómo usarlo:**
1. Crea una carpeta vacía, ábrela en la terminal y corre `claude`.
2. Copia `02-ESQUEMA-COMPLETO.md` dentro como `docs/appsheet-schema.md`.
3. Pega TODO lo que está debajo de la línea como tu primer mensaje.

---

Voy a migrar una app de AppSheet llamada **TRAIOT MANAGER** a una web app / PWA. Tú vas a construirla.

En `docs/appsheet-schema.md` está el volcado completo del esquema original (14 tablas, 341 columnas, 47 vistas, enums y fórmulas). **Léelo completo antes de escribir una sola línea de código. Es la fuente de verdad.**

## El negocio

Empresa mexicana de rastreo GPS / IoT vehicular. La app es un ERP + CRM ligero con 6 módulos: inventario/almacén, compras, pedidos (ventas), CRM + tickets de soporte, órdenes de servicio en campo (instalaciones de GPS en vehículos) y laboratorio (RMA de equipos). Todo en español, moneda MXN, IVA 16%.

Usuarios: 5–15 personas. Los técnicos de campo llenan la orden de servicio **desde el celular, frecuentemente sin señal**, con hasta 30 fotos y una firma del cliente.

## Restricciones de arquitectura (no negociables)

1. **Los datos se quedan en Google Sheets.** No migramos a Postgres por ahora.
2. **El backend es un Google Apps Script Web App.** Es el único con permiso de escritura sobre las hojas. Los usuarios finales NO tienen acceso a los Sheets.
3. **El frontend es una SPA estática** desplegable en Cloudflare Pages / Netlify. No hay servidor Node.
4. **Offline-first desde el día uno.** No es un extra de la fase final: la app debe funcionar completa sin red y sincronizar al reconectar.
5. **Todo el acceso a datos va detrás de una interfaz `Repository`.** El día que migremos a Supabase/Postgres, se cambia la implementación y la UI no se entera. Esto es obligatorio.

## Stack

- Vite + React 19 + TypeScript (strict)
- Tailwind CSS + shadcn/ui
- React Router 7
- TanStack Query (con Dexie como persister)
- Dexie (IndexedDB): espejo de datos + outbox de mutaciones + blobs de imágenes
- react-hook-form + Zod
- vite-plugin-pwa (Workbox)
- signature_pad (firma del cliente)
- Recharts (gráficas)
- Google Identity Services (login con ID token)
- Backend: Google Apps Script (`clasp`, TypeScript si es viable)

## La decisión de diseño central: motor guiado por metadata

**No escribas 341 campos a mano.** Replica el modelo mental de AppSheet:

```ts
// src/schema/types.ts
export type ColumnType =
  | 'Text' | 'LongText' | 'Number' | 'Price' | 'Date' | 'DateTime'
  | 'Enum' | 'EnumList' | 'Ref' | 'Image' | 'Signature'
  | 'Email' | 'Phone' | 'Url' | 'Address' | 'Color' | 'Bool'

export interface ColumnDef<T = any> {
  name: string
  label?: string
  type: ColumnType
  key?: boolean
  labelColumn?: boolean
  required?: boolean
  hidden?: boolean
  values?: string[]                       // Enum / EnumList
  ref?: { table: string; keyColumn: string }
  formula?: (row: T, ctx: Ctx) => unknown // columna calculada
  showIf?: (row: T, ctx: Ctx) => boolean
  editableIf?: (row: T, ctx: Ctx) => boolean
  section?: string                        // agrupa el formulario
}

export interface TableDef<T = any> {
  name: string
  sheet: string
  key: string
  label: string
  columns: ColumnDef<T>[]
  childTables?: { table: string; fk: string }[]
}
```

Luego escribe **renderizadores genéricos** que consumen esa metadata:
`<TableView>`, `<DeckView>`, `<CardView>`, `<DetailView>`, `<FormView>`, `<CalendarView>`, `<ChartView>`, `<DashboardView>`.

Un `FormView` recibe un `TableDef` y arma los 94 campos de INSTALACIONES por sí solo, agrupados por `section`, con validación Zod derivada del esquema. Agregar una columna = una línea, no una pantalla.

**Las fórmulas de AppSheet se traducen a funciones TypeScript**, una por una. No construyas un intérprete de expresiones. Son ~30 en total.

## Modelo de datos: cambios obligatorios en las hojas

Cada hoja transaccional gana tres columnas:

| Columna | Para qué |
|---|---|
| `_uuid` | Clave estable e inmutable. **Nunca uses `_RowNumber`**: cambia al ordenar o borrar. |
| `_updatedAt` | ISO 8601. Habilita sync incremental (`?since=`). |
| `_deleted` | Borrado lógico. Sin esto el cliente offline nunca sabe que una fila desapareció. |

Los folios de negocio (`ID PRODUCTO`, `ID PEDIDO`, `FOLIO SERVICIO`…) se conservan como identificador **visible**, pero las relaciones internas viajan por `_uuid`.

Escribe un script de migración en Apps Script (`scripts/migrate-sheets.gs`) que agregue estas columnas y pueble los UUID de las filas existentes.

## Bugs del original que hay que ARREGLAR en la migración

Documenta cada arreglo en `docs/DIFERENCIAS-CON-APPSHEET.md`.

1. **PEDIDOS cobra el envío dos veces.** Original: `SUBTOTAL = precio*equipos + instalacion + ENVIO` y luego `TOTAL = SUBTOTAL + IVA + ENVIO`. Correcto: `TOTAL = SUBTOTAL + IVA`.
2. **El semáforo de Laboratorio nunca cierra los entregados.** La fórmula busca `"✅ ENTREGADO"` pero el enum real dice `"📦 ENTREGADO"`. Corrige el valor y agrega `"✅ FUNCIONAL"` a los estados de cierre.
3. **La clave de Ticket Soporte colisiona** (`fecha + ": " + cliente`). Usa `_uuid` y muestra un folio secuencial `TS-2026-0001`.
4. **La vista Laboratorio valida el permiso `"Almacen"`** en lugar de `"Laboratorio"`.
5. **`UserActive` se compara contra el string `"TRUE"`.** Normaliza a booleano aceptando `TRUE/true/VERDADERO/SI/1`.
6. **`PROVEEDORES.PAIS`** tiene `"México"`, `"MEXICO"` y `"MEXOCO"`. Normaliza a un catálogo limpio.
7. **`ALMACEN.STOCK` se captura a mano.** Conviértelo en calculado: `stock inicial + Σ COMPRAS(RECIBIDA) − Σ PEDIDOS(APROBADO)`, con vista de kardex que muestre el movimiento.
8. **Los 13 checklists de INSTALACIONES son `Enum ["✅OK"]`.** Conviértelos a un tri-estado explícito: `OK / FALLA / NO APLICA`. Lo mismo con las 5 pruebas post-instalación.

## Normalización de INSTALACIONES

La tabla original tiene 94 columnas planas. En el modelo nuevo:

- `INSTALACIONES` — cabecera, dispositivo, vehículo, cierre (firma, quien recibe, INE)
- `instalacion_fotos` — hija: `{_uuid, instalacion_uuid, categoria: 'general'|'fuel'|'checklist'|'ine', orden, driveFileId, nota}`. Sustituye las 26 columnas `IMAGEN N`, `IMAGEN FUEL N`, `IMAGEN CHECK N`.
- `instalacion_tanques` — hija: `{_uuid, instalacion_uuid, orden, marca, serie}`. Sustituye `TANQUE 1/2/3 (MARCA|SERIE)`.
- `instalacion_checklist` — hija: `{_uuid, instalacion_uuid, punto, resultado, observacion}`. Cubre los 13 puntos de recepción y las 5 pruebas post-instalación con sus `OBSERVACIONES N`.

En Google Sheets esto son hojas nuevas. **Escribe también el script de migración de datos existentes** hacia el modelo normalizado.

## Backend: Apps Script

Un solo endpoint, protocolo JSON-RPC ligero.

```
GET  ?action=bootstrap            → esquema + snapshot completo de las tablas que el usuario puede ver
GET  ?action=delta&since=<ISO>    → filas con _updatedAt > since, de TODAS las tablas, en una sola llamada
POST { action:'mutate', mutations:[...] }   → lote de inserts/updates/deletes
POST { action:'upload', ... }               → sube una imagen a Drive, devuelve fileId
```

Requisitos del script:

- **Auth:** el front manda el ID token de Google. El script lo valida contra `https://oauth2.googleapis.com/tokeninfo?id_token=...`, comprueba que `aud` sea nuestro Client ID y que `email_verified` sea true. Luego busca el email en la hoja `Usuarios` con `UserActive` truthy. Cachea el resultado en `CacheService` unos minutos.
- **Permisos:** resuelve `Usuarios.UserRole → Perfiles.VistasPermitidas` **una sola vez** en el bootstrap y devuélvelo al cliente. Pero **valida también en cada mutación del lado servidor** — el permiso del cliente es solo para pintar la UI, no es seguridad.
- **CORS:** Apps Script no responde a preflight `OPTIONS`. El front debe usar `Content-Type: 'text/plain;charset=utf-8'` en los POST para evitarlo, y el script parsea `e.postData.contents` como JSON. Documenta esto en el README, es la causa #1 de que "no funciona y no sé por qué".
- **Concurrencia:** `LockService.getScriptLock()` con timeout en toda escritura.
- **Idempotencia:** cada mutación trae un `mutationId` (UUID). Guarda los IDs procesados en una hoja `_mutations_log` y **ignora los repetidos**. Sin esto, cada pérdida de señal duplica filas.
- **Rendimiento:** lee cada hoja con `getDataRange().getValues()` UNA vez por request. Nunca `getRange()` dentro de un bucle. Escribe con `setValues()` en bloque.
- **Reglas de negocio en el servidor:** totales, folios consecutivos y stock se calculan aquí, no en el cliente. El cliente los calcula solo para vista optimista.
- **Despliegue:** "Ejecutar como: Yo" + "Quién tiene acceso: Cualquier persona". La seguridad está en el token, no en el acceso al endpoint.

Deja el código en `backend/` gestionado con `clasp`, y un `backend/README.md` con los pasos exactos de despliegue.

## Offline: cómo debe comportarse

1. **La UI lee siempre de Dexie, nunca de la red.** Cero spinners esperando a Google.
2. Cada escritura entra al **outbox** con `mutationId`, se aplica optimistamente al espejo local y la fila se marca como pendiente (con indicador visual).
3. Al recuperar red: se hace push del lote y luego pull de deltas.
4. **Imágenes:** el Blob va a IndexedDB y se muestra con `URL.createObjectURL()`. Se sube por separado al reconectar, **una por una con reintentos** — no las 30 en el mismo request. Cuando llega el `driveFileId`, reemplaza al blob local.
5. **Conflictos:** last-write-wins **por campo** comparando `_updatedAt`. Los conflictos se registran en un log visible dentro de la app; nunca se resuelven en silencio.
6. Indicador permanente de estado de sync en el header: `En línea · N pendientes · Última sync hace X`.
7. Service worker: precache del app shell; el endpoint de Apps Script es `NetworkOnly` con Background Sync. **Nunca cachear escrituras.**

## Estructura del repo

```
/
├─ docs/
│  ├─ appsheet-schema.md          ← ya está, no lo modifiques
│  ├─ ARQUITECTURA.md             ← lo escribes tú
│  └─ DIFERENCIAS-CON-APPSHEET.md ← lo escribes tú
├─ backend/                       ← Apps Script (clasp)
│  ├─ Code.gs · auth.gs · repo.gs · upload.gs · migrate.gs
│  └─ README.md
└─ src/
   ├─ schema/          # TableDef por tabla + tipos + fórmulas traducidas
   ├─ data/            # Repository (interfaz), impl AppsScript, Dexie, outbox, sync
   ├─ views/           # TableView, DeckView, CardView, DetailView, FormView, CalendarView, ChartView, DashboardView
   ├─ fields/          # un componente por ColumnType (incl. ImageField, SignatureField, EnumListField)
   ├─ modules/         # rutas y pantallas por módulo de negocio
   ├─ auth/            # Google Identity Services + contexto de usuario y permisos
   └─ lib/
```

## Convenciones

- TypeScript strict, sin `any` (salvo genéricos del motor de metadata, justificados con comentario).
- UI 100% en español (México). Formato de moneda MXN, fechas `dd/MMM/yyyy`.
- Los emojis de los enums son parte del dato — **consérvalos tal cual**, incluyendo el doble espacio en `"🎫Canal de  Atención"`.
- Mobile-first. La orden de servicio se llena con una mano, con guantes, bajo el sol.
- Accesibilidad: targets táctiles ≥44px, contraste AA.
- Vitest para la lógica: fórmulas, resolución de conflictos, cálculo de stock, dedupe del outbox.

## Fases — entrégalas de una en una y espera mi visto bueno

**Fase 0.** Lee `docs/appsheet-schema.md`. Escribe `docs/ARQUITECTURA.md` con tu plan: modelo de datos final, contrato exacto de la API, algoritmo de sync y la lista de decisiones abiertas donde necesitas que yo decida. **Pregunta lo que no esté claro. No escribas código todavía.**

**Fase 1.** Scaffold del proyecto (Vite + TS + Tailwind + router), tipos del esquema, y las 14 `TableDef`. Sin backend: usa un `MockRepository` con datos de ejemplo para que se pueda ver algo funcionando.

**Fase 2.** Renderizadores genéricos de vistas + componentes de campo. Con el mock, ya deben poder navegarse y editarse las 14 tablas.

**Fase 3.** Apps Script: auth, bootstrap, delta, mutate, upload, migración de hojas. Prueba con `curl` antes de conectar el front.

**Fase 4.** Dexie + outbox + motor de sync + `AppsScriptRepository`. Sustituye el mock. Aquí es donde se prueba de verdad.

**Fase 5.** INSTALACIONES completa: modelo normalizado, formulario por secciones, captura de fotos con cola offline, firma, y generación de PDF de la orden de servicio.

**Fase 6.** Resto de módulos: Almacén + kardex, Compras, Pedidos, CRM + dashboard, Laboratorio, Matriz Dispositivos, Tickets.

**Fase 7.** PWA completa: manifest, service worker, background sync, instalable, pantalla de conflictos, y pruebas reales en modo avión.

## Cómo quiero que trabajes

- Empieza por la Fase 0 y **para ahí**. Quiero revisar el plan antes de que escribas código.
- Si una decisión mía te parece equivocada, dilo con argumentos en vez de implementarla en silencio.
- No inventes columnas ni valores de enum: si no están en `docs/appsheet-schema.md`, pregúntame.
- Commits pequeños con mensajes en español.
- Cuando termines cada fase, dime en 5 líneas qué hiciste y qué falta.
