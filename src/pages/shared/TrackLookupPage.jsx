import PageHeader from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import TrackForm from '@/components/sections/tracking/TrackForm'
import ActiveShipmentList from '@/components/sections/dashboard/ActiveShipmentList'
import { useAuth } from '@/hooks/useAuth'
import { useShipments } from '@/hooks/useShipments'

export default function TrackLookupPage() {
  const { user } = useAuth()
  const { data } = useShipments()
  const base = `/${user.role}`
  return (
    <>
      <PageHeader title="Lacak Pengiriman" description="Masukkan nomor resi untuk melihat posisi dan riwayat status." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardBody>
            <TrackForm basePath={base} />
            <p className="mt-3 text-sm text-ink-500">Anda hanya dapat melacak pengiriman milik perusahaan Anda sendiri.</p>
          </CardBody>
        </Card>
        <ActiveShipmentList shipments={data ?? []} basePath={base} title="Sedang berjalan" />
      </div>
    </>
  )
}
