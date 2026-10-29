import { LocateFixed, LocateOff } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useGps } from '@/hooks/useGps'

const PERM = {
  unknown: { label: 'Belum diperiksa', tone: 'slate' },
  prompt: { label: 'Izin belum diberikan', tone: 'amber' },
  granted: { label: 'Izin lokasi aktif', tone: 'green' },
  denied: { label: 'Izin lokasi ditolak', tone: 'red' },
  unsupported: { label: 'Perangkat tidak mendukung GPS', tone: 'red' },
}

/**
 * Antarmuka izin GPS. Status dibagikan dengan halaman Navigasi lewat useGps(),
 * jadi pelacakan yang dimulai di sini tetap berjalan saat driver pindah menu.
 * Posisi TIDAK dikirim ke server: pelaporan lokasi menunggu spesifikasi backend.
 */
export default function GpsStatusCard() {
  const { tracking, wakeLockActive, position, error, permission, start, stop } = useGps()
  const p = PERM[permission] ?? PERM.unknown
  const searching = tracking && !position

  return (
    <Card>
      <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-600">
          {permission === 'denied' || permission === 'unsupported' ? <LocateOff className="size-5" /> : <LocateFixed className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-ink-900">Status lokasi perangkat</h2>
            <Badge tone={p.tone}>{p.label}</Badge>
            {tracking && <Badge tone={position ? 'green' : 'amber'}>{position ? 'Pelacakan aktif' : 'Mencari sinyal GPS…'}</Badge>}
            {tracking && wakeLockActive && <Badge tone="blue">Layar terjaga</Badge>}
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {position
              ? `Terbaca di perangkat ini: ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)} (akurasi ±${Math.round(position.accuracy)} m). `
              : ''}
            Bila internet terputus, koordinat terakhir dikirim otomatis ke admin sebagai notifikasi untuk pemantauan perjalanan.
          </p>
          {error && <p className="mt-1 text-sm text-rose-600" role="alert">{error}</p>}
        </div>
        {permission !== 'unsupported' && (
          tracking ? (
            <Button variant="secondary" onClick={stop}>Hentikan GPS</Button>
          ) : (
            <Button variant="secondary" onClick={start} loading={searching}>
              {permission === 'granted' ? 'Mulai pelacakan' : 'Aktifkan lokasi'}
            </Button>
          )
        )}
      </CardBody>
    </Card>
  )
}
