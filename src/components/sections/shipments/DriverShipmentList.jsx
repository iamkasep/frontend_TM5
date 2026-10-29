import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, ChevronRight, Building2, PackageSearch, Search, Weight, X } from 'lucide-react'
import { StatusBadge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { SHIPMENT_STATUS } from '@/lib/constants'
import { formatDateTime, formatWeight } from '@/lib/formatters'
import { cn } from '@/lib/utils'

/** Kelompok filter cepat (chip) agar driver cukup sekali ketuk, tanpa dropdown. */
const ACTIVE_CHIPS = [
  { key: 'all', label: 'Semua' },
  { key: 'loading', label: 'Pemuatan', statuses: ['assigned', 'picked_up'] },
  { key: 'in_transit', label: 'Perjalanan', statuses: ['in_transit'] },
  { key: 'delayed', label: 'Terlambat', statuses: ['delayed'] },
]
const HISTORY_CHIPS = [
  { key: 'all', label: 'Semua' },
  { key: 'delivered', label: 'Terkirim', statuses: ['delivered'] },
  { key: 'cancelled', label: 'Dibatalkan', statuses: ['cancelled'] },
]

const locationName = (point) => point?.name || point?.city || '—'

/** Kartu satu pengiriman: dioptimalkan untuk layar ponsel (tanpa scroll horizontal). */
function ShipmentCard({ shipment: s }) {
  const accent = SHIPMENT_STATUS[s.status]?.color || '#94a3b8'
  const finished = ['delivered', 'cancelled'].includes(s.status)
  const pct = Math.round(Math.min(1, Math.max(0, s.status === 'delivered' ? 1 : (s.progress ?? 0))) * 100)

  return (
    <li>
      <Link
        to={`/driver/shipments/${s.id}`}
        className="group relative block overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-ink-100 transition hover:shadow-md hover:ring-route-200 active:scale-[0.99]"
      >
        <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} aria-hidden />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">No. AWB</p>
            <p className="truncate font-mono text-[15px] font-semibold text-ink-900">{s.trackingNumber}</p>
          </div>
          <StatusBadge status={s.status} />
        </div>

        {/* Rute: asal → tujuan, ditumpuk vertikal agar nama lokasi panjang tetap terbaca */}
        <div className="mt-4 grid grid-cols-[16px_1fr] gap-x-3">
          <div className="flex flex-col items-center pt-1" aria-hidden>
            <span className="size-2.5 rounded-full bg-ink-800 ring-4 ring-ink-100" />
            <span className="my-1 w-px flex-1 border-l-2 border-dashed border-ink-200" />
            <span className="size-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
          </div>
          <div className="space-y-3">
            <div className="min-w-0">
              <p className="text-[11px] text-ink-400">Asal</p>
              <p className="truncate text-sm font-semibold text-ink-900">{locationName(s.origin)}</p>
              {s.origin?.name && s.origin?.city && <p className="truncate text-xs text-ink-500">{s.origin.city}</p>}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-ink-400">Tujuan</p>
              <p className="truncate text-sm font-semibold text-ink-900">{locationName(s.destination)}</p>
              {s.destination?.name && s.destination?.city && <p className="truncate text-xs text-ink-500">{s.destination.city}</p>}
            </div>
          </div>
        </div>

        {!finished && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] font-medium text-ink-500">
              <span>Progres perjalanan</span>
              <span className="tabular-nums text-ink-700">{pct}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-route-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-ink-100 pt-3 text-xs">
          <div className="flex min-w-0 items-center gap-1.5 text-ink-600">
            <Building2 className="size-3.5 shrink-0 text-ink-400" aria-hidden />
            <dt className="sr-only">Customer</dt>
            <dd className="truncate">{s.customerName || '—'}</dd>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-ink-600">
            <Weight className="size-3.5 shrink-0 text-ink-400" aria-hidden />
            <dt className="sr-only">Berat</dt>
            <dd className="truncate">{formatWeight(s.weightKg)}</dd>
          </div>
          <div className="col-span-2 flex min-w-0 items-center gap-1.5 text-ink-600">
            <CalendarClock className="size-3.5 shrink-0 text-ink-400" aria-hidden />
            <dt className="sr-only">Estimasi tiba</dt>
            <dd className="truncate">
              {finished ? 'Selesai' : 'Estimasi tiba'} · <span className="font-semibold text-ink-800">{formatDateTime(s.eta)}</span>
            </dd>
          </div>
        </dl>

        <div className="mt-3 flex items-center justify-end gap-1 text-sm font-semibold text-route-700">
          {finished ? 'Lihat detail' : 'Buka tugas'}
          <ChevronRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
        </div>
      </Link>
    </li>
  )
}

/**
 * Daftar pengiriman khusus driver: pencarian + chip filter + kartu vertikal.
 * mode: 'active' | 'history' | 'all'
 */
export default function DriverShipmentList({ rows, loading, error, onRetry, mode = 'active' }) {
  const [query, setQuery] = useState('')
  const [chip, setChip] = useState('all')
  const chips = mode === 'history' ? HISTORY_CHIPS : ACTIVE_CHIPS

  const counts = useMemo(() => {
    const out = {}
    chips.forEach((c) => {
      out[c.key] = c.statuses ? (rows || []).filter((s) => c.statuses.includes(s.status)).length : (rows || []).length
    })
    return out
  }, [rows, chips])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    const active = chips.find((c) => c.key === chip)
    return (rows || [])
      .filter((s) => !active?.statuses || active.statuses.includes(s.status))
      .filter((s) => !term || [s.trackingNumber, s.customerName, s.origin?.city, s.origin?.name, s.destination?.city, s.destination?.name]
        .some((v) => String(v ?? '').toLowerCase().includes(term)))
      .sort((a, b) => (mode === 'history'
        ? new Date(b.eta || 0) - new Date(a.eta || 0)
        : new Date(a.eta || 0) - new Date(b.eta || 0)))
  }, [rows, query, chip, chips, mode])

  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-20 -mx-4 space-y-3 bg-ink-50/95 px-4 pb-3 pt-1 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-none">
        <label className="relative block">
          <span className="sr-only">Cari pengiriman</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari AWB, customer, atau kota…"
            className="h-12 w-full rounded-xl bg-white pl-10 pr-10 text-[15px] shadow-sm ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-route-500"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-400 hover:bg-ink-100" aria-label="Hapus pencarian">
              <X className="size-4" />
            </button>
          )}
        </label>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0" role="tablist" aria-label="Filter status">
          {chips.map((c) => {
            const selected = chip === c.key
            return (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setChip(c.key)}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition',
                  selected ? 'bg-ink-900 text-white shadow-sm' : 'bg-white text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-50',
                )}
              >
                {c.label}
                <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', selected ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-500')}>
                  {counts[c.key] ?? 0}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <Loading label="Memuat pengiriman…" />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-ink-100">
          <EmptyState
            icon={PackageSearch}
            title={rows?.length ? 'Tidak ada yang cocok' : mode === 'history' ? 'Belum ada riwayat' : 'Belum ada tugas'}
            description={rows?.length
              ? 'Coba kata kunci lain atau pilih filter "Semua".'
              : mode === 'history'
                ? 'Pengiriman yang sudah selesai akan tersimpan di sini.'
                : 'Tugas baru akan muncul di sini setelah admin menugaskan pengiriman kepada Anda.'}
          />
        </div>
      ) : (
        <>
          <p className="text-xs font-medium text-ink-500">{visible.length} pengiriman</p>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((s) => <ShipmentCard key={s.id} shipment={s} />)}
          </ul>
        </>
      )}
    </div>
  )
}
