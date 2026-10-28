import { ArrowRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/formatters'

export const trackingCell = (s) => <span className="font-mono text-[13px] font-medium text-ink-900">{s.trackingNumber}</span>

export const routeCell = (s) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
    {s.origin.city}<ArrowRight className="size-3.5 text-ink-400" aria-hidden />{s.destination.city}
  </span>
)

/** Kolom standar tabel pengiriman. Pilih kolom lewat opsi. */
export function shipmentColumns({ showCustomer = true, showDriver = true } = {}) {
  return [
    { key: 'trackingNumber', header: 'No. resi', sortable: true, render: trackingCell },
    ...(showCustomer ? [{ key: 'customerName', header: 'Customer', sortable: true }] : []),
    { key: 'route', header: 'Rute', sortValue: (s) => `${s.origin.city}${s.destination.city}`, sortable: true, render: routeCell },
    ...(showDriver ? [{ key: 'driverName', header: 'Driver', sortable: true, render: (s) => s.driverName ?? <span className="text-ink-400">Belum ditugaskan</span> }] : []),
    { key: 'status', header: 'Status', sortable: true, render: (s) => <StatusBadge status={s.status} /> },
    { key: 'eta', header: 'Estimasi tiba', sortable: true, render: (s) => formatDate(s.eta) },
  ]
}
