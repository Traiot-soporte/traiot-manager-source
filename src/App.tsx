import { Route, Routes } from 'react-router'

import { DashboardPage } from '@/modules/dashboard/dashboard-page'
import { AppShell } from '@/modules/layout/app-shell'
import { NotFoundPage } from '@/modules/not-found-page'
import { TablePreviewPage } from '@/modules/tables/table-preview-page'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route element={<TablePreviewPage />} path="tablas/:tableName" />
        <Route element={<NotFoundPage />} path="*" />
      </Route>
    </Routes>
  )
}
