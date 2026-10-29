import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { AsyncBoundary, EmptyState } from '@/components/ui/States'
import TrackingMap from '@/components/sections/tracking/TrackingMap'
import { useAsync } from '@/hooks/useAsync'
import { useAuth, useScope } from '@/hooks/useAuth'
import { trackingService } from '@/services/trackingService'
import { formatRelative } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export default function TrackingMonitorPage() {
  const { user } = useAuth()
  const scope = useScope()
  const { data, loading, error, reload } = useAsync(() => trackingService.listLive(scope), [scope.role])
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (data ?? []).filter(({ shipment: s }) => !term || [s.trackingNumber, s.customerName, s.driverName].some((v) => String(v ?? '').toLowerCase().includes(term)))
  }, [data, q])

  const selected = list.find((l) => l.shipment.id === selectedId)?.shipment

  const markers = useMemo(() => {
    const m = list.map(({ shipment: s, position }) => ({
      id: s.id, kind: 'vehicle', position, selected: s.id === selectedId,
      label: `${s.trackingNumber} — ${s.customerName}`,
    }))
    if (selected) {
      m.push({ id: 'o', kind: 'origin', position: [selected.origin.lat, selected.origin.lng], label: `Asal: ${selected.origin.city}` })
      m.push({ id: 'd', kind: 'destination', position: [selected.destination.lat, selected.destination.lng], label: `Tujuan: ${selected.destination.city}` })
    }
    return m
  }, [list, selected, selectedId])

  return (
    <>
      <PageHeader title="Monitoring Tracking" description="Posisi pengiriman yang sedang berjalan. Pilih pengiriman untuk melihat rutenya." />
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div>
            <TrackingMap
              markers={markers}
              height={520}
              fitKey={selectedId ?? 'all'}
              onSelect={(m) => m.kind === 'vehicle' && setSelectedId(m.id)}
            />
            <p className="mt-2 text-xs text-ink-500">Posisi kendaraan menampilkan koordinat pelacakan terakhir dari GPS, SMS, atau progres perjalanan.</p>
          </div>

          <Card className="flex max-h-[520px] flex-col">
            <div className="relative border-b border-ink-100 p-3">
              <Search className="pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari resi, customer, driver" aria-label="Cari pengiriman aktif"
                className="h-10 w-full rounded-lg bg-ink-50 pl-9 pr-3 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-route-600 focus:outline-none" />
            </div>
            {list.length === 0 ? <EmptyState title="Tidak ada pengiriman aktif" description="Ubah kata kunci atau tunggu pengiriman berjalan." /> : (
              <ul className="flex-1 divide-y divide-ink-100 overflow-y-auto">
                {list.map(({ shipment: s, updatedAt }) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
                      className={cn('block w-full px-4 py-3 text-left hover:bg-ink-50', s.id === selectedId && 'bg-route-50')}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-medium text-ink-900">{s.trackingNumber}</span>
                        <StatusBadge status={s.status} />
                      </span>
                      <span className="mt-1 block text-sm text-ink-600">{s.origin.city} - {s.destination.city} · {s.driverName}</span>
                      <span className="block text-xs text-ink-400">Diperbarui {formatRelative(updatedAt)}</span>
                    </button>
                    {s.id === selectedId && (
                      <Link to={`/${user.role}/shipments/${s.id}`} className="block bg-route-50 px-4 pb-3 text-sm font-semibold text-route-700 hover:underline">Buka detail pengiriman</Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </AsyncBoundary>
    </>
  )
}
