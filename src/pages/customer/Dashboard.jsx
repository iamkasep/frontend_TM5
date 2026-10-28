import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Package, Activity } from 'lucide-react'
import DashboardHero from '@/components/layout/DashboardHero'
import StatCard from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { AsyncBoundary, EmptyState } from '@/components/ui/States'
import TrackForm from '@/components/sections/tracking/TrackForm'
import ActivityCard from '@/components/sections/dashboard/ActivityCard'
import { useAuth } from '@/hooks/useAuth'
import { useShipments } from '@/hooks/useShipments'
import { summarize } from '@/lib/stats'
import { ACTIVE_STATUSES } from '@/lib/constants'
import { getProgress } from '@/lib/geo'
import { formatDate } from '@/lib/formatters'
import { greeting } from '@/lib/utils'

export default function CustomerDashboard() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useShipments()
  const list = data ?? []
  const sum = summarize(list)
  const active = list.filter((s) => ACTIVE_STATUSES.includes(s.status))

  return (
    <>
      <DashboardHero eyebrow="Customer" title={`${greeting()}, ${user.name.split(' ')[0]}`} description={`Pengiriman ${user.company ?? 'perusahaan Anda'}.`}>
        <div className="rounded-2xl bg-white p-4 text-ink-900 shadow-lg shadow-black/20">
          <h2 className="mb-2 text-sm font-bold">Lacak dengan nomor resi</h2>
          <TrackForm basePath="/customer" />
        </div>
      </DashboardHero>
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        <div className="space-y-5">

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <StatCard label="Sedang berjalan" value={sum.active} icon={Activity} tone="route" />
            <StatCard label="Terkirim" value={sum.delivered} icon={CheckCircle2} tone="green" />
            <StatCard label="Total" value={sum.total} icon={Package} />
          </div>

          <div>
            <h2 className="mb-3 text-base font-bold text-ink-900">Pengiriman berjalan</h2>
            {active.length === 0 ? <Card><EmptyState title="Tidak ada pengiriman berjalan" /></Card> : (
              <div className="grid gap-4 md:grid-cols-2">
                {active.slice(0, 4).map((s) => (
                  <Link key={s.id} to={`/customer/shipments/${s.id}`} className="dash-rise block rounded-2xl bg-white p-4 shadow-sm shadow-ink-900/5 ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-route-400">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-sm font-medium text-ink-900">{s.trackingNumber}</span>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-base font-bold text-ink-900">{s.origin.city}<ArrowRight className="size-4 text-ink-400" aria-hidden />{s.destination.city}</p>
                    <div className="relative mt-4 h-2 rounded-full bg-ink-100" aria-hidden>
                      <div className="h-full rounded-full bg-gradient-to-r from-route-500 to-route-400" style={{ width: `${Math.round(getProgress(s) * 100)}%` }} />
                      <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-route-500 shadow" style={{ left: `${Math.min(97, Math.max(3, Math.round(getProgress(s) * 100)))}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-ink-500">Tiba {formatDate(s.eta)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <ActivityCard shipments={list} basePath="/customer" />
        </div>
      </AsyncBoundary>
    </>
  )
}
