# Publicación de TRAIOT Manager

## Objetivo

Este documento separa dos operaciones que no deben confundirse:

1. **GitHub** conserva el código fuente, el historial y ejecuta validaciones automáticas.
2. **El hosting de producción** entrega la interfaz web a los usuarios y se comunica con un backend seguro.

Subir el código a GitHub no sustituye por sí mismo el Web App de Google Apps Script.

## Arquitectura actual

La interfaz productiva se sirve desde Google Apps Script y llama al backend mediante
`google.script.run`. Esa API solamente existe dentro de páginas de HTML Service.

~~~text
Navegador
  -> Web App de Apps Script
      -> google.script.run
          -> Apps Script
              -> Google Sheets / Drive
~~~

Si el frontend actual se abre directamente desde GitHub Pages o un hosting convencional,
no encuentra `google.script.run` y selecciona el repositorio de demostración. Por eso no
debe publicarse como producción externa hasta incorporar el cliente HTTP y el gateway.

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

## Trabajo requerido antes de Hostinger o GitHub Pages

Antes de publicar la aplicación fuera de Apps Script se debe implementar:

1. un cliente HTTP de producción que reemplace `google.script.run` fuera de Apps Script;
2. un endpoint HTTPS que enrute todas las operaciones actuales hacia `apiRequest`;
3. CORS limitado al dominio real de la aplicación;
4. autenticación y permisos comprobados por el backend en cada solicitud;
5. rate limiting para inicio de sesión y operaciones sensibles;
6. secretos guardados exclusivamente en el servidor, nunca en variables `VITE_*`;
7. configuración mediante `VITE_API_URL` que contenga solamente la URL pública de la API;
8. pruebas integrales de login, CRUD, archivos, imágenes, PDFs, comunicaciones e inventario.

Arquitectura objetivo:

~~~text
GitHub Pages o Hostinger
  -> API HTTPS / gateway
      -> Apps Script o backend futuro
          -> Google Sheets / Drive
~~~

## Publicación posterior en Hostinger

Cuando el cliente HTTP esté terminado:

1. crear `.env.production` localmente con la URL pública de la API;
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
