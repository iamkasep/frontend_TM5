import { useMemo, useState } from 'react'
import { Camera, MapPin, RefreshCw, Search, PackageCheck, CalendarClock, UserRound, ExternalLink, ImageOff } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import { AsyncBoundary } from '@/components/ui/States'
import { useAsync } from '@/hooks/useAsync'
import { podService } from '@/services/podService'
import { USE_MOCK } from '@/services/api'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('id-ID')
}

export default function ProofOfDeliveryPage() {
  const { data, loading, error, reload } = useAsync(() => podService.list(), [])
  const proofs = useMemo(() => data || [], [data])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return proofs
    return proofs.filter((item) =>
      [item.awb, item.shipmentId, item.driverName, item.driverId, item.id]
        .some((value) => String(value ?? '').toLowerCase().includes(q)),
    )
  }, [proofs, query])

  const selected = useMemo(
    () => (selectedId ? proofs.find((item) => item.id === selectedId) || null : null),
    [proofs, selectedId],
  )

  return (
    <AsyncBoundary loading={loading} error={error} onRetry={reload}>
      <div className="space-y-6">
        <PageHeader
          title="Bukti Serah Terima"
          description={USE_MOCK ? 'Lihat foto bukti pengiriman yang disimpan oleh driver pada browser ini.' : 'Daftar foto bukti serah terima pengiriman dari driver.'}
          actions={<Button variant="secondary" onClick={reload}><RefreshCw className="size-4" /> Muat ulang</Button>}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3 text-slate-500">
              <PackageCheck className="size-5" />
              <span className="text-sm">Total bukti tersimpan</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{proofs.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3 text-slate-500">
              <Camera className="size-5" />
              <span className="text-sm">Bukti dengan foto</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{proofs.filter((item) => item.imageDataUrl).length}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-3 text-amber-800">
              <MapPin className="size-5" />
              <span className="text-sm">Catatan penyimpanan</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              {USE_MOCK ? 'Data demo tersimpan di localStorage browser ini, bukan server pusat.' : 'Data bukti serah terima diambil langsung dari server.'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Daftar bukti</h2>
              <p className="mt-1 text-sm text-slate-500">Cari berdasarkan AWB, pengiriman, atau nama driver.</p>
            </div>
            <label className="relative block sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari AWB atau driver..."
                className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center">
              <ImageOff className="mx-auto size-9 text-slate-400" />
              <h3 className="mt-3 font-semibold text-slate-800">
                {proofs.length ? 'Bukti tidak ditemukan' : 'Belum ada bukti serah terima'}
              </h3>
              <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">
                {proofs.length ? 'Coba kata kunci lain.' : 'Selesaikan pengiriman dari akun driver dengan mengambil foto dan menyimpan bukti. Setelah itu tekan Muat ulang.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Foto</th>
                    <th className="px-3 py-3">Pengiriman / AWB</th>
                    <th className="px-3 py-3">Driver</th>
                    <th className="px-3 py-3">Waktu submit</th>
                    <th className="px-3 py-3">Lokasi GPS</th>
                    <th className="px-3 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id || `${item.shipmentId}-${item.submittedAt}`} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-3">
                        {item.imageDataUrl ? (
                          <img src={item.imageDataUrl} alt={`Bukti ${item.awb || item.shipmentId}`} className="size-16 rounded-lg border border-slate-200 object-cover" />
                        ) : (
                          <div className="grid size-16 place-items-center rounded-lg bg-slate-100">
                            <ImageOff className="size-5 text-slate-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-900">{item.awb || 'AWB belum tersedia'}</p>
                        <p className="mt-1 text-xs text-slate-500">ID: {item.shipmentId || '—'}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <UserRound className="size-4 text-slate-400" />
                          <span>{item.driverName || '—'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 text-slate-600">
                          <CalendarClock className="size-4 shrink-0" />
                          <span>{formatDate(item.submittedAt)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {Number.isFinite(item.latitude) && Number.isFinite(item.longitude) ? (
                          <a
                            className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                            href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)} <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">Tidak tersedia</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedId(item.id)}>
                          Lihat detail
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Detail bukti serah terima"
            onClick={() => setSelectedId(null)}
          >
            <div
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-slate-200 p-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Detail bukti serah terima</h2>
                  <p className="mt-1 text-sm text-slate-500">{selected.awb || selected.shipmentId || selected.id}</p>
                </div>
                <button type="button" className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100" onClick={() => setSelectedId(null)}>
                  Tutup
                </button>
              </div>
              <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)]">
                <div>
                  {selected.imageDataUrl ? (
                    <img src={selected.imageDataUrl} alt="Foto bukti serah terima lengkap" className="max-h-[60vh] w-full rounded-xl border border-slate-200 bg-slate-50 object-contain" />
                  ) : (
                    <p className="rounded-xl bg-slate-100 p-8 text-center text-slate-500">Foto tidak tersedia.</p>
                  )}
                </div>
                <div className="space-y-4 text-sm">
                  <div><p className="text-slate-500">Nomor AWB</p><p className="mt-1 font-semibold text-slate-900">{selected.awb || '—'}</p></div>
                  <div><p className="text-slate-500">ID pengiriman</p><p className="mt-1 font-semibold text-slate-900">{selected.shipmentId || '—'}</p></div>
                  <div><p className="text-slate-500">Driver</p><p className="mt-1 font-semibold text-slate-900">{selected.driverName || '—'}</p></div>
                  <div><p className="text-slate-500">Waktu foto</p><p className="mt-1 font-medium text-slate-900">{formatDate(selected.capturedAt)}</p></div>
                  <div><p className="text-slate-500">Waktu submit</p><p className="mt-1 font-medium text-slate-900">{formatDate(selected.submittedAt)}</p></div>
                  <div>
                    <p className="text-slate-500">Koordinat</p>
                    <p className="mt-1 font-medium text-slate-900">
                      {Number.isFinite(selected.latitude) && Number.isFinite(selected.longitude) ? `${selected.latitude}, ${selected.longitude}` : 'Tidak tersedia'}
                    </p>
                    {Number.isFinite(selected.latitude) && Number.isFinite(selected.longitude) && (
                      <p className="mt-1 text-xs text-slate-500">
                        Akurasi ±{Math.round(selected.accuracy || 0)} m ·{' '}
                        <a className="text-blue-700 underline" href={`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`} target="_blank" rel="noreferrer">
                          Buka peta
                        </a>
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-slate-500">Ukuran foto</p>
                    <p className="mt-1 font-medium text-slate-900">
                      {Math.round((selected.originalBytes || 0) / 1024)} KB → {Math.round((selected.compressedBytes || 0) / 1024)} KB
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Status bukti</p>
                    <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {selected.status || 'Tersimpan lokal'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AsyncBoundary>
  )
}
