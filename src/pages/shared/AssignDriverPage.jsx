import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { AsyncBoundary, EmptyState } from '@/components/ui/States'
import Button from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAsync } from '@/hooks/useAsync'
import { useScope } from '@/hooks/useAuth'
import { shipmentService } from '@/services/shipmentService'
import { driverService } from '@/services/driverService'
import { USE_MOCK, mockNote } from '@/services/api'
import { formatDate, formatWeight } from '@/lib/formatters'
import { cn } from '@/lib/utils'

function Choice({ selected, onClick, children }) {
  return (
    <li>
      <button type="button" role="radio" aria-checked={selected} onClick={onClick}
        className={cn('flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-ink-50', selected && 'bg-route-50')}>
        <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-1 ring-inset', selected ? 'bg-route-600 text-white ring-route-600' : 'ring-ink-300')}>
          {selected && <Check className="size-3" />}
        </span>
        <span className="min-w-0 flex-1">{children}</span>
      </button>
    </li>
  )
}

export default function AssignDriverPage() {
  const scope = useScope()
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(async () => {
    const [shipments, drivers] = await Promise.all([shipmentService.list(scope), driverService.list()])
    return { shipments: shipments.filter((s) => s.status === 'pending'), drivers: drivers.filter((d) => d.status === 'available' || d.id === scope.driverId || d.id === 'DRV-001') }
  }, [scope.role])
  const [shipmentId, setShipmentId] = useState(null)
  const [driverId, setDriverId] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const shipment = data?.shipments.find((s) => s.id === shipmentId)
  const driver = data?.drivers.find((d) => d.id === driverId)

  const assign = async () => {
    setBusy(true)
    try {
      await shipmentService.assignDriver(shipment.id, driver)
      if (USE_MOCK) await driverService.update(driver.id, { status: 'on_duty' })
      toast.success(`${driver.name} ditugaskan ke ${shipment.trackingNumber}${mockNote}`)
      setConfirm(false); setShipmentId(null); setDriverId(null)
      reload()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Penugasan Driver" description="Pilih satu pengiriman yang menunggu, lalu pilih driver yang tersedia." />
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader title="Pengiriman menunggu" subtitle={`${data.shipments.length} pengiriman`} />
                {data.shipments.length === 0 ? <EmptyState title="Semua pengiriman sudah ditugaskan" /> : (
                  <ul role="radiogroup" aria-label="Pilih pengiriman" className="divide-y divide-ink-100">
                    {data.shipments.map((s) => (
                      <Choice key={s.id} selected={s.id === shipmentId} onClick={() => setShipmentId(s.id)}>
                        <span className="block font-mono text-sm font-medium text-ink-900">{s.trackingNumber}</span>
                        <span className="flex items-center gap-1.5 text-sm text-ink-600">{s.origin.city}<ArrowRight className="size-3.5 text-ink-400" aria-hidden />{s.destination.city}</span>
                        <span className="text-xs text-ink-500">{s.customerName} · {formatWeight(s.weightKg)} · tiba {formatDate(s.eta)}</span>
                      </Choice>
                    ))}
                  </ul>
                )}
              </Card>
              <Card>
                <CardHeader title="Driver tersedia" subtitle={`${data.drivers.length} driver`} />
                {data.drivers.length === 0 ? <EmptyState title="Tidak ada driver tersedia" description="Semua driver sedang bertugas atau libur." /> : (
                  <ul role="radiogroup" aria-label="Pilih driver" className="divide-y divide-ink-100">
                    {data.drivers.map((d) => (
                      <Choice key={d.id} selected={d.id === driverId} onClick={() => setDriverId(d.id)}>
                        <span className="block text-sm font-bold text-ink-900">{d.name}</span>
                        <span className="text-sm text-ink-600">{d.vehiclePlate ?? 'Tanpa kendaraan'} · {d.vendorName}</span>
                      </Choice>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
            <div className="mt-5 flex justify-end">
              <Button size="lg" disabled={!shipment || !driver} onClick={() => setConfirm(true)}>Tugaskan driver</Button>
            </div>
          </>
        )}
      </AsyncBoundary>
      <ConfirmDialog
        open={confirm} loading={busy} title="Tugaskan driver?" confirmLabel="Tugaskan"
        message={shipment && driver ? `${driver.name} (${driver.vehiclePlate ?? 'tanpa kendaraan'}) akan ditugaskan ke pengiriman ${shipment.trackingNumber}.` : ''}
        onConfirm={assign} onCancel={() => setConfirm(false)}
      />
    </>
  )
}
