import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AppShell } from '@/modules/layout/app-shell'
import { NotFoundPage } from '@/modules/not-found-page'
import { TableAccessBoundary } from '@/modules/auth/table-access-boundary'

const LoginPage = lazy(() => import('@/modules/auth/login-page').then((module) => ({ default: module.LoginPage })))
const ChangePasswordPage = lazy(() => import('@/modules/auth/change-password-page').then((module) => ({ default: module.ChangePasswordPage })))
const SecurityUsersPage = lazy(() => import('@/modules/auth/security-users-page').then((module) => ({ default: module.SecurityUsersPage })))
const CommunicationCenterPage = lazy(() => import('@/modules/communications/communication-center-page').then((module) => ({ default: module.CommunicationCenterPage })))
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
          <Route element={<TableAccessBoundary />} path="tablas/:tableName">
            <Route index element={<TablePage />} />
            <Route element={<RecordFormPage />} path="nuevo" />
            <Route element={<RecordDetailPage />} path=":rowUuid" />
            <Route element={<RecordFormPage />} path=":rowUuid/editar" />
          </Route>
          <Route element={<SecurityUsersPage />} path="seguridad-usuarios" />
          <Route element={<CommunicationCenterPage />} path="comunicaciones" />
          <Route element={<NotFoundPage />} path="*" />
        </Route>
      </Routes>
    </Suspense>
  )
}
