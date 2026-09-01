import { StrictMode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'

import { App } from '@/App'
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
const externalBridgeUrl = import.meta.env.VITE_APPS_SCRIPT_BRIDGE_URL?.trim()
const repository = isAppsScriptRuntime()
  ? appsScriptRepository
  : externalBridgeUrl
    ? new AppsScriptRepository(createExternalAppsScriptCaller(externalBridgeUrl))
    : mockRepository

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider repository={repository}>
        <HashRouter>
          <App />
        </HashRouter>
      </RepositoryProvider>
    </QueryClientProvider>
  </StrictMode>,
)
