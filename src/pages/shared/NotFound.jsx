import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function NotFound() {
  const { user } = useAuth()
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="font-mono text-5xl font-medium text-route-600">404</p>
        <h1 className="mt-3 text-2xl font-extrabold text-ink-900">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-ink-500">Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
        <Link to={user ? `/${user.role}/dashboard` : '/login'} className="mt-6 inline-flex h-10 items-center rounded-lg bg-route-600 px-4 text-sm font-semibold text-white hover:bg-route-700">
          {user ? 'Kembali ke dashboard' : 'Ke halaman masuk'}
        </Link>
      </div>
    </div>
  )
}
