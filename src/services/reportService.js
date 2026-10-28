import { api, ENDPOINTS, USE_MOCK } from './api'
import { notificationStore } from './systemService'
import { shipmentService } from './shipmentService'
import { distanceKm } from '@/lib/geo'
import { SMS_FORMAT_HINT, buildGpsSms, parseGpsSms } from '@/lib/sms'

/**
 * Laporan otomatis dari perangkat driver ke admin.
 *
 * Cara kerja:
 * - Mode simulasi: "server" adalah localStorage browser ini, jadi laporan langsung menjadi
 *   notifikasi yang terlihat di akun admin.
 * - Mode API: laporan dikirim lewat POST ENDPOINTS.driverReports. Bila perangkat offline atau
 *   permintaan gagal, laporan masuk ANTREAN di perangkat dan dikirim ulang otomatis saat internet
 *   kembali (flush). Internet yang benar-benar mati tidak bisa mengirim apa pun; jalur yang tetap
 *   bekerja tanpa internet hanya SMS.
 * - Pada mode API, notifikasi untuk perubahan status pengiriman dibuat backend saat menerima
 *   PATCH /shipments/:id/status, jadi frontend tidak mengirim laporan status ganda.
 */

const OUTBOX_KEY = 'tms_driver_outbox_v1'
const OUTBOX_EVENT = 'tms:outbox-change'
const ADMIN_ROLES = ['admin', 'superadmin']
const TRAIL_MAX = 20
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // posisi lebih tua dari 24 jam tidak berguna lagi
const MAX_ITEMS = 100

const nowIso = () => new Date().toISOString()
const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)
const nameOf = (r) => r.driver?.name || 'Driver'

/* ------------------------------ antrean di perangkat ------------------------------ */

function readOutbox() {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY)) || [] } catch { return [] }
}
function writeOutbox(items) {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(items)) } catch { /* storage penuh */ }
  window.dispatchEvent(new CustomEvent(OUTBOX_EVENT))
}
const removeFromOutbox = (id) => writeOutbox(readOutbox().filter((i) => i.id !== id))

export const getOutboxCount = () => readOutbox().length
export function subscribeOutbox(callback) {
  window.addEventListener(OUTBOX_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(OUTBOX_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

const pointOf = (r) => ({ lat: r.position.lat, lng: r.position.lng, accuracy: r.position.accuracy ?? null, at: r.capturedAt })
function mergeTrail(trail = [], point) {
  if (!point || trail.some((p) => p.at === point.at)) return trail.slice(-TRAIL_MAX)
  return [...trail, point].slice(-TRAIL_MAX)
}

/** Posisi untuk episode offline yang sama digabung (hanya yang terbaru dikirim, jejaknya ikut). */
function enqueue(report) {
  const items = readOutbox().filter((i) => Date.now() - i.queuedAt < MAX_AGE_MS)
  const isPosition = report.type === 'offline_position'
  const same = isPosition ? items.findIndex((i) => i.report.type === report.type && i.report.clientId === report.clientId) : -1
  if (same >= 0) {
    const prev = items[same].report
    items[same] = { ...items[same], report: { ...report, trail: mergeTrail(prev.trail, pointOf(report)) } }
  } else {
    items.push({ id: uid(), queuedAt: Date.now(), attempts: 0, report: isPosition ? { ...report, trail: mergeTrail([], pointOf(report)) } : report })
  }
  writeOutbox(items.slice(-MAX_ITEMS))
}

let flushing = false
/** Kirim ulang antrean (berurutan). Dipanggil saat internet kembali dan berkala. */
async function flush() {
  if (USE_MOCK || flushing || !navigator.onLine) return
  flushing = true
  try {
    for (const item of readOutbox()) {
      if (Date.now() - item.queuedAt > MAX_AGE_MS) { removeFromOutbox(item.id); continue }
      try {
        await api.post(ENDPOINTS.driverReports, { ...item.report, queuedAt: new Date(item.queuedAt).toISOString(), sentAt: nowIso() })
        removeFromOutbox(item.id)
      } catch {
        writeOutbox(readOutbox().map((i) => (i.id === item.id ? { ...i, attempts: i.attempts + 1 } : i)))
        break // jaga urutan: coba lagi nanti
      }
    }
  } finally {
    flushing = false
  }
}

/* ------------------------------ notifikasi (mode simulasi) ------------------------------ */

const refText = (r) => (r.shipment?.trackingNumber ? `Pengiriman ${r.shipment.trackingNumber}. ` : '')
const refFields = (r) => ({
  driverId: r.driver?.id ?? null,
  driverName: nameOf(r),
  shipmentId: r.shipment?.id ?? null,
  trackingNumber: r.shipment?.trackingNumber ?? null,
})

function buildOfflinePosition(r, prev) {
  const trail = mergeTrail(prev?.trail, pointOf(r))
  return {
    ...prev,
    clientId: r.clientId,
    type: 'offline_position',
    severity: 'warning',
    roles: ADMIN_ROLES,
    title: `${nameOf(r)} kehilangan koneksi internet`,
    body: `${refText(r)}Koordinat GPS terakhir dikirim otomatis dari perangkat driver.`,
    at: prev?.at ?? r.startedAt ?? r.capturedAt,
    updatedAt: r.capturedAt,
    receivedAt: nowIso(),
    read: prev?.read ?? false,
    ...refFields(r),
    position: r.position,
    capturedAt: r.capturedAt,
    // Teks yang sama dengan SMS cadangan, supaya satu catatan memuat koordinat sekaligus pesan SMS-nya.
    smsText: buildGpsSms({ trackingNumber: r.shipment?.trackingNumber, position: r.position, fixedAt: new Date(r.capturedAt) }),
    offlineSince: prev?.offlineSince ?? r.startedAt ?? r.capturedAt,
    restoredAt: prev?.restoredAt ?? null,
    trail,
    updates: trail.length,
  }
}

function applyToMockStore(r) {
  switch (r.type) {
    case 'offline_position':
      notificationStore.upsert(r.clientId, (prev) => buildOfflinePosition(r, prev))
      break
    case 'connection_restored': {
      const minutes = Math.max(1, Math.round((new Date(r.restoredAt) - new Date(r.startedAt)) / 60000))
      notificationStore.upsert(r.clientId, (prev) => (prev
        ? { ...prev, restoredAt: r.restoredAt, offlineMinutes: minutes, updatedAt: r.restoredAt }
        : {
          clientId: r.clientId,
          type: 'connection_lost',
          severity: 'warning',
          title: `${nameOf(r)} sempat kehilangan koneksi internet`,
          body: `${refText(r)}Offline sekitar ${minutes} menit. Posisi tidak terbaca karena GPS belum aktif di perangkat driver.`,
          at: r.startedAt,
          updatedAt: r.restoredAt,
          receivedAt: nowIso(),
          offlineSince: r.startedAt,
          restoredAt: r.restoredAt,
          offlineMinutes: minutes,
          ...refFields(r),
        }))
      break
    }
    case 'status_update': {
      const delayed = r.status === 'delayed'
      const title = {
        picked_up: `${nameOf(r)} menjemput barang`,
        in_transit: `${nameOf(r)} memulai perjalanan`,
        delivered: `${nameOf(r)} menandai pengiriman terkirim`,
        delayed: `${nameOf(r)} melaporkan keterlambatan`,
      }[r.status] ?? `${nameOf(r)} memperbarui status pengiriman`
      notificationStore.add({
        type: delayed ? 'delay_report' : 'status_update',
        severity: delayed ? 'warning' : r.status === 'delivered' ? 'success' : 'info',
        title,
        body: `${refText(r)}${r.position ? 'Posisi GPS driver saat laporan dikirim ikut dilampirkan.' : 'Posisi GPS tidak tersedia saat laporan dikirim.'}`,
        at: r.at,
        receivedAt: nowIso(),
        status: r.status,
        ...refFields(r),
        position: r.position ?? null,
        capturedAt: r.position ? r.at : null,
      })
      break
    }
    case 'gps_issue':
      notificationStore.add({
        type: 'gps_issue',
        severity: 'warning',
        title: `${nameOf(r)}: ${r.title}`,
        body: `${refText(r)}${r.message}`,
        at: r.at,
        receivedAt: nowIso(),
        ...refFields(r),
      })
      break
    default:
      break
  }
}

/* ------------------------------ pengiriman ------------------------------ */

async function deliver(report) {
  const payload = { ...report, sentAt: nowIso() }
  if (USE_MOCK) {
    applyToMockStore(payload)
    return { delivered: true }
  }
  if (!navigator.onLine) {
    enqueue(report)
    return { delivered: false, queued: true }
  }
  try {
    await api.post(ENDPOINTS.driverReports, payload)
    return { delivered: true }
  } catch {
    enqueue(report)
    return { delivered: false, queued: true }
  }
}

/**
 * Memasukkan isi SMS format TMS (yang diterima admin/gateway) ke daftar notifikasi.
 * - Cocok dengan laporan otomatis yang sudah ada (resi sama, titik <150 m, selisih waktu <15 menit)
 *   -> laporan itu ditandai "SMS diterima", tidak dibuat dobel.
 * - SMS yang sama tidak bisa dimasukkan dua kali.
 * Mode API: backend yang membaca SMS dari gateway (webhook), memvalidasi nomor pengirim, lalu menyimpan ke
 * database. ASUMSI SEMENTARA: POST /driver-reports/sms { text } untuk input manual dari admin.
 * Mengembalikan { status: 'created' | 'merged' | 'duplicate' }.
 */
async function importSms(text) {
  const parsed = parseGpsSms(text)
  if (!parsed) throw new Error(`Format SMS tidak dikenali. Format yang benar: ${SMS_FORMAT_HINT}`)
  if (!USE_MOCK) {
    const { data } = await api.post(`${ENDPOINTS.driverReports}/sms`, { text: String(text).trim() })
    return { status: data?.status ?? 'created' }
  }

  const clientId = `sms:${parsed.trackingNumber ?? '-'}:${parsed.fixedAt}:${parsed.lat.toFixed(6)},${parsed.lng.toFixed(6)}`
  const all = notificationStore.all()
  if (all.some((n) => n.clientId === clientId || n.smsClientId === clientId)) return { status: 'duplicate' }

  const near = (p) => distanceKm(p, parsed) < 0.15 && Math.abs(new Date(p.at) - new Date(parsed.fixedAt)) < 15 * 60000
  const match = parsed.trackingNumber && all.find((n) => n.type === 'offline_position' && n.trackingNumber === parsed.trackingNumber && (n.trail ?? []).some(near))
  if (match) {
    notificationStore.patch(match.id, { smsConfirmedAt: nowIso(), smsText: parsed.raw, smsClientId: clientId })
    return { status: 'merged' }
  }

  const shipment = parsed.trackingNumber ? await shipmentService.findByTrackingNumber(parsed.trackingNumber, { role: 'admin' }).catch(() => null) : null
  notificationStore.add({
    clientId,
    type: 'sms_position',
    severity: 'info',
    title: shipment ? `${shipment.driverName ?? 'Driver'} mengirim posisi lewat SMS` : 'Posisi diterima lewat SMS',
    body: shipment
      ? `Pengiriman ${shipment.trackingNumber}. Pesan SMS format TMS dibaca otomatis menjadi koordinat.`
      : `${parsed.trackingNumber ? `Resi ${parsed.trackingNumber} tidak ditemukan.` : 'Pesan tidak mencantumkan resi.'} Koordinat tetap tercatat; hubungkan ke pengiriman secara manual.`,
    at: nowIso(),
    receivedAt: nowIso(),
    driverId: shipment?.driverId ?? null,
    driverName: shipment?.driverName ?? null,
    shipmentId: shipment?.id ?? null,
    trackingNumber: shipment?.trackingNumber ?? parsed.trackingNumber,
    position: { lat: parsed.lat, lng: parsed.lng, accuracy: parsed.accuracy },
    capturedAt: parsed.fixedAt,
    smsText: parsed.raw,
  })
  return { status: 'created' }
}

/** Laporan tidak boleh merusak alur driver: semua kegagalan ditelan. */
const safe = (fn) => async (...args) => {
  try { return await fn(...args) } catch { return { delivered: false } }
}

export const reportService = {
  newEpisodeId: uid,

  /** Koordinat terakhir saat internet driver terputus. `episodeId` yang sama = satu notifikasi yang diperbarui. */
  offlinePosition: safe(({ episodeId, driver, shipment, position, capturedAt, startedAt }) => deliver({
    type: 'offline_position', clientId: episodeId, driver, shipment, position, capturedAt, startedAt,
  })),

  /** Internet kembali. Menutup episode offline (atau melaporkan putus tanpa posisi). */
  connectionRestored: safe(({ episodeId, driver, shipment, startedAt, restoredAt, hadPosition }) => deliver({
    type: 'connection_restored', clientId: episodeId, driver, shipment, startedAt, restoredAt, hadPosition,
  })),

  /** Driver mengubah status pengiriman (jemput, berangkat, terkirim, terlambat). */
  driverStatus: safe(async ({ driver, shipment, status, position }) => {
    if (!USE_MOCK) return { delivered: false, skipped: true } // dibuat backend dari PATCH status
    return deliver({ type: 'status_update', driver, shipment, status, position, at: nowIso() })
  }),

  /** Izin lokasi ditolak atau sinyal GPS hilang cukup lama. */
  gpsIssue: safe(({ driver, shipment, title, message }) => deliver({
    type: 'gps_issue', driver, shipment, title, message, at: nowIso(),
  })),

  /** Dipakai admin: tempel isi SMS dari driver. Melempar error bila format salah (untuk ditampilkan). */
  importSms,

  flush: safe(flush),
}
