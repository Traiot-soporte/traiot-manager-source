# TRAIOT MANAGER

Migración de la aplicación AppSheet TRAIOT MANAGER a una SPA/PWA offline-first para la operación de rastreo GPS e IoT vehicular.

## Estado

Fase 2 completada y Fase 3 iniciada:

- frontend estático con Vite, React 19 y TypeScript estricto;
- Tailwind CSS y estructura compatible con shadcn/ui;
- navegación SPA con React Router 7;
- 16 TableDef guiadas por metadata;
- MockRepository en memoria con datos de demostración;
- fórmulas y correcciones críticas cubiertas por Vitest;
- ocho renderizadores genéricos: tabla, lista, tarjetas, detalle, formulario, calendario, gráfica y panel;
- campos genéricos para todos los ColumnType, incluidas referencias, imágenes y firma;
- alta, consulta, edición y borrado navegables en las 16 tablas;
- formularios agrupados por sección y validados con Zod desde la metadata.
- navegación contraíble, tema claro/oscuro persistente y flujo demostrativo de sesión.
- proyecto independiente `TRAIOT Manager Backend` creado en Google Apps Script;
- conexión privada de solo lectura preparada para inventariar Google Sheets en Drive.

No existe un backend local. El MockRepository solo permite desarrollar y revisar la interfaz en `localhost`. La ruta principal del Web App de Google Apps Script entrega la interfaz conectada, que consulta y modifica los registros reales mediante `google.script.run`, con validacion y borrado logico en el servidor.

## Requisitos

- Node.js 20.19 o superior.
- npm 10 o superior.

## Comandos

~~~bash
npm install
npm run dev
npm run build
npm run lint
npm test
npm run gas:status
npm run gas:push
npm run gas:open
~~~

La aplicación de desarrollo queda disponible normalmente en http://localhost:5173.

En Windows también puedes abrir `ABRIR-TRAIOT.cmd` con doble clic. El archivo inicia Vite,
abre http://127.0.0.1:5173 en el navegador y mantiene la consola visible para poder detenerlo
con Ctrl+C. No abras `index.html` directamente: el navegador no puede transformar por sí solo
los módulos TypeScript de Vite. Este servidor entrega únicamente el frontend y no reemplaza el
backend previsto en Google Apps Script.

## Backend de Google Apps Script

El código fuente está en `apps-script/` y se sincroniza con el proyecto remoto
mediante la herramienta oficial `clasp`. El despliegue inicial está restringido a
la cuenta propietaria y solo solicita lectura de Drive y Google Sheets. No habilita
altas, ediciones ni borrados.

Los archivos locales `.clasprc.json` y `.clasp.json` no se versionan porque contienen
la autorización y la vinculación con el proyecto remoto. Nunca deben compartirse ni
subirse al repositorio.

## Estructura actual

~~~text
src/
├─ components/       Componentes compartidos del shell
├─ data/             Repository, MockRepository y datos demo
├─ lib/              Formato y utilidades
├─ fields/           Componentes genéricos por tipo de campo
├─ modules/          Resumen, navegación y rutas CRUD
├─ schema/           Tipos, catálogos, fórmulas y 16 TableDef
└─ views/            Ocho renderizadores genéricos
~~~

## Modelo de esta fase

Se excluyó _Per User Settings porque es una tabla interna de AppSheet. Se conservaron las 13 tablas funcionales y se agregaron las tres hojas normalizadas de instalaciones:

- instalacion_fotos;
- instalacion_tanques;
- instalacion_checklist.

Las pruebas verifican las 313 columnas originales de negocio, excluyendo _RowNumber, además de las columnas técnicas de sincronización y migración.

## Documentación

- docs/appsheet-schema.md: fuente de verdad extraída de AppSheet.
- docs/ARQUITECTURA.md: arquitectura, API, sincronización y decisiones.
- docs/DIFERENCIAS-CON-APPSHEET.md: correcciones y cambios deliberados.
- docs/DESPLIEGUE-GITHUB-HOSTINGER.md: publicación segura del código y ruta hacia hosting externo.
