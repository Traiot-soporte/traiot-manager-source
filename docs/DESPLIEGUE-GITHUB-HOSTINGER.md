# Publicación de TRAIOT Manager

## Objetivo

Este documento separa dos operaciones que no deben confundirse:

1. **GitHub** conserva el código fuente, el historial y ejecuta validaciones automáticas.
2. **El hosting de producción** entrega la interfaz web a los usuarios y se comunica con un backend seguro.

Subir el código a GitHub no sustituye por sí mismo el Web App de Google Apps Script.

## Arquitectura actual

La interfaz se publica en GitHub Pages. Un puente HTML de Apps Script, limitado a los
orígenes autorizados, recibe solicitudes mediante `postMessage` e invoca
`google.script.run`. El backend conserva la validación de sesión, rol y permisos.

~~~text
GitHub Pages
  -> puente HTML de Apps Script
      -> google.script.run
          -> apiRequest
              -> Google Sheets / Drive
~~~

## GitHub Pages con datos reales

El workflow `.github/workflows/pages.yml` publica automáticamente una demostración en:

`https://traiot-soporte.github.io/traiot-manager-source/`

La URL utiliza la autenticación y los datos reales del backend. Publicar el contenedor del
puente no concede acceso a los registros: cada operación continúa exigiendo una sesión
válida y los permisos del usuario. La variable de Actions
`TRAIOT_APPS_SCRIPT_BRIDGE_URL` contiene solamente la URL pública del puente.

Para habilitar el primer despliegue, un administrador del repositorio debe abrir
`Settings > Pages` y seleccionar `GitHub Actions` en `Build and deployment > Source`.

## Repositorio fuente en GitHub

Se recomienda crear un repositorio privado llamado `traiot-manager-source`.

No inicializarlo en GitHub con README, licencia ni `.gitignore`, porque el proyecto local
ya contiene historial Git.

Después de crear el repositorio, ejecutar desde la raíz del proyecto:

~~~powershell
git remote add origin https://github.com/USUARIO/traiot-manager-source.git
git push -u origin main
~~~

Los archivos siguientes permanecen solamente en la computadora y nunca deben subirse:

- `.clasp.json` y `.clasprc.json`;
- `.env` y variantes locales;
- `node_modules/`, `dist/` y `coverage/`;
- `BACKUP/`;
- contraseñas, hashes exportados, tokens o propiedades privadas de Apps Script.

## Validación automática

El workflow `.github/workflows/ci.yml` ejecuta en cada cambio de `main`:

1. `npm ci`;
2. `npm test`;
3. `npm run lint`;
4. `npm run build`.

La compilación se usa para validar el código, pero la carpeta `dist/` no se guarda en el
repositorio fuente.

## Controles antes del corte productivo

La demostración pública no sustituye una revisión productiva. Antes del corte se deben
completar pruebas integrales de login, CRUD, imágenes, PDFs, comunicaciones e inventario;
revisar cuotas y bloqueo de intentos; y registrar exclusivamente el dominio definitivo en
`TRAIOT_ALLOWED_FRONTEND_ORIGINS`.

## Publicación posterior en Hostinger

Para publicar el mismo frontend en Hostinger:

1. crear `.env.production` localmente con `VITE_APPS_SCRIPT_BRIDGE_URL`;
2. ejecutar `npm ci` y `npm run build`;
3. subir **el contenido** de `dist/` a `public_html/`;
4. configurar una regla SPA para enviar rutas desconocidas a `index.html` si se cambia de
   `HashRouter` a rutas normales;
5. activar HTTPS y apuntar el dominio o subdominio;
6. registrar el dominio en la lista de orígenes permitidos del gateway;
7. ejecutar la lista de pruebas productivas antes del corte.

## Regla de seguridad

GitHub y el hosting del frontend nunca deben contener credenciales de Google, contraseñas,
claves maestras ni secretos del gateway. La interfaz descargada por el navegador siempre es
inspeccionable; la seguridad real debe estar en el backend.
