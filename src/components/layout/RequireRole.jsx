import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import AppLayout from './AppLayout'

/**
 * Pembatas route di sisi frontend (kenyamanan UI saja, BUKAN keamanan).
 * Backend wajib melakukan otorisasi untuk setiap permintaan data.
 */
export default function RequireRole({ role }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-ink-500" role="status">Memeriksa sesi...</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user.role !== role) return <Navigate to={`/${user.role}/dashboard`} replace />
  return <AppLayout />
}
