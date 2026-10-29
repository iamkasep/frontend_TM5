import { AlertTriangle, CheckCircle2, Package, Truck, UserCheck, Activity, MapPinned, ClipboardList, Settings } from 'lucide-react'
import DashboardHero from '@/components/layout/DashboardHero'
import QuickActions from '@/components/sections/dashboard/QuickActions'
import StatCard from '@/components/ui/StatCard'
import { AsyncBoundary } from '@/components/ui/States'
import { Card, CardHeader } from '@/components/ui/Card'
import { StatusDonut, TrendChart } from '@/components/sections/dashboard/Charts'
import ActivityCard from '@/components/sections/dashboard/ActivityCard'
import TrackingMap from '@/components/sections/tracking/TrackingMap'
import { useAsync } from '@/hooks/useAsync'
import { useAuth, useScope } from '@/hooks/useAuth'
import { shipmentService } from '@/services/shipmentService'
import { driverService } from '@/services/driverService'
import { vehicleService } from '@/services/vehicleService'
import { trackingService } from '@/services/trackingService'
import { summarize } from '@/lib/stats'
import { greeting } from '@/lib/utils'

const SHORTCUTS = [
  { to: '/superadmin/shipments', label: 'Semua pengiriman', hint: 'Daftar dan detail', icon: Package },
  { to: '/superadmin/tracking', label: 'Monitoring tracking', hint: 'Pantau di peta', icon: MapPinned },
  { to: '/superadmin/reports', label: 'Laporan', hint: 'Rekap dan unduh', icon: ClipboardList },
  { to: '/superadmin/settings', label: 'Pengaturan', hint: 'Konfigurasi sistem', icon: Settings },
]

export default function SuperadminDashboard() {
  const { user } = useAuth()
  const scope = useScope()
  const { data, loading, error, reload } = useAsync(async () => {
    const [shipments, drivers, vehicles, live] = await Promise.all([
      shipmentService.list(scope), driverService.list(), vehicleService.list(), trackingService.listLive(scope),
    ])
    return { shipments, drivers, vehicles, live }
  }, [scope.role])

  return (
    <>
      <DashboardHero eyebrow="Superadmin" title={`${greeting()}, ${user.name.split(' ')[0]}`} description="Ringkasan operasional seluruh sistem." />
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {data && (() => {
          const sum = summarize(data.shipments)
          const markers = data.live.map(({ shipment: s, position }) => ({ id: s.id, kind: 'vehicle', position, label: `${s.trackingNumber} — ${s.customerName}` }))
          return (
            <div className="space-y-5">
              <QuickActions items={SHORTCUTS} />
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
                <StatCard label="Total pengiriman" value={sum.total} icon={Package} />
                <StatCard label="Sedang berjalan" value={sum.active} icon={Activity} tone="route" />
                <StatCard label="Terkirim" value={sum.delivered} icon={CheckCircle2} tone="green" />
                <StatCard label="Bermasalah" value={sum.issues} icon={AlertTriangle} tone="red" hint="Terlambat + dibatalkan" />
                <StatCard label="Driver aktif" value={data.drivers.filter((d) => ['active', 'on_duty', 'available'].includes(String(d.status).toLowerCase())).length} icon={UserCheck} tone="amber" />
                <StatCard label="Kendaraan aktif" value={data.vehicles.filter((v) => ['active', 'available'].includes(String(v.status).toLowerCase())).length} icon={Truck} />
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <StatusDonut summary={sum} />
                <TrendChart shipments={data.shipments} />
              </div>
              <Card>
                <CardHeader title="Peta monitoring" subtitle={`${markers.length} pengiriman aktif dalam pemantauan`} />
                <div className="p-3"><TrackingMap markers={markers} height={380} fitKey={markers.length} /></div>
              </Card>
              <ActivityCard shipments={data.shipments} basePath="/superadmin" />
            </div>
          )
        })()}
      </AsyncBoundary>
    </>
  )
}
