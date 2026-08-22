import { Cloud, CloudOff } from 'lucide-react'

import { useRepository } from '@/data/use-repository'

export function SyncStatus() {
  const repository = useRepository()
  const connected = repository.source === 'apps-script'
  const Icon = connected ? Cloud : CloudOff

  return (
    <div
      className={connected
        ? 'flex min-h-11 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-900'
        : 'flex min-h-11 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-900'}
      title={connected ? 'Conexion privada con Google Sheets.' : 'Datos simulados sin conexion al backend.'}
    >
      <Icon aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">{connected ? 'Conectado · Google Sheets' : 'Demostracion · sin backend'}</span>
      <span className="sm:hidden">{connected ? 'Conectado' : 'Demo'}</span>
    </div>
  )
}
