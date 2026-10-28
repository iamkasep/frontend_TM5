import { SHIPMENT_STATUS } from '@/lib/constants'
import { formatDateTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'

/** Riwayat status, terbaru di atas. Garis vertikal menggambarkan jalur perjalanan. */
export default function Timeline({ history = [] }) {
  const items = [...history].reverse()
  if (!items.length) return <p className="text-sm text-ink-500">Belum ada riwayat status.</p>
  return (
    <ol className="relative">
      {items.map((h, i) => {
        const s = SHIPMENT_STATUS[h.status]
        const last = i === items.length - 1
        return (
          <li key={`${h.status}-${h.at}`} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && <span className="absolute left-[7px] top-4 h-full w-0.5 bg-ink-200" aria-hidden />}
            <span className={cn('relative mt-1 size-4 shrink-0 rounded-full ring-4 ring-white', s?.dot ?? 'bg-ink-300')} aria-hidden />
            <div className="min-w-0">
              <p className={cn('text-sm font-bold', i === 0 ? 'text-ink-900' : 'text-ink-700')}>{s?.label ?? h.status}</p>
              <p className="text-xs text-ink-500">{formatDateTime(h.at)} — {h.location}</p>
              {h.note && <p className="mt-0.5 text-sm text-ink-600">{h.note}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
