import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/Badge'
import { ACTIVE_STATUSES } from '@/lib/constants'
import { formatDate } from '@/lib/formatters'

export default function ActiveShipmentList({ shipments, basePath, title = 'Pengiriman aktif', limit = 5 }) {
  const list = shipments.filter((s) => ACTIVE_STATUSES.includes(s.status)).sort((a, b) => new Date(a.eta) - new Date(b.eta)).slice(0, limit)
  return (
    <Card>
      <CardHeader title={title} action={<Link to={`${basePath}/shipments`} className="text-sm font-semibold text-route-700 hover:underline">Lihat semua</Link>} />
      {list.length === 0 ? <EmptyState title="Tidak ada pengiriman aktif" /> : (
        <ul className="divide-y divide-ink-100">
          {list.map((s) => (
            <li key={s.id}>
              <Link to={`${basePath}/shipments/${s.id}`} className="block px-5 py-3 transition-colors hover:bg-route-50">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm font-medium text-ink-900">{s.trackingNumber}</span>
                  <StatusBadge status={s.status} />
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-600">
                  {s.origin.city}<ArrowRight className="size-3.5 text-ink-400" aria-hidden />{s.destination.city}
                  <span className="text-ink-400">· tiba {formatDate(s.eta)}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
