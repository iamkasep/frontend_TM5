import { useMemo } from 'react'
import { ExternalLink, LocateFixed, LocateOff, MapPin, Radio, RefreshCw } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { AsyncBoundary, EmptyState } from '@/components/ui/States'
import TrackingMap from '@/components/sections/tracking/TrackingMap'
import SmsFallbackCard from '@/components/sections/tracking/SmsFallbackCard'
import DriverStatusActions from '@/components/sections/shipments/DriverStatusActions'
import JourneyProgress from '@/components/sections/shipments/JourneyProgress'
import { useShipments } from '@/hooks/useShipments'
import { ACTIVE_STATUSES } from '@/lib/constants'
import { getCurrentPosition } from '@/lib/geo'
import { useGps } from '@/hooks/useGps'

const fmt = (value, digits = 6) => Number(value).toFixed(digits)

export default function DriverNavigation() {
  const { data, loading, error, reload } = useShipments()
  const { tracking, wakeLockActive, position, lastUpdated, error: gpsError, start: startGps, stop: stopGps } = useGps()

  const active = (data ?? []).filter((s) => ACTIVE_STATUSES.includes(s.status))
  const s = active.find((x) => x.status === 'in_transit') ?? active[0]

  const markers = useMemo(() => {
    if (!s) return []
    const result = [
      { id: 'o', kind: 'origin', position: [s.origin.lat, s.origin.lng], label: `Asal: ${s.origin.city}` },
      { id: 'd', kind: 'destination', position: [s.destination.lat, s.destination.lng], label: `Tujuan: ${s.destination.city}` },
    ]
    if (position) {
      result.push({
        id: 'gps-current',
        kind: 'vehicle',
        position: [position.lat, position.lng],
        label: `Posisi GPS perangkat saat ini (akurasi ±${Math.round(position.accuracy)} m)`,
      })
    } else {
      const simulated = getCurrentPosition(s)
      result.push({ id: 'v', kind: 'vehicle', position: simulated, label: 'Posisi kendaraan terakhir' })
    }
    return result
  }, [s, position])

  return (
    <>
      <PageHeader title="Navigasi dan Tracking" description="Lihat posisi GPS perangkat Anda secara real-time dan bandingkan dengan tujuan pengiriman." />
      <div className="space-y-4">
        <Card>
          <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-700">
              {tracking ? <Radio className="size-6" /> : gpsError ? <LocateOff className="size-6" /> : <LocateFixed className="size-6" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-ink-900">Posisi GPS perangkat</h2>
                <Badge tone={gpsError ? 'red' : tracking && position ? 'green' : 'amber'}>
                  {gpsError ? 'GPS bermasalah' : tracking && position ? 'GPS real-time aktif' : tracking ? 'Mencari sinyal GPS…' : 'GPS belum aktif'}
                </Badge>
                {tracking && wakeLockActive && (
                  <Badge tone="blue">Layar terjaga tetap menyala</Badge>
                )}
              </div>
              {position ? (
                <div className="mt-1 space-y-1 text-sm text-ink-600">
                  <p>Latitude: <span className="font-mono font-semibold">{fmt(position.lat)}</span> · Longitude: <span className="font-mono font-semibold">{fmt(position.lng)}</span></p>
                  <p>Akurasi ±{Math.round(position.accuracy)} meter{lastUpdated ? ` · Diperbarui ${lastUpdated.toLocaleTimeString('id-ID')}` : ''}</p>
                  <p className="text-xs text-ink-500">Pelacakan tetap aktif saat Anda membuka menu lain, menjaga layar perangkat tidak terkunci otomatis, dan langsung menyegarkan titik GPS saat layar dibuka kembali.</p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-ink-500">Aktifkan GPS untuk membaca lokasi perangkat Anda saat ini. Browser akan meminta izin lokasi.</p>
              )}
              {gpsError && <p role="alert" className="mt-2 text-sm text-rose-600">{gpsError}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {tracking ? (
                <Button variant="secondary" onClick={stopGps}>Hentikan GPS</Button>
              ) : (
                <Button onClick={startGps}>
                  {gpsError ? <RefreshCw className="size-4" /> : <LocateFixed className="size-4" />}
                  {gpsError ? 'Coba lagi' : 'Cek posisi real-time'}
                </Button>
              )}
              {position && (
                <Button variant="secondary" onClick={() => window.open(`https://www.google.com/maps?q=${position.lat},${position.lng}`, '_blank', 'noopener,noreferrer')}>
                  <MapPin className="size-4" /> Buka Maps
                </Button>
              )}
            </div>
          </CardBody>
        </Card>

        <SmsFallbackCard trackingNumber={s?.trackingNumber} />

        <AsyncBoundary loading={loading} error={error} onRetry={reload}>
          {!s ? (
            <Card><EmptyState title="Tidak ada pengiriman aktif" description="Peta akan muncul saat Anda memiliki tugas pengiriman." /></Card>
          ) : (
            <>
              <TrackingMap markers={markers} fitKey={s.id} height={380} />
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-base font-medium text-ink-900">{s.trackingNumber}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-1 text-sm text-ink-600">Tujuan: {s.destination.city}</p>
                  <JourneyProgress shipment={s} livePoint={position} />
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${s.destination.lat},${s.destination.lng}${position ? `&origin=${position.lat},${position.lng}` : ''}`}
                    target="_blank" rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-route-700 hover:underline"
                  >
                    Buka navigasi dari posisi saya <ExternalLink className="size-4" aria-hidden />
                  </a>
                  <DriverStatusActions shipment={s} onChanged={reload} className="mt-4" />
                </CardBody>
              </Card>
            </>
          )}
        </AsyncBoundary>
      </div>
    </>
  )
}
