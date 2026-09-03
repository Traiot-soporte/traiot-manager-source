import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const base = process.env.VITE_BASE_PATH || '/'
  const isAppsScriptBuild = mode === 'apps-script'

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        disable: isAppsScriptBuild,
        injectRegister: null,
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          id: base,
          name: 'TRAIOT Manager',
          short_name: 'TRAIOT',
          description: 'Centro de operación para inventario, CRM, ingeniería y soporte.',
          lang: 'es-MX',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'any',
          background_color: '#191919',
          theme_color: '#191919',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            {
              name: 'Resumen',
              short_name: 'Resumen',
              description: 'Abrir el resumen de operación',
              url: `${base}#/`,
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'Almacén',
              short_name: 'Almacén',
              description: 'Consultar productos y existencias',
              url: `${base}#/tablas/ALMACEN`,
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'Seguimiento de clientes',
              short_name: 'CRM',
              description: 'Abrir el directorio comercial',
              url: `${base}#/tablas/Gestion%20Clientes`,
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'Comunicaciones',
              short_name: 'Comunicaciones',
              description: 'Revisar comunicaciones pendientes',
              url: `${base}#/comunicaciones`,
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          globPatterns: ['**/*.{html,js,css,svg,png,jpg,jpeg,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          navigateFallback: 'index.html',
          runtimeCaching: [],
          skipWaiting: false,
        },
      }),
    ],
    build: {
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
