import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router'

import { useRepository } from '@/data/use-repository'
import { ChangePasswordScreen } from '@/modules/auth/change-password-screen'
import { AuthLoading } from '@/modules/auth/login-page'

export function ChangePasswordPage() {
  const repository = useRepository()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const sessionAvailable = repository.hasSession()
  const currentUser = useQuery({
    queryKey: ['current-user'],
    queryFn: () => repository.getCurrentUser(),
    enabled: sessionAvailable,
  })

  if (!sessionAvailable) return <Navigate replace to="/login" />
  if (currentUser.isPending) return <AuthLoading />
  if (currentUser.isError || !currentUser.data) return <Navigate replace to="/login" />
  if (!currentUser.data.mustChangePassword) return <Navigate replace to="/" />

  const changePassword = async (input: { currentPassword: string; nextPassword: string }) => {
    const user = await repository.changePassword(input)
    queryClient.setQueryData(['current-user'], user)
    void navigate('/', { replace: true })
  }

  const logout = async () => {
    await repository.logout()
    queryClient.removeQueries()
    void navigate('/login', { replace: true })
  }

  return (
    <ChangePasswordScreen
      email={currentUser.data.email}
      onChangePassword={changePassword}
      onLogout={() => void logout()}
    />
  )
}
