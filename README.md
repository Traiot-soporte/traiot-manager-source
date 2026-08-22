# TRAIOT MANAGER

Migración de la aplicación AppSheet TRAIOT MANAGER a una SPA/PWA offline-first para la operación de rastreo GPS e IoT vehicular.

## Estado

Fase 1 completada:

- frontend estático con Vite, React 19 y TypeScript estricto;
- Tailwind CSS y estructura compatible con shadcn/ui;
- navegación SPA con React Router 7;
- 16 TableDef guiadas por metadata;
- MockRepository en memoria con datos de demostración;
- fórmulas y correcciones críticas cubiertas por Vitest.

No existe un backend local. El MockRepository solo permite desarrollar y revisar la interfaz. El backend real se implementará en Google Apps Script durante la Fase 3 y será el único proceso autorizado para acceder a Google Sheets y Google Drive.

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
~~~

La aplicación de desarrollo queda disponible normalmente en http://localhost:5173.

## Estructura actual

~~~text
src/
├─ components/       Componentes compartidos del shell
├─ data/             Repository, MockRepository y datos demo
├─ lib/              Formato y utilidades
├─ modules/          Resumen, navegación y vista previa de tablas
└─ schema/           Tipos, catálogos, fórmulas y 16 TableDef
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
