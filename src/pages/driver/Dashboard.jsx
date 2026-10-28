import { Link } from 'react-router-dom'
import { Truck } from 'lucide-react'
import DashboardHero from '@/components/layout/DashboardHero'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { AsyncBoundary, EmptyState } from '@/components/ui/States'
import StatCard from '@/components/ui/StatCard'
import GpsStatusCard from '@/components/sections/tracking/GpsStatusCard'
import DriverStatusActions from '@/components/sections/shipments/DriverStatusActions'
import ActiveShipmentList from '@/components/sections/dashboard/ActiveShipmentList'
import { useAuth } from '@/hooks/useAuth'
import { useShipments } from '@/hooks/useShipments'
import { ACTIVE_STATUSES } from '@/lib/constants'
import { formatDateTime } from '@/lib/formatters'
import { Package, CheckCircle2 } from 'lucide-react'
import { greeting } from '@/lib/utils'

export default function DriverDashboard() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useShipments()
  const list = data ?? []
  const active = list.filter((s) => ACTIVE_STATUSES.includes(s.status))
  const current = active.find((s) => s.status === 'in_transit') ?? active[0]

  return (
    <>
      <DashboardHero eyebrow="Driver" title={`${greeting()}, ${user.name.split(' ')[0]}`} description="Tugas pengiriman Anda hari ini." />
      <div className="space-y-4">
        <GpsStatusCard />
        <AsyncBoundary loading={loading} error={error} onRetry={reload}>
          {current ? (
            <section className="dash-rise relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 to-ink-800 p-5 text-white shadow-lg shadow-ink-900/20 ring-1 ring-ink-700 sm:p-6">
              <div className="dash-drift pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-route-500/25 blur-3xl" aria-hidden />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-route-400">Tugas saat ini</p>
                  <StatusBadge status={current.status} />
                </div>
                <Link to={`/driver/shipments/${current.id}`} className="mt-1 block font-mono text-xl font-medium text-white hover:underline">{current.trackingNumber}</Link>

                <div className="mt-5 flex items-center gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-ink-300">Asal</p>
                    <p className="truncate text-lg font-extrabold">{current.origin.city}</p>
                  </div>
                  <div className="flex min-w-8 flex-1 items-center gap-1.5" aria-hidden>
                    <span className="size-2.5 rounded-full bg-white" />
                    <span className="h-0 flex-1 border-t-2 border-dashed border-route-400" />
                    <Truck className="size-4 text-route-400" />
                    <span className="h-0 flex-1 border-t-2 border-dashed border-route-400" />
                    <span className="size-2.5 rotate-45 rounded-[3px] bg-teal-400" />
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-xs text-ink-300">Tujuan</p>
                    <p className="truncate text-lg font-extrabold">{current.destination.city}</p>
                  </div>
                </div>

                <p className="mt-1 text-sm text-ink-300">{current.customerName} · tiba {formatDateTime(current.eta)}</p>
                <DriverStatusActions shipment={current} onChanged={reload} className="mt-5" />
              </div>
            </section>
          ) : (
            <Card><EmptyState title="Belum ada tugas aktif" description="Tugas baru akan muncul di sini setelah admin menugaskan pengiriman." /></Card>
          )}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Tugas aktif" value={active.length} icon={Package} tone="route" />
            <StatCard label="Selesai" value={list.filter((s) => s.status === 'delivered').length} icon={CheckCircle2} tone="green" />
          </div>
          {active.length > 1 && <ActiveShipmentList shipments={active.filter((s) => s.id !== current.id)} basePath="/driver" title="Tugas berikutnya" />}
        </AsyncBoundary>
      </div>
    </>
  )
}
