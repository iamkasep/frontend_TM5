import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Pencil, XCircle } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { AsyncBoundary } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import Timeline from '@/components/sections/tracking/Timeline'
import TrackingMap from '@/components/sections/tracking/TrackingMap'
import DriverStatusActions from '@/components/sections/shipments/DriverStatusActions'
import JourneyProgress from '@/components/sections/shipments/JourneyProgress'
import { useAsync } from '@/hooks/useAsync'
import { useAuth, useScope } from '@/hooks/useAuth'
import { shipmentService } from '@/services/shipmentService'
import { USE_MOCK, mockNote } from '@/services/api'
import { ACTIVE_STATUSES, HISTORY_STATUSES } from '@/lib/constants'
import { getCurrentPosition, getRealPosition, POSITION_SOURCE_LABEL } from '@/lib/geo'
import { formatDateTime, formatWeight } from '@/lib/formatters'
import { tripService } from '@/services/tripService'
import { locationService } from '@/services/locationService'
import { CITIES } from '@/lib/geo'

// Koordinat harus benar-benar terisi; Number(null) dan Number('') menghasilkan 0,
// sehingga keduanya tidak boleh dianggap sebagai posisi GPS yang valid.
function hasValidCoordinates(latitude, longitude) {
  if (latitude === null || latitude === undefined || latitude === '' || longitude === null || longitude === undefined || longitude === '') return false
  const lat = Number(latitude)
  const lng = Number(longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

function normalizeLocationName(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right font-medium text-ink-900">{children || '-'}</dd>
    </div>
  )
}

export default function ShipmentDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const scope = useScope()
  const navigate = useNavigate()
  const toast = useToast()
  const base = `/${user.role}`
  // Mode simulasi: ETA AWB disinkronkan dari jadwal trip SEBELUM data dimuat, jadi tidak perlu reload kedua.
  const { data: s, loading, error, reload } = useAsync(async () => {
    if (USE_MOCK) await tripService.syncShipmentEtas().catch(() => {})
    return shipmentService.get(id, scope)
  }, [id, scope.role, scope.customerId, scope.driverId])
  const { data: refData } = useAsync(
    () => Promise.all([tripService.list(), locationService.list()]).catch(() => [[], []]),
    [id],
  )
  const [allTrips, locations] = refData || [[], []]
  const tripIdsKey = (s?.tripIds || []).join('|')
  const linkedTrips = useMemo(
    () => allTrips.filter((trip) => (trip.shipmentIds || []).includes(id) || (s?.tripIds || []).includes(trip.id) || s?.tripId === trip.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tripIdsKey mewakili isi s.tripIds
    [allTrips, id, s?.tripId, tripIdsKey],
  )
  const linkedTripsKey = linkedTrips.map((trip) => trip.id).join('|')
  const [selectedTripId, setSelectedTripId] = useState(null)
  const { data: selectedEventsData } = useAsync(
    () => (selectedTripId ? tripService.listEvents(selectedTripId).catch(() => []) : Promise.resolve([])),
    [selectedTripId],
  )
  const selectedTripEvents = selectedEventsData || []
  const { data: allEventsData } = useAsync(
    () => Promise.all(linkedTrips.map((trip) => tripService.listEvents(trip.id)))
      .then((groups) => groups.flat().sort((a, b) => new Date(b.eventTime || b.enteredAt || 0) - new Date(a.eventTime || a.enteredAt || 0)))
      .catch(() => []),
    [linkedTripsKey],
  )
  const allTripEvents = allEventsData || []
  const [cancelOpen, setCancelOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const markers = useMemo(() => {
    if (!s) return []
    const m = [
      { id: 'o', kind: 'origin', position: [s.origin.lat, s.origin.lng], label: `Asal: ${s.origin.city}` },
      { id: 'd', kind: 'destination', position: [s.destination.lat, s.destination.lng], label: `Tujuan: ${s.destination.city}` },
    ]
    if (ACTIVE_STATUSES.includes(s.status)) m.push({ id: 'v', kind: 'vehicle', position: getCurrentPosition(s), label: `Posisi terakhir${getRealPosition(s) ? ' (manual dari SMS)' : USE_MOCK ? ' (simulasi)' : ''}` })
    return m
  }, [s])

  const selectedTrip = linkedTrips.find((trip) => trip.id === selectedTripId) || null
  const resolveLocation = (name, fallback) => {
    const normalized = normalizeLocationName(name)
    if (!normalized) return fallback

    // Utamakan nama/kode lokasi yang sama persis agar titik master tidak tertukar
    // dengan alamat atau lokasi lain yang hanya kebetulan mengandung kata serupa.
    const activeLocations = locations.filter((location) => !['inactive', 'nonaktif', 'disabled'].includes(normalizeLocationName(location.status)))
    const exact = activeLocations.find((location) =>
      [location.name, location.code, location.address].some((value) => normalizeLocationName(value) === normalized)
    )
    if (exact && hasValidCoordinates(exact.latitude, exact.longitude)) return [Number(exact.latitude), Number(exact.longitude)]

    // Jika nama trip dan nama master sedikit berbeda (mis. "Bandara Semarang"
    // vs "Bandara Ahmad Yani Semarang"), cocokkan token pada NAMA terlebih dahulu.
    const queryTokens = normalized.split(' ').filter(Boolean)
    const scored = activeLocations.map((location) => {
      const nameText = normalizeLocationName(location.name)
      const nameTokens = nameText.split(' ').filter(Boolean)
      const overlap = queryTokens.filter((token) => nameTokens.includes(token)).length
      const score = overlap / Math.max(queryTokens.length, nameTokens.length, 1)
      return { location, overlap, score, nameText }
    }).filter((item) => item.overlap > 0 && hasValidCoordinates(item.location.latitude, item.location.longitude))
      .sort((a, b) => b.overlap - a.overlap || b.score - a.score || a.nameText.length - b.nameText.length)
    if (scored.length && (scored[0].overlap >= queryTokens.length || scored[0].overlap >= 2)) {
      const match = scored[0].location
      return [Number(match.latitude), Number(match.longitude)]
    }

    // City fallback hanya dipakai jika tidak ada lokasi master yang cocok.
    const city = Object.keys(CITIES).find((key) => normalized.split(' ').includes(normalizeLocationName(key)))
    return city ? [CITIES[city].lat, CITIES[city].lng] : fallback
  }
  const mapPlan = selectedTrip
    ? [resolveLocation(selectedTrip.origin, [s.origin.lat, s.origin.lng]), resolveLocation(selectedTrip.destination, [s.destination.lat, s.destination.lng])]
    : [[s?.origin?.lat, s?.origin?.lng], [s?.destination?.lat, s?.destination?.lng]]
  const selectedRealEvent = selectedTripEvents.find((event) => hasValidCoordinates(event.latitude, event.longitude))
  const latestShipmentTripPosition = allTripEvents.find((event) => hasValidCoordinates(event.latitude, event.longitude))
  const overallMarkers = latestShipmentTripPosition
    ? [
      ...markers.filter((marker) => marker.kind !== 'vehicle'),
      {
        id: 'trip-driver-overall',
        kind: 'vehicle',
        position: [Number(latestShipmentTripPosition.latitude), Number(latestShipmentTripPosition.longitude)],
        label: `Posisi terakhir trip (${latestShipmentTripPosition.source || 'sumber tidak diketahui'})`,
      },
    ]
    : markers
  const mapMarkers = selectedTrip
    ? [
      { id: 'trip-origin', kind: 'origin', position: mapPlan[0], label: `Asal trip: ${selectedTrip.origin}` },
      { id: 'trip-destination', kind: 'destination', position: mapPlan[1], label: `Tujuan trip: ${selectedTrip.destination}` },
      ...(selectedRealEvent
        ? [{
          id: 'trip-driver',
          kind: 'vehicle',
          position: [Number(selectedRealEvent.latitude), Number(selectedRealEvent.longitude)],
          label: `Posisi terakhir trip (${selectedRealEvent.source || 'sumber tidak diketahui'})`,
        }]
        : []),
    ]
    : overallMarkers
  const tripRoute = selectedTripEvents
    .filter((event) => hasValidCoordinates(event.latitude, event.longitude))
    .slice()
    .reverse()
    .map((event) => [
      Number(event.latitude),
      Number(event.longitude),
      ['admin_manual', 'sms', 'manual'].includes(event.source) ? 'manual' : undefined,
    ])

  const cancel = async () => {
    setBusy(true)
    try {
      await shipmentService.cancel(s.id)
      toast.success(`Pengiriman dibatalkan${mockNote}`)
      setCancelOpen(false)
      reload()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const open = s && !HISTORY_STATUSES.includes(s.status)

  return (
    <AsyncBoundary loading={loading} error={error} onRetry={reload}>
      {s && (
        <>
          <PageHeader
            title={<span className="font-mono text-2xl">{s.trackingNumber}</span>}
            description={`${s.customerName} · dibuat ${formatDateTime(s.createdAt)}`}
            actions={(
              <>
                <Button variant="secondary" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Kembali</Button>
                {user.role === 'admin' && open && (
                  <>
                    <Button variant="secondary" onClick={() => navigate(`${base}/shipments/${s.id}/edit`)}><Pencil className="size-4" /> Edit</Button>
                    <Button variant="danger" onClick={() => setCancelOpen(true)}><XCircle className="size-4" /> Batalkan</Button>
                  </>
                )}
              </>
            )}
          />

          {user.role === 'driver' && open && <DriverStatusActions shipment={s} onChanged={reload} className="mb-5" />}

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <Card>
                <CardBody>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-lg font-extrabold text-ink-900">
                      {s.origin.city}<ArrowRight className="size-5 text-ink-400" aria-hidden />{s.destination.city}
                    </p>
                    <StatusBadge status={s.status} />
                  </div>
                  <JourneyProgress shipment={s} />
                </CardBody>
              </Card>

              <div>
                {selectedTrip && (
                  <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-route-200 bg-route-50 px-3 py-2 text-sm">
                    <span>
                      <strong>Fokus peta:</strong> {selectedTrip.tripCode || selectedTrip.id} · {selectedTrip.origin} → {selectedTrip.destination}
                    </span>
                    <button type="button" className="font-semibold text-route-700 hover:underline" onClick={() => setSelectedTripId(null)}>
                      Tampilkan seluruh pengiriman
                    </button>
                  </div>
                )}
                <TrackingMap
                  markers={mapMarkers} fitKey={`${s.id}-${selectedTripId || 'overall'}`} height={340}
                  plan={mapPlan}
                  route={selectedTrip ? tripRoute : (s.history || []).map((h) => [h.lat, h.lng, h.source === 'admin_manual' ? 'manual' : undefined])}
                />
                {USE_MOCK && (
                  <p className="mt-2 text-xs text-ink-500">
                    {selectedTrip
                      ? (selectedRealEvent
                        ? `Posisi terakhir trip berasal dari ${selectedRealEvent.source || 'pembaruan manual'}; peta mengikuti data trip yang dipilih.`
                        : 'Belum ada koordinat aktual untuk trip ini. Peta menampilkan rute asal–tujuan trip, bukan posisi GPS realtime.')
                      : (getRealPosition(s)
                        ? `Posisi terakhir pengiriman berasal dari ${POSITION_SOURCE_LABEL[getRealPosition(s).source]}.`
                        : 'Peta utama menampilkan progres keseluruhan secara simulasi; posisi GPS nyata hanya tersedia bila ada pembaruan lokasi.')}
                  </p>
                )}
              </div>

              <Card>
                <CardHeader title="Riwayat status" />
                <CardBody><Timeline history={s.history || []} /></CardBody>
              </Card>
            </div>

            <div className="space-y-5">
              <Card>
                <CardHeader title={`Trip terkait (${linkedTrips.length})`} />
                <CardBody>
                  {linkedTrips.length ? (
                    <div className="space-y-2">
                      {linkedTrips.map((trip, index) => (
                        <div
                          key={trip.id}
                          className={`flex items-center justify-between gap-3 rounded-lg p-3 ring-1 ${selectedTripId === trip.id ? 'bg-route-50 ring-route-300' : 'bg-ink-50 ring-transparent'}`}
                        >
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            aria-pressed={selectedTripId === trip.id}
                            onClick={() => setSelectedTripId(trip.id)}
                          >
                            <p className="text-xs text-ink-500">Trip {index + 1} · klik untuk lihat peta</p>
                            <p className="font-semibold text-ink-900">{trip.tripCode || trip.id}</p>
                            <p className="text-sm text-ink-600">{trip.origin} → {trip.destination}</p>
                          </button>
                          <Link className="shrink-0 text-sm font-semibold text-route-700 hover:underline" to={`${base}/trips/${trip.id}`}>
                            Detail
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-500">Belum ada trip. Buat trip di Manajemen Trip, lalu pilih AWB ini untuk menghubungkannya.</p>
                  )}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Informasi barang" />
                <CardBody>
                  <dl className="divide-y divide-ink-100">
                    <Row label="Berat">{formatWeight(s.weightKg)}</Row>
                    <Row label="Estimasi tiba">{formatDateTime(s.eta)}{s.etaSource === 'trip_schedule' && <span className="ml-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Otomatis dari jadwal trip</span>}</Row>
                    <Row label="Catatan">{s.notes}</Row>
                  </dl>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Armada" />
                <CardBody>
                  <dl className="divide-y divide-ink-100">
                    <Row label="Driver">{s.driverName ?? 'Belum ditugaskan'}</Row>
                    <Row label="Kendaraan">{s.vehiclePlate}</Row>
                  </dl>
                  {user.role !== 'customer' && user.role !== 'driver' && (
                    <Link to={`${base}/tracking`} className="mt-3 inline-block text-sm font-semibold text-route-700 hover:underline">Buka monitoring tracking</Link>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>

          <ConfirmDialog
            open={cancelOpen} danger loading={busy} title="Batalkan pengiriman?" confirmLabel="Ya, batalkan"
            message={`Pengiriman ${s.trackingNumber} akan ditandai dibatalkan. Tindakan ini tidak dapat diurungkan.`}
            onConfirm={cancel} onCancel={() => setCancelOpen(false)}
          />
        </>
      )}
    </AsyncBoundary>
  )
}
