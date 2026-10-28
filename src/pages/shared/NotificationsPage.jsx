import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, Copy, ExternalLink, MapPin, MapPinned, MessageSquareText, RefreshCw } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { AsyncBoundary, EmptyState } from '@/components/ui/States'
import SmsImportCard from '@/components/sections/notifications/SmsImportCard'
import { useToast } from '@/components/ui/Toast'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { NOTIFICATION_CATEGORIES, TONE_ICON, formatCoordinates, mapsUrl, notificationMeta } from '@/lib/notifications'
import { formatDateTime, formatRelative } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { USE_MOCK, mockNote } from '@/services/api'
import { shipmentService } from '@/services/shipmentService'
import { notificationService } from '@/services/systemService'

const time = (v) => (v ? new Date(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-')
const minutesBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000)

function PositionBlock({ n }) {
  const lag = n.receivedAt && n.capturedAt ? minutesBetween(n.capturedAt, n.receivedAt) : 0
  return (
    <div className="mt-2.5 rounded-xl bg-ink-50 px-3 py-2.5 ring-1 ring-inset ring-ink-200">
      <p className="flex items-center gap-1.5 font-mono text-sm font-semibold text-ink-900">
        <MapPin className="size-4 shrink-0 text-route-600" aria-hidden />
        <span className="break-all">{formatCoordinates(n.position)}</span>
      </p>
      <p className="mt-1 text-xs text-ink-500">
        {n.position.accuracy != null ? `Akurasi ±${Math.round(n.position.accuracy)} m · ` : ''}
        Posisi dibaca pukul {time(n.capturedAt)}
        {lag >= 2 ? ` · baru diterima ${lag} menit kemudian` : ''}
      </p>
      {n.type === 'offline_position' && (
        <p className="mt-0.5 text-xs text-ink-500">
          Offline sejak {time(n.offlineSince)}
          {n.updates > 1 ? ` · ${n.updates} pembaruan posisi` : ''}
          {n.restoredAt ? ` · online kembali pukul ${time(n.restoredAt)}` : ''}
        </p>
      )}
    </div>
  )
}

/** Pesan SMS format TMS dalam dropdown (tertutup secara default) agar kartu tidak penuh. */
function SmsMessage({ n }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(n.smsText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard tidak tersedia; teks bisa disalin manual */ }
  }
  return (
    <div className="mt-2">
      <button
        type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg py-1 text-xs font-semibold text-ink-600 hover:text-ink-900"
      >
        <MessageSquareText className="size-3.5" aria-hidden />
        Pesan SMS (format TMS){n.smsConfirmedAt ? ` · diterima pukul ${time(n.smsConfirmedAt)}` : ''}
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="mt-1 flex items-start gap-2 rounded-lg bg-ink-50 px-3 py-2 ring-1 ring-inset ring-ink-200">
          <p className="min-w-0 flex-1 break-all font-mono text-xs text-ink-800">{n.smsText}</p>
          <button type="button" onClick={copy} className="shrink-0 rounded-md p-1 text-ink-500 hover:bg-ink-100 hover:text-ink-800" aria-label="Salin pesan SMS">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      )}
    </div>
  )
}

/** Satu notifikasi berbentuk dropdown: tertutup hanya menampilkan judul, detail muncul saat dibuka. */
function NotificationItem({ n, base, copied, busy, onCopy, onApply, onRead }) {
  const [open, setOpen] = useState(false)
  const meta = notificationMeta(n)
  const Icon = meta.icon
  const canApply = (n.type === 'offline_position' || n.type === 'sms_position') && n.shipmentId && n.position
  const live = n.type === 'offline_position' && !n.restoredAt
  const panelId = `notif-${n.id}`
  return (
    <li className={cn(!n.read && 'bg-route-50/50')}>
      <button
        type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ink-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-route-500 sm:px-5"
      >
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset', TONE_ICON[meta.tone])}><Icon className="size-[18px]" aria-hidden /></span>
        {!n.read && <span className="size-2 shrink-0 rounded-full bg-route-500" role="img" aria-label="Belum dibaca" />}
        <span className={cn('min-w-0 flex-1 truncate text-sm text-ink-900', n.read ? 'font-semibold' : 'font-bold')}>{n.title}</span>
        <time dateTime={n.updatedAt ?? n.at} title={formatDateTime(n.updatedAt ?? n.at)} className="shrink-0 text-xs text-ink-400">{formatRelative(n.updatedAt ?? n.at)}</time>
        <ChevronDown className={cn('size-4 shrink-0 text-ink-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div id={panelId} className="px-4 pb-4 pl-[3.75rem] sm:px-5 sm:pl-[4.25rem]">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {n.type === 'offline_position' && <Badge tone={live ? 'red' : 'green'}>{live ? 'Masih offline' : 'Online kembali'}</Badge>}
            {n.type === 'connection_lost' && <Badge tone="green">Online kembali</Badge>}
            {n.smsConfirmedAt && <Badge tone="blue">SMS diterima</Badge>}
          </div>
          <p className="mt-2 text-sm text-ink-600">{n.body}</p>
          {n.position && <PositionBlock n={n} />}
          {n.smsText && <SmsMessage n={n} />}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {n.position && (
              <Button size="sm" variant="secondary" onClick={() => { window.open(mapsUrl(n.position), '_blank', 'noopener,noreferrer'); onRead(n) }}>
                <MapPin className="size-4" /> Buka Maps
              </Button>
            )}
            {n.position && (
              <Button size="sm" variant="secondary" onClick={() => onCopy(n)}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Tersalin' : 'Salin koordinat'}
              </Button>
            )}
            {canApply && (
              <Button size="sm" loading={busy} disabled={n.applied} onClick={() => onApply(n)}>
                <MapPinned className="size-4" /> {n.applied ? 'Sudah diterapkan' : 'Terapkan ke tracking'}
              </Button>
            )}
            {n.shipmentId && (
              <Link to={`${base}/shipments/${n.shipmentId}`} onClick={() => onRead(n)} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-route-700 hover:bg-route-50">
                Lihat pengiriman <ExternalLink className="size-3.5" aria-hidden />
              </Link>
            )}
            {!n.read && <button type="button" onClick={() => onRead(n)} className="ml-auto text-xs font-semibold text-ink-500 hover:underline">Tandai dibaca</button>}
          </div>
        </div>
      )}
    </li>
  )
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const base = `/${user.role}`
  const { data, loading, error, reload } = useAsync(() => notificationService.list(user.role), [user.role])
  const [category, setCategory] = useState('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [importOpen, setImportOpen] = useState(false)

  const all = data ?? []
  const unread = all.filter((n) => !n.read).length
  const counts = { all: all.length }
  all.forEach((n) => { const k = notificationMeta(n).category; counts[k] = (counts[k] ?? 0) + 1 })
  const shown = all.filter((n) => (category === 'all' || notificationMeta(n).category === category) && (!unreadOnly || !n.read))

  // Mode simulasi memuat ulang sendiri lewat event penyimpanan; mode API perlu dimuat ulang manual.
  const refresh = () => { if (!USE_MOCK) reload() }
  const markRead = async (n) => { if (!n.read) { await notificationService.markRead(n.id); refresh() } }
  const readAll = async () => { await notificationService.markAllRead(user.role); refresh() }

  const copy = async (n) => {
    try {
      await navigator.clipboard.writeText(formatCoordinates(n.position))
      setCopiedId(n.id)
      setTimeout(() => setCopiedId((c) => (c === n.id ? null : c)), 2000)
    } catch {
      toast.error('Tidak bisa menyalin otomatis. Salin koordinat dari teks di atas.')
    }
    markRead(n)
  }

  const apply = async (n) => {
    setBusyId(n.id)
    try {
      await shipmentService.update(n.shipmentId, { manualPosition: { lat: n.position.lat, lng: n.position.lng, note: '', source: n.type === 'sms_position' ? 'admin_manual' : 'driver_offline' } })
      await notificationService.update(n.id, { applied: true, read: true })
      toast.success(`Posisi diterapkan ke pelacakan ${n.trackingNumber ?? 'pengiriman'}${mockNote}`)
      refresh()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const emptyText = category !== 'all' || unreadOnly
    ? { title: 'Tidak ada notifikasi', description: 'Tidak ada yang cocok dengan filter saat ini.' }
    : { title: 'Belum ada notifikasi', description: 'Laporan dari driver (posisi saat offline, status pengiriman, keterlambatan, masalah GPS) akan muncul di sini secara otomatis.' }

  return (
    <>
      <PageHeader
        title="Notifikasi"
        description={unread ? `${unread} belum dibaca · laporan driver masuk otomatis` : 'Semua notifikasi sudah dibaca'}
        actions={(
          <>
            <Button variant="secondary" onClick={() => setImportOpen((v) => !v)} aria-expanded={importOpen}><MessageSquareText className="size-4" /> Impor SMS</Button>
            {!USE_MOCK && <Button variant="secondary" onClick={reload}><RefreshCw className="size-4" /> Muat ulang</Button>}
            <Button variant="secondary" onClick={readAll} disabled={!unread}>Tandai semua dibaca</Button>
          </>
        )}
      />

      {importOpen && <SmsImportCard onDone={refresh} />}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {NOTIFICATION_CATEGORIES.map((c) => {
          const active = category === c.value
          return (
            <button
              key={c.value} type="button" aria-pressed={active} onClick={() => setCategory(c.value)}
              className={cn('inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold ring-1 ring-inset transition-colors', active ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white text-ink-700 ring-ink-200 hover:bg-ink-50')}
            >
              {c.label}
              <span className={cn('rounded-md px-1.5 text-xs', active ? 'bg-white/15 text-white' : 'bg-ink-100 text-ink-600')}>{counts[c.value] ?? 0}</span>
            </button>
          )
        })}
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-ink-600">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} className="size-4 rounded accent-route-600" />
          Belum dibaca saja
        </label>
      </div>

      <Card>
        <AsyncBoundary loading={loading} error={error} onRetry={reload}>
          {shown.length === 0 ? <EmptyState title={emptyText.title} description={emptyText.description} /> : (
            <ul className="divide-y divide-ink-100">
              {shown.map((n) => (
                <NotificationItem
                  key={n.id} n={n} base={base}
                  copied={copiedId === n.id} busy={busyId === n.id}
                  onCopy={copy} onApply={apply} onRead={markRead}
                />
              ))}
            </ul>
          )}
        </AsyncBoundary>
      </Card>
    </>
  )
}
