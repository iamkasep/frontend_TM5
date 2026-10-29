import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, CalendarClock, CheckCircle2, CirclePlus, ClipboardList, Package, Play, Search, Truck, X } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { tripService } from '@/services/tripService'
import { driverService } from '@/services/driverService'
import { vehicleService } from '@/services/vehicleService'
import { vendorService } from '@/services/masterService'
import { shipmentService } from '@/services/shipmentService'
import { locationService } from '@/services/locationService'
import { formatDateTime } from '@/lib/formatters'
import { useAuth } from '@/hooks/useAuth'
import { useAsync } from '@/hooks/useAsync'

const STATUS = {
  planned: ['Direncanakan', 'slate'],
  loading: ['Loading', 'blue'],
  in_progress: ['Dalam Perjalanan', 'amber'],
  completed: ['Selesai', 'green'],
  cancelled: ['Dibatalkan', 'red'],
}

const EMPTY_FORM = {
  vendorId: '',
  driverId: '',
  vehicleId: '',
  originLocationId: '',
  destinationLocationId: '',
  origin: '',
  destination: '',
  plannedDeparture: '',
  plannedArrival: '',
  notes: '',
  shipmentIds: [],
  originLat: '',
  originLng: '',
  destinationLat: '',
  destinationLng: '',
}

const coordsOf = (trip) => ({
  originLat: trip.originLat != null ? String(trip.originLat) : '',
  originLng: trip.originLng != null ? String(trip.originLng) : '',
  destinationLat: trip.destinationLat != null ? String(trip.destinationLat) : '',
  destinationLng: trip.destinationLng != null ? String(trip.destinationLng) : '',
})

const dtLocal = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const isThirdPartyVendor = (vendor) => {
  const vt = String(vendor?.vendorType ?? vendor?.type ?? '').trim().toUpperCase()
  return vt === 'THIRD_PARTY' || vt === 'EXTERNAL'
}

const isEntityReady = (entity) => ['active', 'available'].includes(String(entity?.status ?? '').toLowerCase())

export default function TripsPage() {
  const { user } = useAuth()
  const { data: bundle, loading, error: loadError, reload: load } = useAsync(
    () => Promise.all([
      tripService.list(),
      driverService.list(),
      vehicleService.list(),
      vendorService.list(),
      shipmentService.list(),
      locationService.list(),
    ]),
    [],
  )
  const [items, drivers, vehicles, vendors, shipments, locations] = bundle || [[], [], [], [], [], []]
  const [actionError, setActionError] = useState('')
  const error = actionError || loadError
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  const scoped = useMemo(() => {
    let list = items
    if (status !== 'all') list = list.filter((t) => t.status === status)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((t) =>
        [
          t.tripNumber || t.tripCode,
          t.id,
          t.origin,
          t.destination,
          vendors.find((v) => v.id === t.vendorId)?.vendorName,
          drivers.find((d) => d.id === t.driverId)?.driverName,
          vehicles.find((v) => v.id === t.vehicleId)?.plateNumber,
        ].some((v) => String(v || '').toLowerCase().includes(q)),
      )
    }
    return list
  }, [items, query, status, drivers, vehicles, vendors])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, vendorId: vendors.find((v) => v.status === 'active')?.id || '' })
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (trip) => {
    setEditing(trip)
    setForm({
      ...EMPTY_FORM,
      ...trip,
      vendorId: trip.vendorId || '',
      driverId: trip.driverId || '',
      vehicleId: trip.vehicleId || '',
      originLocationId: trip.originLocationId || '',
      destinationLocationId: trip.destinationLocationId || '',
      shipmentIds: trip.shipmentIds || [],
      plannedDeparture: dtLocal(trip.plannedDeparture),
      plannedArrival: dtLocal(trip.plannedArrival),
      ...coordsOf(trip),
    })
    setFormError('')
    setShowForm(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const selectedVendor = vendors.find((v) => v.id === form.vendorId)
      const selectedDriver = drivers.find((d) => d.id === form.driverId)
      const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId)
      const originLocation = locations.find((l) => l.id === form.originLocationId)
      const destinationLocation = locations.find((l) => l.id === form.destinationLocationId)

      if (!selectedVendor || selectedVendor.status !== 'active') throw new Error('Pilih vendor yang aktif.')
      if (!form.originLocationId || !form.destinationLocationId || !originLocation || !destinationLocation) {
        throw new Error('Pilih lokasi asal dan tujuan dari Manajemen Koordinat.')
      }
      if (selectedDriver && (!isEntityReady(selectedDriver) || selectedDriver.vendorId !== selectedVendor.id)) {
        throw new Error('Driver harus aktif dan berasal dari vendor yang dipilih.')
      }
      if (selectedVehicle && (!isEntityReady(selectedVehicle) || selectedVehicle.vendorId !== selectedVendor.id)) {
        throw new Error('Kendaraan harus aktif dan berasal dari vendor yang dipilih.')
      }
      if (selectedDriver && selectedVehicle && selectedDriver.vendorId !== selectedVehicle.vendorId) {
        throw new Error('Driver dan kendaraan harus berasal dari vendor yang sama.')
      }
      if (form.plannedDeparture && form.plannedArrival && new Date(form.plannedArrival) <= new Date(form.plannedDeparture)) {
        throw new Error('Waktu kedatangan harus setelah waktu keberangkatan.')
      }

      const overlaps = (a) => {
        const startA = a.plannedDeparture ? new Date(a.plannedDeparture).getTime() : -Infinity
        const endA = a.plannedArrival ? new Date(a.plannedArrival).getTime() : Infinity
        const startB = form.plannedDeparture ? new Date(form.plannedDeparture).getTime() : -Infinity
        const endB = form.plannedArrival ? new Date(form.plannedArrival).getTime() : Infinity
        return startA < endB && startB < endA
      }
      const busyTrip = items.find((t) =>
        t.id !== editing?.id
        && !['completed', 'cancelled'].includes(t.status)
        && overlaps(t)
        && ((selectedDriver && t.driverId === selectedDriver.id) || (selectedVehicle && t.vehicleId === selectedVehicle.id)),
      )
      if (busyTrip) throw new Error('Driver atau kendaraan sudah memiliki trip lain pada rentang jadwal tersebut.')

      const payload = {
        ...form,
        vendorId: selectedVendor.id,
        origin: originLocation.name,
        destination: destinationLocation.name,
        originLocationId: originLocation.id,
        destinationLocationId: destinationLocation.id,
        originLat: Number(originLocation.latitude),
        originLng: Number(originLocation.longitude),
        destinationLat: Number(destinationLocation.latitude),
        destinationLng: Number(destinationLocation.longitude),
        plannedDeparture: form.plannedDeparture ? new Date(form.plannedDeparture).toISOString() : null,
        plannedArrival: form.plannedArrival ? new Date(form.plannedArrival).toISOString() : null,
        shipmentIds: editing?.shipmentIds || [],
      }
      if (selectedDriver) {
        payload.driverId = selectedDriver.id
        payload.driverName = selectedDriver.driverName || selectedDriver.name
      }
      if (selectedVehicle) {
        payload.vehicleId = selectedVehicle.id
        payload.vehiclePlate = selectedVehicle.plateNumber || selectedVehicle.plate
      }
      if (!isThirdPartyVendor(selectedVendor) && (!selectedDriver || !selectedVehicle)) {
        throw new Error('Untuk vendor Transporter / Courier, driver dan kendaraan wajib dipilih. Vendor Third Party boleh tanpa driver/kendaraan.')
      }

      const saved = editing ? await tripService.update(editing.id, payload) : await tripService.create(payload)
      const previousIds = editing?.shipmentIds || []
      for (const id of form.shipmentIds || []) {
        if (!previousIds.includes(id)) await tripService.assignShipment(saved.id, id)
      }
      for (const id of previousIds) {
        if (!(form.shipmentIds || []).includes(id)) await tripService.removeShipment(saved.id, id)
      }
      setShowForm(false)
      await load()
    } catch (e2) {
      setFormError(e2.message || 'Gagal menyimpan trip')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (trip, next) => {
    setActionError('')
    try {
      await tripService.updateStatus(trip.id, next)
      load()
    } catch (e) {
      setActionError(e.message)
    }
  }

  const stats = [
    { label: 'Total trip', value: items.length, icon: Truck },
    { label: 'Direncanakan', value: items.filter((t) => t.status === 'planned').length, icon: CalendarClock },
    { label: 'Dalam perjalanan', value: items.filter((t) => t.status === 'in_progress').length, icon: ArrowDownRight },
    { label: 'Selesai', value: items.filter((t) => t.status === 'completed').length, icon: CheckCircle2 },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Trip"
        description="Kelola perjalanan armada, jadwal keberangkatan, penugasan driver, dan daftar AWB dalam satu trip."
        actions={<Button onClick={openCreate}><CirclePlus className="mr-2 size-4" /> Buat Trip</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-500">{s.label}</span>
              <s.icon className="size-4 text-route-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-ink-900">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <Input
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nomor trip, rute, vendor, driver, atau nomor polisi..."
            />
          </div>
          <select
            className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Semua status</option>
            {Object.entries(STATUS).map(([v, [label]]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={load} />}

      {loading ? (
        <Loading label="Memuat trip..." />
      ) : !error && scoped.length === 0 ? (
        <EmptyState
          title="Trip tidak ditemukan"
          description="Ubah kata kunci atau buat perjalanan baru."
          action={<Button onClick={openCreate}>Buat Trip</Button>}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {scoped.map((trip) => {
            const vendor = vendors.find((v) => v.id === trip.vendorId)
            const driver = drivers.find((d) => d.id === trip.driverId)
            const vehicle = vehicles.find((v) => v.id === trip.vehicleId)
            const tripShipmentIds = trip.shipmentIds || []
            const awbs = shipments.filter((s) => tripShipmentIds.includes(s.id))
            const [label, tone] = STATUS[trip.status] || [trip.status, 'slate']

            return (
              <Card key={trip.id} className="overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <ClipboardList className="size-4 text-route-600" />
                      <p className="font-bold text-ink-900">{trip.tripNumber || trip.tripCode}</p>
                    </div>
                    <p className="mt-1 text-xs text-ink-500">{trip.id}</p>
                  </div>
                  <Badge tone={tone}>{label}</Badge>
                </div>

                <div className="space-y-4 p-4">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1 rounded-lg bg-ink-50 p-3">
                      <p className="text-xs text-ink-500">Asal</p>
                      <p className="mt-1 truncate font-semibold text-ink-900">{trip.origin}</p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-ink-400" />
                    <div className="min-w-0 flex-1 rounded-lg bg-ink-50 p-3">
                      <p className="text-xs text-ink-500">Tujuan</p>
                      <p className="mt-1 truncate font-semibold text-ink-900">{trip.destination}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="size-4 text-ink-400" />
                      <span className="text-ink-500">Kendaraan</span>
                      <span className="ml-auto font-medium">{vehicle?.plateNumber || vehicle?.plate || 'Belum ditentukan'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-ink-500">Driver</span>
                      <span className="ml-auto font-medium">{driver?.driverName || driver?.name || 'Belum ditentukan'}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-ink-500">Vendor</span>
                      <p className="mt-1 font-medium">{vendor?.vendorName || vendor?.name || '—'}</p>
                    </div>
                    <div className="text-sm">
                      <span className="text-ink-500">AWB dalam trip</span>
                      <p className="mt-1 flex items-center gap-1 font-medium">
                        <Package className="size-4 text-ink-400" />
                        {tripShipmentIds.length} pengiriman
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-lg border border-ink-100 p-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-ink-500">Keberangkatan rencana</p>
                      <p className="mt-1 text-sm font-medium">{trip.plannedDeparture ? formatDateTime(trip.plannedDeparture) : 'Belum dijadwalkan'}</p>
                      <p className="mt-1 text-xs text-ink-500">Aktual: {trip.actualDeparture ? formatDateTime(trip.actualDeparture) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-500">Kedatangan rencana</p>
                      <p className="mt-1 text-sm font-medium">{trip.plannedArrival ? formatDateTime(trip.plannedArrival) : 'Belum dijadwalkan'}</p>
                      <p className="mt-1 text-xs text-ink-500">Aktual: {trip.actualArrival ? formatDateTime(trip.actualArrival) : '—'}</p>
                    </div>
                  </div>

                  {awbs.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-ink-800">AWB terkait</p>
                      <div className="space-y-2">
                        {awbs.map((s) => (
                          <div key={s.id} className="flex items-center justify-between gap-3 rounded-md bg-ink-50 px-3 py-2 text-sm">
                            <Link className="font-medium text-route-700 hover:underline" to={`/${user.role}/shipments/${s.id}`}>
                              {s.trackingNumber}
                            </Link>
                            <span className="text-ink-500">{s.origin?.city} → {s.destination?.city}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(trip)}>Edit Trip</Button>
                    <Link to={`/${user.role}/trips/${trip.id}`}>
                      <Button size="sm" variant="secondary">
                        Detail Trip <ArrowRight className="ml-1 size-3.5" />
                      </Button>
                    </Link>
                    {trip.status === 'planned' && (
                      <Button size="sm" variant="secondary" onClick={() => updateStatus(trip, 'loading')}>
                        Loading
                      </Button>
                    )}
                    {['planned', 'loading'].includes(trip.status) && (
                      <Button size="sm" onClick={() => updateStatus(trip, 'in_progress')}>
                        <Play className="mr-1 size-3.5" /> Mulai Perjalanan
                      </Button>
                    )}
                    {trip.status === 'in_progress' && (
                      <Button size="sm" onClick={() => updateStatus(trip, 'completed')}>
                        <CheckCircle2 className="mr-1 size-3.5" /> Selesaikan
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Trip' : 'Buat Trip'} size="lg">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Vendor / Operator
              <select
                className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2"
                value={form.vendorId}
                onChange={(e) => setForm({ ...form, vendorId: e.target.value, driverId: '', vehicleId: '' })}
                required
              >
                <option value="">Pilih vendor</option>
                {vendors.filter((v) => v.status === 'active').map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vendorName || v.name} ({v.vendorType || v.type})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Driver (opsional untuk Third Party)
              <select
                className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2"
                value={form.driverId}
                onChange={(e) => setForm({ ...form, driverId: e.target.value, vehicleId: '' })}
              >
                <option value="">Tidak ditentukan</option>
                {drivers.filter((d) => isEntityReady(d) && d.vendorId === form.vendorId).map((d) => (
                  <option key={d.id} value={d.id}>{d.driverName || d.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Kendaraan (opsional untuk Third Party)
              <select
                className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2"
                value={form.vehicleId}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              >
                <option value="">Tidak ditentukan</option>
                {vehicles.filter((v) => isEntityReady(v) && v.vendorId === form.vendorId).map((v) => (
                  <option key={v.id} value={v.id}>{v.plateNumber || v.plate} — {v.vehicleType || v.type}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Lokasi asal
              <select
                className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2"
                value={form.originLocationId}
                onChange={(e) => setForm({ ...form, originLocationId: e.target.value })}
                required
              >
                <option value="">Pilih lokasi asal</option>
                {locations.filter((l) => l.status === 'active').map((l) => (
                  <option key={l.id} value={l.id}>{l.name} — {l.address}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Lokasi tujuan
              <select
                className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2"
                value={form.destinationLocationId}
                onChange={(e) => setForm({ ...form, destinationLocationId: e.target.value })}
                required
              >
                <option value="">Pilih lokasi tujuan</option>
                {locations.filter((l) => l.status === 'active').map((l) => (
                  <option key={l.id} value={l.id}>{l.name} — {l.address}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Keberangkatan rencana
              <Input
                type="datetime-local"
                value={form.plannedDeparture}
                onChange={(e) => setForm({ ...form, plannedDeparture: e.target.value })}
              />
            </label>

            <label className="block text-sm font-medium">
              Kedatangan rencana
              <Input
                type="datetime-local"
                value={form.plannedArrival}
                onChange={(e) => setForm({ ...form, plannedArrival: e.target.value })}
              />
            </label>
          </div>

          <div className="rounded-lg border border-ink-200 p-3">
            <p className="mb-2 text-sm font-semibold">AWB yang dibawa trip ini</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {shipments.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={(form.shipmentIds || []).includes(s.id)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        shipmentIds: e.target.checked
                          ? [...(f.shipmentIds || []), s.id]
                          : (f.shipmentIds || []).filter((id) => id !== s.id),
                      }))
                    }
                  />
                  <span>{s.trackingNumber || s.id}</span>
                </label>
              ))}
            </div>
            {shipments.length === 0 && <p className="text-sm text-ink-500">Belum ada AWB. Buat pengiriman terlebih dahulu.</p>}
          </div>

          <label className="block text-sm font-medium">
            Catatan
            <textarea
              className="mt-1 w-full rounded-lg border border-ink-200 p-3 text-sm"
              rows="3"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Catatan operasional (opsional)"
            />
          </label>

          {formError && <p className="text-sm text-rose-600">{formError}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              <X className="mr-1 size-4" /> Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Trip'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
