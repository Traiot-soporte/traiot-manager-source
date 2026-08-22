import { CloudOff } from 'lucide-react'

export function SyncStatus() {
  return (
    <div
      className="flex min-h-11 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-900"
      title="En esta fase los datos son simulados y no existe conexión al backend."
    >
      <CloudOff aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">Demostración · sin backend</span>
      <span className="sm:hidden">Demo</span>
    </div>
  )
}
