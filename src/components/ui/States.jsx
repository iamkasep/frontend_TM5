import { AlertTriangle, Inbox } from 'lucide-react'
import Button from './Button'

export function Loading({ label = 'Memuat data...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-ink-500" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-ink-200 border-t-route-600" aria-hidden />
      {label}
    </div>
  )
}

export function EmptyState({ title = 'Belum ada data', description, action }) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-ink-100 text-ink-400"><Inbox className="size-6" /></span>
      <h3 className="mt-3 text-sm font-bold text-ink-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message = 'Terjadi kesalahan', onRetry }) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center" role="alert">
      <span className="grid size-12 place-items-center rounded-full bg-rose-50 text-rose-500"><AlertTriangle className="size-6" /></span>
      <h3 className="mt-3 text-sm font-bold text-ink-800">Data tidak dapat dimuat</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-500">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Coba lagi</Button>}
    </div>
  )
}

/** Menampilkan state loading/error lalu children saat data siap. */
export function AsyncBoundary({ loading, error, onRetry, children }) {
  if (loading) return <Loading />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  return children
}
