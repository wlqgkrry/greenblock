import { Navigate } from 'react-router-dom'
import { useAppState } from '../context/useAppState'

export function RootRedirect() {
  const { currentUser } = useAppState()
  return <Navigate to={currentUser ? '/home' : '/login'} replace />
}
