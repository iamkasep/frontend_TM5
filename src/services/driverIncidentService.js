import { api, ENDPOINTS, USE_MOCK } from './api'
import { distanceKm } from '@/lib/geo'

/**
 * Posisi & event GPS dari perangkat driver.
 * - Mode simulasi: tersimpan di browser ini (bukan lintas perangkat).
 * - Mode API: posisi dikirim ke POST /driver-locations (ASUMSI SEMENTARA), antrean offline dikirim ulang saat online.
 */
const EVENTS_KEY = 'tms_driver_events_v1'
const LAST_POSITION_KEY = 'tms_driver_last_position_v1'
const QUEUE_KEY = 'tms_driver_location_queue_v1'
const EVENTS_CHANGED = 'tms-driver-events-updated'

/** Throttle: posisi baru disimpan/dikirim bila sudah lewat 15 detik ATAU berpindah ≥ 25 meter. */
const MIN_INTERVAL_MS = 15_000
const MIN_DISTANCE_KM = 0.025

function read(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback }
}
function write(key, value, { notify = true } = {}) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    // Event ini memicu muat ulang data di halaman (useAsync); jangan dikirim untuk update posisi rutin.
    if (notify) window.dispatchEvent(new CustomEvent(EVENTS_CHANGED))
  } catch { /* storage bisa penuh/diblokir */ }
}

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine

export function getLastDriverPosition() { return read(LAST_POSITION_KEY, null) }
export function getPendingLocations() { return read(QUEUE_KEY, []) }

export function addDriverEvent({ type, title, body, position, driverName = 'Driver', shipmentNumber = 'Belum ditentukan' }) {
  const events = read(EVENTS_KEY, [])
  const event = {
    id: `DRV-EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type, title, body, driverName, shipmentNumber,
    position: position || getLastDriverPosition(),
    at: new Date().toISOString(), read: false,
    roles: ['admin', 'superadmin'],
  }
  write(EVENTS_KEY, [event, ...events].slice(0, 200))
  return event
}

function shouldRecord(position, last) {
  if (!last?.recordedAt) return true
  if (Date.now() - new Date(last.recordedAt).getTime() >= MIN_INTERVAL_MS) return true
  return distanceKm({ lat: last.lat, lng: last.lng }, { lat: position.lat, lng: position.lng }) >= MIN_DISTANCE_KM
}

function enqueue(record) {
  write(QUEUE_KEY, [...getPendingLocations(), record].slice(-500), { notify: false })
}

/**
 * Dipanggil di setiap update GPS. Sudah di-throttle di sini, jadi pemanggil tidak perlu membatasi.
 * @returns {boolean} true bila posisi benar-benar disimpan/dikirim.
 */
export function recordDriverPosition(position, driverName) {
  if (!shouldRecord(position, getLastDriverPosition())) return false
  const record = { ...position, driverName, recordedAt: new Date().toISOString() }
  write(LAST_POSITION_KEY, record, { notify: false })
  if (!isOnline()) {
    enqueue(record)
  } else if (!USE_MOCK) {
    // Gagal kirim (mis. server sibuk) -> masuk antrean, dikirim ulang saat syncPendingLocations().
    api.post(ENDPOINTS.driverLocations, record).catch(() => enqueue(record))
  }
  return true
}

/** Simpan posisi terakhir ke antrean saat perangkat terdeteksi offline. */
export function queueLastPositionForOffline() {
  const last = getLastDriverPosition()
  if (!last) return
  const queue = getPendingLocations()
  if (!queue.length || queue[queue.length - 1].recordedAt !== last.recordedAt) enqueue(last)
}

/**
 * Kirim antrean posisi saat koneksi pulih.
 * Mode API: POST /driver-locations/batch { locations: [...] }; antrean dikosongkan hanya bila berhasil.
 * Mode simulasi: antrean ditandai tersinkron.
 * @returns {Promise<number>} jumlah posisi yang tersinkron.
 */
export async function syncPendingLocations() {
  const pending = getPendingLocations()
  if (!pending.length) return 0
  if (!USE_MOCK) {
    try {
      await api.post(`${ENDPOINTS.driverLocations}/batch`, { locations: pending })
    } catch {
      return 0
    }
  }
  write(QUEUE_KEY, [], { notify: false })
  addDriverEvent({
    type: 'location_synced', title: 'Koneksi pulih — lokasi tertunda',
    body: USE_MOCK
      ? `${pending.length} catatan lokasi tersimpan di browser dan ditandai tersinkron dalam mode simulasi.`
      : `${pending.length} catatan lokasi tertunda berhasil dikirim ke server.`,
    position: pending[pending.length - 1],
    driverName: pending[pending.length - 1]?.driverName,
  })
  return pending.length
}

export function listDriverEvents(role) {
  return read(EVENTS_KEY, []).filter((event) => event.roles.includes(role))
}
export function markDriverEventRead(id) {
  write(EVENTS_KEY, read(EVENTS_KEY, []).map((event) => (event.id === id ? { ...event, read: true } : event)))
}
export function markAllDriverEventsRead(role) {
  write(EVENTS_KEY, read(EVENTS_KEY, []).map((event) => (event.roles.includes(role) ? { ...event, read: true } : event)))
}
