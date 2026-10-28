import { useState } from 'react'
import { Check, Copy, LocateFixed, MessageSquareText, Radio, WifiOff } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useGps } from '@/hooks/useGps'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { SMS_GATEWAY_NUMBER, buildGpsSms, buildSmsHref } from '@/lib/sms'
import { mockNote } from '@/services/api'

/**
 * Cadangan saat internet putus: membuka aplikasi SMS dengan koordinat terbaru
 * sudah terisi. Driver tinggal menekan Kirim (browser tidak bisa mengirim SMS
 * otomatis). GPS tetap bisa membaca posisi tanpa internet.
 */
export default function SmsFallbackCard({ trackingNumber }) {
  const online = useOnlineStatus()
  const { tracking, position, lastUpdated, start } = useGps()
  const [manualOpen, setManualOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [opened, setOpened] = useState(false)

  if (online && !manualOpen) {
    return (
      <button type="button" onClick={() => setManualOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-route-700 hover:underline">
        <MessageSquareText className="size-4" aria-hidden /> Sinyal lemah? Kirim posisi lewat SMS
      </button>
    )
  }

  const message = position ? buildGpsSms({ trackingNumber, position, fixedAt: lastUpdated }) : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard tidak tersedia */ }
  }

  return (
    <Card className="ring-amber-300">
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <WifiOff className="size-5 text-amber-700" aria-hidden />
          <h2 className="text-sm font-bold text-ink-900">Kirim posisi lewat SMS</h2>
          <Badge tone={online ? 'slate' : 'amber'}>{online ? 'Mode manual' : 'Tidak ada koneksi internet'}</Badge>
          {online && (
            <button type="button" onClick={() => setManualOpen(false)} className="ml-auto text-xs font-semibold text-ink-500 hover:underline">Tutup</button>
          )}
        </div>

        {position ? (
          <>
            <p className="text-sm text-ink-600">
              Posisi terakhir dibaca pukul {lastUpdated?.toLocaleTimeString('id-ID')}. Tekan tombol di bawah, lalu tekan <strong>Kirim</strong> di aplikasi SMS.
            </p>
            <p className="break-all rounded-lg bg-ink-50 px-3 py-2 font-mono text-xs text-ink-800 ring-1 ring-inset ring-ink-200" data-testid="sms-preview">{message}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={buildSmsHref(message)}
                onClick={() => setOpened(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-route-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-route-700"
              >
                <MessageSquareText className="size-4" aria-hidden /> Buka aplikasi SMS
              </a>
              <Button variant="secondary" onClick={copy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Tersalin' : 'Salin pesan'}
              </Button>
            </div>
            {opened && <p className="text-xs text-ink-500">Aplikasi SMS dibuka. Pesan baru terkirim setelah Anda menekan Kirim.</p>}
          </>
        ) : (
          <>
            <p className="text-sm text-ink-600">
              {tracking ? 'Menunggu sinyal GPS… Pastikan Anda berada di area terbuka.' : 'GPS belum aktif. GPS tetap bekerja tanpa internet, aktifkan dulu untuk membaca koordinat.'}
            </p>
            {!tracking && <Button onClick={start}><LocateFixed className="size-4" /> Aktifkan GPS</Button>}
          </>
        )}

        {!online && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-inset ring-amber-200">
            <Radio className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>Koordinat terakhir Anda dikirim otomatis ke admin sebagai notifikasi{mockNote || ' begitu internet tersambung kembali'}. Untuk kabar segera tanpa internet, kirim lewat SMS.</span>
          </p>
        )}

        <p className="text-xs text-ink-500">
          {SMS_GATEWAY_NUMBER ? `Penerima: ${SMS_GATEWAY_NUMBER}.` : 'Nomor penerima belum diatur (VITE_SMS_GATEWAY_NUMBER), pilih sendiri di aplikasi SMS.'}
          {' '}Pada laptop/PC tombol SMS mungkin tidak berfungsi; gunakan Salin pesan.
        </p>
      </CardBody>
    </Card>
  )
}
