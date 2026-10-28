import { Link } from 'react-router-dom'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/Badge'
import { formatRelative } from '@/lib/formatters'
import { recentEvents } from '@/lib/stats'

/** basePath: awalan route role, mis. "/admin" */
export default function ActivityCard({ shipments, basePath, limit = 6 }) {
  const events = recentEvents(shipments, limit)
  return (
    <Card>
      <CardHeader title="Aktivitas terbaru" />
      {events.length === 0 ? <EmptyState title="Belum ada aktivitas" /> : (
        <ul className="divide-y divide-ink-100">
          {events.map((e) => (
            <li key={`${e.shipmentId}-${e.at}`} className="flex items-start justify-between gap-3 px-5 py-3">
              <span className="mt-2 size-2 shrink-0 rounded-full bg-route-500 ring-4 ring-route-50" aria-hidden />
              <div className="min-w-0 flex-1">
                <Link to={`${basePath}/shipments/${e.shipmentId}`} className="font-mono text-sm font-medium text-route-700 hover:underline">{e.trackingNumber}</Link>
                <p className="truncate text-sm text-ink-600">{e.note}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <StatusBadge status={e.status} />
                <span className="text-xs text-ink-400">{formatRelative(e.at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
