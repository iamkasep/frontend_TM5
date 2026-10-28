import { useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { SMS_FORMAT_HINT, parseGpsSms } from '@/lib/sms'
import { formatCoordinates } from '@/lib/notifications'
import { formatDateTime } from '@/lib/formatters'
import { mockNote } from '@/services/api'
import { reportService } from '@/services/reportService'

const MESSAGES = {
  created: 'Posisi dari SMS dimasukkan ke notifikasi',
  merged: 'SMS cocok dengan laporan otomatis driver dan ditandai "SMS diterima"',
}

/** Tempel isi SMS format TMS dari driver; dibaca otomatis menjadi koordinat dan masuk ke daftar notifikasi. */
export default function SmsImportCard({ onDone }) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const filled = text.trim() !== ''
  const parsed = filled ? parseGpsSms(text) : null

  const submit = async () => {
    setBusy(true)
    try {
      const { status } = await reportService.importSms(text)
      if (status === 'duplicate') {
        toast.error('SMS ini sudah pernah dimasukkan.')
      } else {
        toast.success(`${MESSAGES[status] ?? MESSAGES.created}${mockNote}`)
        setText('')
        onDone?.()
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mb-4">
      <CardBody className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200"><MessageSquareText className="size-[18px]" aria-hidden /></span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-ink-900">Impor SMS dari driver</h2>
            <p className="mt-0.5 text-sm text-ink-500">Tempel isi SMS yang masuk ke nomor penerima. Koordinatnya dibaca otomatis dan dicocokkan dengan laporan driver agar tidak dobel.</p>
          </div>
        </div>

        <div>
          <label htmlFor="sms-import" className="mb-1.5 block text-xs font-semibold text-ink-700">Isi SMS</label>
          <textarea
            id="sms-import" rows={2} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
            placeholder={SMS_FORMAT_HINT}
            className="w-full rounded-lg bg-white px-3 py-2 font-mono text-sm text-ink-900 ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-route-500"
          />
        </div>

        <div aria-live="polite" className="text-sm">
          {parsed && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800 ring-1 ring-inset ring-emerald-200">
              Terbaca: resi <strong>{parsed.trackingNumber ?? 'tidak ada'}</strong> · <span className="font-mono">{formatCoordinates(parsed)}</span>
              {parsed.accuracy != null ? ` · akurasi ±${Math.round(parsed.accuracy)} m` : ''} · dibaca {formatDateTime(parsed.fixedAt)}
            </p>
          )}
          {filled && !parsed && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700 ring-1 ring-inset ring-rose-200" role="alert">Format belum sesuai. Gunakan: {SMS_FORMAT_HINT}</p>
          )}
        </div>

        <Button onClick={submit} loading={busy} disabled={!parsed}>Masukkan ke notifikasi</Button>
      </CardBody>
    </Card>
  )
}
