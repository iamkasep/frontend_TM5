import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { AsyncBoundary } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import ShipmentForm from '@/components/sections/shipments/ShipmentForm'
import { useAsync } from '@/hooks/useAsync'
import { useAuth, useScope } from '@/hooks/useAuth'
import { shipmentService } from '@/services/shipmentService'
import { customerService } from '@/services/masterService'
import { locationService } from '@/services/locationService'
import { mockNote } from '@/services/api'

const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10)
const EMPTY = { customerId: '', originLocationId: '', destinationLocationId: '', awb: '', weightKg: '', eta: tomorrow(), notes: '', manualLat: '', manualLng: '' }

export default function ShipmentFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const { user } = useAuth()
  const scope = useScope()
  const navigate = useNavigate()
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  const { data, loading, error, reload } = useAsync(async () => {
    const [customers, allShipments, locations, shipment] = await Promise.all([customerService.list(), shipmentService.list(), locationService.list(), isEdit ? shipmentService.get(id, scope) : null])
    return { customers: customers.filter((c) => c.status === 'active' || c.id === shipment?.customerId), locations: locations.filter((l) => l.status === 'active'), allShipments, shipment }
  }, [id])

  const initial = data?.shipment ? {
    customerId: data.shipment.customerId, originLocationId: data.shipment.originLocationId ?? data.locations.find((l) => l.name === data.shipment.origin?.city)?.id ?? '', destinationLocationId: data.shipment.destinationLocationId ?? data.locations.find((l) => l.name === data.shipment.destination?.city)?.id ?? '', awb: data.shipment.trackingNumber,
    weightKg: data.shipment.weightKg, eta: data.shipment.eta.slice(0, 10), notes: data.shipment.notes ?? '',
    manualLat: String(data.shipment.history?.at(-1)?.lat ?? ''), manualLng: String(data.shipment.history?.at(-1)?.lng ?? ''),
  } : EMPTY

  const submit = async (form) => {
    setSaving(true)
    try {
      const originLocation = data.locations.find((l) => l.id === form.originLocationId)
      const destinationLocation = data.locations.find((l) => l.id === form.destinationLocationId)
      if (!isEdit && (!originLocation || !destinationLocation)) throw new Error('Pilih titik asal dan tujuan dari Manajemen Koordinat.')
      // Field khusus UI (manualLat/manualLng) tidak dikirim; posisi manual sudah ada di form.manualPosition.
      const apiForm = { ...form }
      delete apiForm.manualLat
      delete apiForm.manualLng
      const payload = {
        ...apiForm,
        ...(originLocation ? { origin: { city: originLocation.name, lat: Number(originLocation.latitude), lng: Number(originLocation.longitude) } } : {}),
        ...(destinationLocation ? { destination: { city: destinationLocation.name, lat: Number(destinationLocation.latitude), lng: Number(destinationLocation.longitude) } } : {}),
      }
      const saved = isEdit ? await shipmentService.update(id, payload) : await shipmentService.create(payload)
      toast.success(`${isEdit ? 'Perubahan disimpan' : 'Pengiriman dibuat'}${mockNote}`)
      navigate(`/${user.role}/shipments/${saved.id}`)
    } catch (e) {
      toast.error(e.message)
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title={isEdit ? 'Edit Pengiriman' : 'Buat Pengiriman'} description={isEdit ? data?.shipment?.trackingNumber : 'Isi data pengiriman. Driver dapat ditugaskan setelah pengiriman dibuat.'} />
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {data && (
          <Card>
            <CardBody>
              <ShipmentForm key={data.shipment?.id ?? 'new'} initial={initial} customers={data.customers} locations={data.locations} usedAwbs={data.allShipments.filter((s) => s.id !== id).map((s) => s.trackingNumber)} isEdit={isEdit} saving={saving} onSubmit={submit} onCancel={() => navigate(-1)} />
            </CardBody>
          </Card>
        )}
      </AsyncBoundary>
    </>
  )
}
