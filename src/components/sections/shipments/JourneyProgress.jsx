import { getProgress, getRealPosition, getRemainingKm, POSITION_SOURCE_LABEL } from '@/lib/geo'
import { formatDateTime } from '@/lib/formatters'

const formatKm = (km) => `${km < 10 ? km.toFixed(1) : Math.round(km)}`.replace('.', ',') + ' km'

/**
 * Progres perjalanan berdasarkan kedekatan posisi dengan titik tujuan.
 * `livePoint` (opsional) = posisi GPS perangkat saat ini, mis. di halaman driver.
 */
export default function JourneyProgress({ shipment: s, livePoint = null }) {
  const pct = Math.round(getProgress(s, livePoint) * 100)
  const remaining = getRemainingKm(s, livePoint)
  const real = getRealPosition(s)
  const delivered = s.status === 'delivered'

  const basis = livePoint
    ? 'Dihitung dari jarak GPS perangkat ini ke tujuan (real-time).'
    : real
      ? `Dihitung dari jarak ke tujuan berdasarkan ${POSITION_SOURCE_LABEL[real.source]} pukul ${formatDateTime(real.at)}.`
      : 'Progres dihitung berdasarkan tahapan status pengiriman terakhir.'

  return (
    <div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progres perjalanan">
        <div className="h-full rounded-full bg-route-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-ink-500" data-testid="journey-progress">
        Progres perjalanan {pct}%{remaining !== null && !delivered ? ` · sisa ±${formatKm(remaining)} ke tujuan` : ''}
      </p>
      {basis && <p className="text-xs text-ink-400">{basis}</p>}
      {!delivered && remaining !== null && remaining < 1 && (
        <p className="mt-1 text-xs font-semibold text-emerald-700">Kendaraan sudah berada di sekitar lokasi tujuan.</p>
      )}
    </div>
  )
}
