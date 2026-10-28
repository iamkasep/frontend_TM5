import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Check, Copy, LocateFixed, MessageSquareText, WifiOff, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useGps } from '@/hooks/useGps'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useShipments } from '@/hooks/useShipments'
import { ACTIVE_STATUSES } from '@/lib/constants'
import { buildGpsSms, buildSmsHref } from '@/lib/sms'
import { mockNote } from '@/services/api'

const GRACE_MS = 5000 // sama dengan agen laporan: putus sesaat diabaikan

function Banner() {
  const { pathname } = useLocation()
  const { position, lastUpdated, tracking, start } = useGps()
  const { data } = useShipments()
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [opened, setOpened] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), GRACE_MS)
    return () => clearTimeout(timer)
  }, [])

  // Halaman Navigasi sudah punya kartu SMS yang sama.
  if (!ready || dismissed || pathname.endsWith('/navigation')) return null

  const active = (data ?? []).filter((s) => ACTIVE_STATUSES.includes(s.status))
  const shipment = active.find((s) => s.status === 'in_transit') ?? active[0]
  const message = position ? buildGpsSms({ trackingNumber: shipment?.trackingNumber, position, fixedAt: lastUpdated }) : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard tidak tersedia */ }
  }

  return (
    <div role="status" className="mb-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-300">
      <div className="flex items-start gap-3">
        <WifiOff className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900">Internet terputus</p>
          <p className="mt-0.5 text-sm text-ink-700">
            {position
              ? `Koordinat Anda dikirim otomatis ke admin sebagai notifikasi${mockNote || ' begitu internet tersambung'}. Kirim juga lewat SMS agar admin menerimanya sekarang.`
              : 'Aktifkan GPS agar koordinat Anda bisa dikirim ke admin.'}
          </p>
          {position && (
            <p className="mt-2 break-all rounded-lg bg-white/70 px-3 py-2 font-mono text-xs text-ink-800 ring-1 ring-inset ring-amber-200">{message}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {position ? (
              <>
                <a
                  href={buildSmsHref(message)} onClick={() => setOpened(true)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-route-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-route-700"
                >
                  <MessageSquareText className="size-4" aria-hidden /> Kirim SMS sekarang
                </a>
                <Button variant="secondary" onClick={copy}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? 'Tersalin' : 'Salin pesan'}
                </Button>
              </>
            ) : (!tracking && <Button onClick={start}><LocateFixed className="size-4" /> Aktifkan GPS</Button>)}
          </div>
          {opened && <p className="mt-2 text-xs text-ink-600">Aplikasi SMS dibuka. Pesan baru terkirim setelah Anda menekan Kirim.</p>}
        </div>
        <button type="button" onClick={() => setDismissed(true)} className="-m-1 rounded-lg p-1 text-ink-500 hover:bg-amber-100" aria-label="Tutup">
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * Banner untuk driver saat internet terputus: SMS format TMS sudah terisi, tinggal satu ketukan.
 * Browser tidak boleh mengirim SMS diam-diam, jadi penekanan tombol Kirim tetap dilakukan driver.
 * Dipasang ulang (state bersih) setiap kali internet putus.
 */
export default function OfflineSmsBanner() {
  const online = useOnlineStatus()
  return online ? null : <Banner />
}
