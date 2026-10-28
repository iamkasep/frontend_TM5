import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Package, Activity, Plus, Route, MapPinned, UserCheck } from 'lucide-react'
import DashboardHero from '@/components/layout/DashboardHero'
import QuickActions from '@/components/sections/dashboard/QuickActions'
import StatCard from '@/components/ui/StatCard'
import { AsyncBoundary } from '@/components/ui/States'
import { StatusDonut, TrendChart } from '@/components/sections/dashboard/Charts'
import ActivityCard from '@/components/sections/dashboard/ActivityCard'
import ActiveShipmentList from '@/components/sections/dashboard/ActiveShipmentList'
import { useShipments } from '@/hooks/useShipments'
import { useAuth } from '@/hooks/useAuth'
import { summarize } from '@/lib/stats'
import { greeting } from '@/lib/utils'

const SHORTCUTS = [
  { to: '/admin/shipments', label: 'Manajemen pengiriman', hint: 'Kelola semua AWB', icon: Package },
  { to: '/admin/trips', label: 'Manajemen trip', hint: 'Jadwal perjalanan', icon: Route },
  { to: '/admin/tracking', label: 'Tracking pengiriman', hint: 'Pantau di peta', icon: MapPinned },
  { to: '/admin/drivers', label: 'Manajemen driver', hint: 'Data pengemudi', icon: UserCheck },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, loading, error, reload } = useShipments()
  const sum = summarize(data ?? [])
  return (
    <>
      <DashboardHero
        eyebrow="Admin"
        title={`${greeting()}, ${user.name.split(' ')[0]}`}
        description="Pantau pengiriman dan aktivitas operasional hari ini."
        actions={<button type="button" onClick={() => navigate('/admin/shipments/new')} className="inline-flex h-11 items-center gap-2 rounded-xl bg-route-500 px-5 text-sm font-extrabold text-ink-950 shadow-lg shadow-route-500/30 transition hover:-translate-y-0.5 hover:bg-route-400"><Plus className="size-4" /> Buat pengiriman</button>}
      />
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        <div className="space-y-5">
          <QuickActions items={SHORTCUTS} />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total pengiriman" value={sum.total} icon={Package} />
            <StatCard label="Sedang berjalan" value={sum.active} icon={Activity} tone="route" />
            <StatCard label="Selesai" value={sum.delivered} icon={CheckCircle2} tone="green" />
            <StatCard label="Bermasalah" value={sum.issues} icon={AlertTriangle} tone="red" hint={`${sum.pending} menunggu penugasan`} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <StatusDonut summary={sum} />
            <TrendChart shipments={data ?? []} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <ActiveShipmentList shipments={data ?? []} basePath="/admin" />
            <ActivityCard shipments={data ?? []} basePath="/admin" />
          </div>
        </div>
      </AsyncBoundary>
    </>
  )
}
