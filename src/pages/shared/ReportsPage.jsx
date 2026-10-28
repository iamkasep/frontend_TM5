import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, Download, Package, TimerOff, XCircle } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import StatCard from '@/components/ui/StatCard'
import Button from '@/components/ui/Button'
import { AsyncBoundary } from '@/components/ui/States'
import { useShipments } from '@/hooks/useShipments'
import { summarize } from '@/lib/stats'
import { SHIPMENT_STATUS } from '@/lib/constants'
import { formatDate, formatWeight } from '@/lib/formatters'
import { downloadCsv } from '@/lib/utils'

export default function ReportsPage() {
  const { data, loading, error, reload } = useShipments()
  const list = data ?? []
  const sum = summarize(list)

  const perCustomer = Object.values(list.reduce((acc, s) => {
    acc[s.customerId] ??= { name: s.customerName, total: 0 }
    acc[s.customerId].total += 1
    return acc
  }, {})).sort((a, b) => b.total - a.total)

  const perRoute = Object.values(list.reduce((acc, s) => {
    const k = `${s.origin.city} - ${s.destination.city}`
    acc[k] ??= { route: k, total: 0, delivered: 0, delayed: 0 }
    acc[k].total += 1
    if (s.status === 'delivered') acc[k].delivered += 1
    if (s.status === 'delayed') acc[k].delayed += 1
    return acc
  }, {})).sort((a, b) => b.total - a.total)

  const exportCsv = () => downloadCsv('laporan-pengiriman.csv', list, [
    { header: 'No. resi', value: (s) => s.trackingNumber },
    { header: 'Customer', value: (s) => s.customerName },
    { header: 'Asal', value: (s) => s.origin.city },
    { header: 'Tujuan', value: (s) => s.destination.city },
    { header: 'Driver', value: (s) => s.driverName ?? '' },
    { header: 'Kendaraan', value: (s) => s.vehiclePlate ?? '' },
    { header: 'Berat (kg)', value: (s) => s.weightKg },
    { header: 'Status', value: (s) => SHIPMENT_STATUS[s.status].label },
    { header: 'Estimasi tiba', value: (s) => formatDate(s.eta) },
  ])

  return (
    <>
      <PageHeader title="Laporan Operasional" description="Ringkasan pengiriman berdasarkan customer dan rute."
        actions={<Button variant="secondary" onClick={exportCsv} disabled={!list.length}><Download className="size-4" /> Unduh CSV</Button>} />
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total pengiriman" value={sum.total} icon={Package} />
          <StatCard label="Terkirim" value={sum.delivered} icon={CheckCircle2} tone="green" />
          <StatCard label="Terlambat" value={sum.byStatus.delayed} icon={TimerOff} tone="amber" />
          <StatCard label="Dibatalkan" value={sum.byStatus.cancelled} icon={XCircle} tone="red" />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Pengiriman per customer" />
            <CardBody>
              <div className="h-64" role="img" aria-label="Grafik jumlah pengiriman per customer">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perCustomer} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid horizontal={false} stroke="#e6ebf1" />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#536a83' }} />
                    <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#536a83' }} />
                    <Tooltip cursor={{ fill: '#f4f6f9' }} />
                    <Bar dataKey="total" name="Pengiriman" fill="#e5863c" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Rute teramai" />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50 text-xs font-semibold text-ink-500">
                  <tr><th className="px-5 py-3">Rute</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Terkirim</th><th className="px-3 py-3">Terlambat</th></tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {perRoute.slice(0, 7).map((r) => (
                    <tr key={r.route}><td className="px-5 py-2.5 font-medium text-ink-900">{r.route}</td><td className="px-3 py-2.5">{r.total}</td><td className="px-3 py-2.5">{r.delivered}</td><td className="px-3 py-2.5">{r.delayed}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-ink-100 px-5 py-3 text-xs text-ink-500">Total berat: {formatWeight(list.reduce((t, s) => t + s.weightKg, 0))}</p>
          </Card>
        </div>
      </AsyncBoundary>
    </>
  )
}
