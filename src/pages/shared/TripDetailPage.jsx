import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, MapPin, Play, Trash2, Save } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { tripService } from '@/services/tripService'
import { driverService } from '@/services/driverService'
import { vehicleService } from '@/services/vehicleService'
import { vendorService } from '@/services/masterService'
import { shipmentService } from '@/services/shipmentService'
import { formatDateTime } from '@/lib/formatters'
import { useAuth } from '@/hooks/useAuth'
import { useAsync } from '@/hooks/useAsync'
import LocationPicker from '@/components/forms/LocationPicker'

const STATUS = {
  planned: ['Direncanakan', 'slate'],
  loading: ['Loading', 'blue'],
  in_progress: ['Dalam perjalanan', 'amber'],
  completed: ['Selesai', 'green'],
  cancelled: ['Dibatalkan', 'red'],
}

const SOURCE_LABELS = {
  GPS: 'GPS',
  gps: 'GPS',
  SMS: 'SMS',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  manual: 'Manual',
  API: 'Integrasi API',
  cargo_info: 'Informasi Kargo',
}

const INITIAL_POSITION = {
  eventType: 'IN_TRANSIT',
  awbId: '',
  latitude: '',
  longitude: '',
  positionObtainedAt: '',
  source: 'SMS',
  remarks: '',
}

export default function TripDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { data: bundle, loading, error: loadError, reload: load } = useAsync(
    () => Promise.all([
      tripService.get(id),
      shipmentService.list(),
      driverService.list(),
      vehicleService.list(),
      vendorService.list(),
      tripService.listEvents(id),
    ]),
    [id],
  )
  const [trip, shipments, drivers, vehicles, vendors, events] = bundle || [null, [], [], [], [], []]
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const error = actionError || loadError
  const [position, setPosition] = useState(INITIAL_POSITION)

  const savePosition = async (event) => {
    event.preventDefault()
    setBusy(true)
    setActionError('')
    try {
      const latText = String(position.latitude ?? '').trim()
      const lngText = String(position.longitude ?? '').trim()
      let latitude = null
      let longitude = null
      if (latText !== '' || lngText !== '') {
        if (latText === '' || lngText === '') {
          throw new Error('Isi latitude dan longitude bersama-sama, atau kosongkan keduanya bila posisi belum diketahui.')
        }
        latitude = Number(latText)
        longitude = Number(lngText)
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
          throw new Error('Koordinat tidak valid.')
        }
      }
      const eventTime = position.positionObtainedAt ? new Date(position.positionObtainedAt).toISOString() : new Date().toISOString()
      await tripService.addEvent({
        tripId: id,
        awbId: position.awbId || null,
        eventType: position.eventType || 'IN_TRANSIT',
        source: position.source,
        latitude,
        longitude,
        eventTime,
        positionObtainedAt: position.positionObtainedAt ? new Date(position.positionObtainedAt).toISOString() : null,
        enteredAt: new Date().toISOString(),
        enteredBy: user?.name || 'Admin',
        remarks: position.remarks || (latitude == null
          ? `Event ${position.eventType} dicatat tanpa koordinat.`
          : `Posisi aktual diperbarui (${position.eventType}).`),
      })
      setPosition(INITIAL_POSITION)
      load()
    } catch (err) {
      setActionError(err.message || 'Gagal menyimpan posisi')
    } finally {
      setBusy(false)
    }
  }

  const runAction = async (action) => {
    setBusy(true)
    setActionError('')
    try {
      await action()
      load()
    } catch (err) {
      setActionError(err.message || 'Aksi gagal dilakukan')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !trip) return <Loading label="Memuat detail trip..." />
  if (error && !trip) return <ErrorState message={error} onRetry={load} />
  if (!trip) return <EmptyState title="Trip tidak ditemukan" />

  const [statusLabel, statusTone] = STATUS[trip.status] || [trip.status, 'slate']
  const vendor = vendors.find((item) => item.id === trip.vendorId)
  const driver = drivers.find((item) => item.id === trip.driverId)
  const vehicle = vehicles.find((item) => item.id === trip.vehicleId)
  const linkedShipmentIds = new Set(trip.shipmentIds || [])
  const tripShipments = shipments.filter((shipment) => shipment.tripId === trip.id || linkedShipmentIds.has(shipment.id))
  const tripShipmentMeta = new Map((trip.tripShipments || []).map((ts) => [ts.awbId, ts]))

  return (
    <div className="space-y-5">
      <PageHeader
        title={trip.tripNumber || trip.tripCode || trip.id}
        description="Kelola perjalanan dan AWB yang terhubung. Perubahan trip akan terlihat pada data pengiriman terkait."
        actions={
          <Link to={`/${user.role}/trips`}>
            <Button variant="secondary"><ArrowLeft className="size-4" /> Kembali ke Trip</Button>
          </Link>
        }
      />
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <Card>
        <CardBody>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-ink-500">Status perjalanan</p>
              <div className="mt-2"><Badge tone={statusTone}>{statusLabel}</Badge></div>
            </div>
            <div className="flex flex-wrap gap-2">
              {trip.status === 'planned' && (
                <Button variant="secondary" disabled={busy} onClick={() => runAction(() => tripService.updateStatus(id, 'loading'))}>
                  Mulai Loading
                </Button>
              )}
              {['planned', 'loading'].includes(trip.status) && (
                <Button disabled={busy} onClick={() => runAction(() => tripService.updateStatus(id, 'in_progress'))}>
                  <Play className="size-4" /> Mulai Trip
                </Button>
              )}
              {trip.status === 'in_progress' && (
                <Button disabled={busy} onClick={() => runAction(() => tripService.updateStatus(id, 'completed'))}>
                  <CheckCircle2 className="size-4" /> Selesaikan Trip
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-ink-50 p-4">
              <MapPin className="size-4 text-route-600" />
              <p className="mt-2 text-xs text-ink-500">Asal (Origin)</p>
              <p className="font-semibold text-ink-900">{trip.origin || '—'}</p>
            </div>
            <div className="rounded-xl bg-ink-50 p-4">
              <MapPin className="size-4 text-route-600" />
              <p className="mt-2 text-xs text-ink-500">Tujuan (Destination)</p>
              <p className="font-semibold text-ink-900">{trip.destination || '—'}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 border-t border-ink-100 pt-4 sm:grid-cols-3">
            <div><p className="text-xs text-ink-500">Vendor</p><p className="mt-1 text-sm font-semibold">{vendor?.vendorName || vendor?.name || '—'}</p></div>
            <div><p className="text-xs text-ink-500">Driver</p><p className="mt-1 text-sm font-semibold">{driver?.driverName || driver?.name || '—'}</p></div>
            <div><p className="text-xs text-ink-500">Kendaraan</p><p className="mt-1 text-sm font-semibold">{vehicle?.plateNumber || vehicle?.plate || '—'}</p></div>
          </div>

          <div className="mt-4 grid gap-4 border-t border-ink-100 pt-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-ink-500">Keberangkatan</p>
              <p className="mt-1 text-sm">Rencana: {formatDateTime(trip.plannedDeparture)}</p>
              <p className="text-sm">Aktual: {formatDateTime(trip.actualDeparture)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-500">Kedatangan</p>
              <p className="mt-1 text-sm">Rencana: {formatDateTime(trip.plannedArrival)}</p>
              <p className="text-sm">Aktual: {formatDateTime(trip.actualArrival)}</p>
            </div>
          </div>

          {trip.notes && <p className="mt-4 rounded-lg bg-ink-50 p-3 text-sm text-ink-600">{trip.notes}</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Pembaruan Posisi & Event Tracking"
          subtitle="Catat kejadian perjalanan dan koordinat dari GPS, SMS, WhatsApp, manual, atau integrasi API."
        />
        <form onSubmit={savePosition} className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <LocationPicker
              title="Pilih titik posisi aktual driver"
              hint="Klik langsung pada peta untuk menaruh pin, cari alamat, atau isi latitude dan longitude secara manual. Koordinat boleh dikosongkan jika posisi belum diketahui."
              value={{ lat: position.latitude, lng: position.longitude }}
              onChange={(point) => setPosition((current) => ({ ...current, latitude: point.lat, longitude: point.lng }))}
              mapHeight="h-72"
            />
          </div>

          <label className="text-sm font-medium">
            Jenis kejadian (event_type)
            <select
              className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2"
              value={position.eventType}
              onChange={(e) => setPosition({ ...position, eventType: e.target.value })}
            >
              <option value="IN_TRANSIT">IN_TRANSIT (Dalam perjalanan)</option>
              <option value="ARRIVED">ARRIVED (Tiba di titik tujuan/transit)</option>
              <option value="DELIVERED">DELIVERED (Terkirim)</option>
              <option value="LOADING">LOADING (Pemuatan)</option>
              <option value="EXCEPTION">EXCEPTION (Kendala / Catatan khusus)</option>
            </select>
          </label>

          <label className="text-sm font-medium">
            Sumber data (source)
            <select
              className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2"
              value={position.source}
              onChange={(e) => setPosition({ ...position, source: e.target.value })}
            >
              <option value="GPS">GPS</option>
              <option value="SMS">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="manual">Manual</option>
              <option value="API">API</option>
            </select>
          </label>

          <label className="text-sm font-medium">
            Waktu kejadian (event_time)
            <input
              className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2"
              type="datetime-local"
              value={position.positionObtainedAt}
              onChange={(e) => setPosition({ ...position, positionObtainedAt: e.target.value })}
            />
          </label>

          <label className="text-sm font-medium">
            AWB terkait (opsional)
            <select
              className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2"
              value={position.awbId}
              onChange={(e) => setPosition({ ...position, awbId: e.target.value })}
            >
              <option value="">Seluruh trip (tanpa AWB spesifik)</option>
              {tripShipments.map((s) => (
                <option key={s.id} value={s.trackingNumber || s.id}>{s.trackingNumber || s.id}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium sm:col-span-2">
            Catatan atau alasan exception (remarks)
            <textarea
              className="mt-1 w-full rounded-lg border border-ink-200 p-3"
              rows="2"
              value={position.remarks}
              onChange={(e) => setPosition({ ...position, remarks: e.target.value })}
              placeholder="Contoh: posisi terakhir dari WhatsApp / SMS operator atau alasan kendala perjalanan"
            />
          </label>

          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}><Save className="size-4" /> Simpan Event Tracking</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Riwayat Tracking Trip" subtitle="Daftar kejadian perjalanan (dt_tracking_events) beserta sumber dan waktu pencatatannya." />
        <div className="divide-y divide-ink-100 px-5">
          {events.length ? (
            events.map((event) => (
              <div key={event.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{event.eventType}</Badge>
                    {event.awbId && <Badge tone="slate">AWB: {event.awbId}</Badge>}
                    <p className="font-semibold text-ink-900">{event.remarks || event.eventType}</p>
                  </div>
                  <span className="text-xs text-ink-500">Waktu kejadian: {formatDateTime(event.eventTime || event.enteredAt)}</span>
                </div>
                <p className="mt-1 text-ink-500">
                  Sumber: {SOURCE_LABELS[event.source] || event.source || '—'}
                  {event.idPod ? ` · ID POD: ${event.idPod}` : ''}
                </p>
                <p className="mt-1 text-ink-500">
                  Koordinat: {event.latitude != null && event.longitude != null ? `${event.latitude}, ${event.longitude}` : 'Belum diketahui'} · Penginput: {event.enteredBy || 'Sistem'}
                </p>
              </div>
            ))
          ) : (
            <p className="py-5 text-sm text-ink-500">Belum ada riwayat tracking untuk trip ini.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="AWB dalam Trip" subtitle={`${tripShipments.length} pengiriman terhubung dengan perjalanan ini (dt_trip_shipments).`} />
        {tripShipments.length ? (
          <div className="overflow-x-auto px-5 pb-3">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="text-xs uppercase text-ink-500">
                <tr>
                  <th className="pb-3">AWB / Resi</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Rute</th>
                  <th className="pb-3">Status di Trip</th>
                  <th className="pb-3">Waktu Loading</th>
                  <th className="pb-3">Waktu Delivery</th>
                  <th className="pb-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tripShipments.map((shipment) => {
                  const meta = tripShipmentMeta.get(shipment.id) || {}
                  const delivStatus = meta.deliveryStatus || (trip.status === 'completed' ? 'DELIVERED' : trip.status === 'in_progress' ? 'IN_TRANSIT' : 'LOADING')
                  return (
                    <tr key={shipment.id} className="border-t border-ink-100">
                      <td className="py-3">
                        <Link className="font-semibold text-route-700 hover:underline" to={`/${user.role}/shipments/${shipment.id}`}>
                          {shipment.trackingNumber}
                        </Link>
                      </td>
                      <td className="py-3">{shipment.customerName || '—'}</td>
                      <td className="py-3">{shipment.origin?.city || '—'} → {shipment.destination?.city || '—'}</td>
                      <td className="py-3"><Badge tone={delivStatus === 'DELIVERED' ? 'green' : delivStatus === 'IN_TRANSIT' ? 'amber' : 'blue'}>{delivStatus}</Badge></td>
                      <td className="py-3 text-xs text-ink-600">{meta.loadedAt ? formatDateTime(meta.loadedAt) : '—'}</td>
                      <td className="py-3 text-xs text-ink-600">{meta.deliveredAt ? formatDateTime(meta.deliveredAt) : '—'}</td>
                      <td className="py-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy || trip.status === 'completed'}
                          onClick={() => runAction(() => tripService.removeShipment(id, shipment.id))}
                        >
                          <Trash2 className="size-3.5" /> Keluarkan
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState
              title="Belum ada AWB"
              description="AWB akan muncul otomatis di sini setelah pengiriman dibuat pada Manajemen Pengiriman dan trip ini dipilih."
            />
          </div>
        )}
      </Card>
    </div>
  )
}
