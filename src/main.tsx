import { StrictMode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'

import { App } from '@/App'
import { PwaProvider } from '@/components/pwa-provider'
import { isAppsScriptRuntime } from '@/data/apps-script-bridge'
import { AppsScriptRepository, appsScriptRepository } from '@/data/apps-script-repository'
import { createExternalAppsScriptCaller } from '@/data/external-apps-script-bridge'
import { mockRepository } from '@/data/mock-repository'
import { RepositoryProvider } from '@/data/repository-provider'
import '@/styles.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('No se encontró el elemento raíz de la aplicación.')
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Number.POSITIVE_INFINITY,
      retry: false,
    },
  },
})
const productionBridgeUrl = 'https://script.google.com/macros/s/AKfycbyFE42Z8NgTXNAsp9Ngk8S8lMRt43q0hvhFmgZtwwipZq_hfOK29wDeCnSum0V4z42_/exec'
const configuredBridgeUrl = import.meta.env.VITE_APPS_SCRIPT_BRIDGE_URL?.trim()
const externalBridgeUrl = configuredBridgeUrl || (import.meta.env.PROD ? productionBridgeUrl : '')
const repository = isAppsScriptRuntime()
  ? appsScriptRepository
  : externalBridgeUrl
    ? new AppsScriptRepository(createExternalAppsScriptCaller(externalBridgeUrl))
    : import.meta.env.DEV
      ? mockRepository
      : new AppsScriptRepository(() => Promise.reject(
          new Error('El servidor real no está configurado para esta publicación.'),
        ))

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider repository={repository}>
        <PwaProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </PwaProvider>
      </RepositoryProvider>
    </QueryClientProvider>
  </StrictMode>,
)
