import { sleep } from '@/lib/utils'

const clone = (value) => JSON.parse(JSON.stringify(value))
const storageKey = (prefix) => `tms_demo_collection_${prefix}_v4`

export const TRIPS_MOCK_KEY = 'tms_demo_trips_v4'

/** Notifikasi internal agar halaman role lain ikut memuat ulang data simulasi. */
export function notifyDemoDataChanged(key = '') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tms:demo-data-change', { detail: { key } }))
  }
}

/** Sinkronkan status trip saat status AWB berubah (hanya mode simulasi). */
export function syncMockTripFromShipment(tripId, shipmentStatus, allShipments) {
  if (!tripId || typeof localStorage === 'undefined') return
  try {
    const now = new Date().toISOString()
    const trips = JSON.parse(localStorage.getItem(TRIPS_MOCK_KEY) || '[]')
    const nextTrips = trips.map((trip) => {
      if (trip.id !== tripId) return trip
      const tripShipments = allShipments.filter((item) => (trip.shipmentIds || []).includes(item.id))
      const allFinished = tripShipments.length > 0 && tripShipments.every((item) => ['delivered', 'cancelled'].includes(item.status))
      if (allFinished) return { ...trip, status: 'completed', actualArrival: trip.actualArrival || now }
      if (shipmentStatus === 'in_transit' && trip.status === 'planned') {
        return { ...trip, status: 'in_progress', actualDeparture: trip.actualDeparture || now }
      }
      return trip
    })
    localStorage.setItem(TRIPS_MOCK_KEY, JSON.stringify(nextTrips))
    notifyDemoDataChanged(TRIPS_MOCK_KEY)
  } catch {
    /* status AWB tetap tersimpan meski sinkronisasi trip gagal */
  }
}

/** Koleksi mock persisten: semua role membaca sumber localStorage yang sama. */
export function createCollection(initial, { prefix = 'ID' } = {}) {
  const key = storageKey(prefix)
  let items = clone(initial)

  const refresh = () => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
      if (saved) items = JSON.parse(saved)
      else if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(items))
    } catch { /* fallback ke data awal jika storage tidak tersedia */ }
    return items
  }
  const persist = () => {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(items)) } catch { /* abaikan storage penuh */ }
    notifyDemoDataChanged(key)
  }
  const nextId = () => {
    refresh()
    const max = items.reduce((m, i) => Math.max(m, Number(String(i.id).split('-').pop()) || 0), 0)
    return `${prefix}-${String(max + 1).padStart(3, '0')}`
  }
  const find = (id) => {
    refresh()
    const item = items.find((i) => i.id === id)
    if (!item) throw new Error('Data tidak ditemukan')
    return item
  }

  // Seed data hanya saat koleksi belum pernah dibuat di browser ini.
  refresh()
  return {
    nextId,
    async list() { await sleep(); return clone(refresh()) },
    async get(id) { await sleep(100); return clone(find(id)) },
    async create(data) {
      await sleep()
      refresh()
      const item = { ...data, id: data.id ?? nextId() }
      items = [item, ...items]
      persist()
      return clone(item)
    },
    async update(id, patch) {
      await sleep()
      find(id)
      items = items.map((i) => (i.id === id ? { ...i, ...patch } : i))
      persist()
      return clone(find(id))
    },
    async remove(id) {
      await sleep()
      find(id)
      items = items.filter((i) => i.id !== id)
      persist()
      return { id }
    },
  }
}
