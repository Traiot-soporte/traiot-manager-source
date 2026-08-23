import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AppShell } from '@/modules/layout/app-shell'
import { NotFoundPage } from '@/modules/not-found-page'

const LoginPage = lazy(() => import('@/modules/auth/login-page').then((module) => ({ default: module.LoginPage })))
const ChangePasswordPage = lazy(() => import('@/modules/auth/change-password-page').then((module) => ({ default: module.ChangePasswordPage })))
const DashboardPage = lazy(() => import('@/modules/dashboard/dashboard-page').then((module) => ({ default: module.DashboardPage })))
const TablePage = lazy(() => import('@/modules/tables/table-page').then((module) => ({ default: module.TablePage })))
const RecordDetailPage = lazy(() => import('@/modules/tables/record-detail-page').then((module) => ({ default: module.RecordDetailPage })))
const RecordFormPage = lazy(() => import('@/modules/tables/record-form-page').then((module) => ({ default: module.RecordFormPage })))

export function App() {
  return (
    <Suspense fallback={<div className="rounded-3xl bg-white p-8 text-sm font-bold text-ink-800/55">Cargando módulo…</div>}>
      <Routes>
        <Route element={<LoginPage />} path="login" />
        <Route element={<ChangePasswordPage />} path="cambiar-contrasena" />
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route element={<TablePage />} path="tablas/:tableName" />
          <Route element={<RecordFormPage />} path="tablas/:tableName/nuevo" />
          <Route element={<RecordDetailPage />} path="tablas/:tableName/:rowUuid" />
          <Route element={<RecordFormPage />} path="tablas/:tableName/:rowUuid/editar" />
          <Route element={<NotFoundPage />} path="*" />
        </Route>
      </Routes>
    </Suspense>
  )
}
