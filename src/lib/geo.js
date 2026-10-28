/**
 * Kota yang dikenal oleh mode simulasi (koordinat dipakai untuk peta).
 * ASUMSI SEMENTARA: saat backend tersedia, koordinat bisa berasal dari geocoding di backend.
 */
export const CITIES = {
  Jakarta: { lat: -6.2088, lng: 106.8456 },
  Bandung: { lat: -6.9175, lng: 107.6191 },
  Cirebon: { lat: -6.7063, lng: 108.557 },
  Semarang: { lat: -6.9667, lng: 110.4167 },
  Yogyakarta: { lat: -7.7956, lng: 110.3695 },
  Surabaya: { lat: -7.2575, lng: 112.7521 },
  Malang: { lat: -7.9666, lng: 112.6326 },
}

export const CITY_OPTIONS = Object.keys(CITIES).map((c) => ({ value: c, label: c }))

export const pointAt = (a, b, p) => [a.lat + (b.lat - a.lat) * p, a.lng + (b.lng - a.lng) * p]

/** Jarak lurus antara dua titik {lat, lng} dalam kilometer (rumus haversine). */
export const distanceKm = (a, b) => {
  const toRad = (d) => (Number(d) * Math.PI) / 180
  const dLat = toRad(b.lat) - toRad(a.lat)
  const dLng = toRad(b.lng) - toRad(a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

export const POSITION_SOURCE_LABEL = {
  admin_manual: 'input manual (koordinat SMS)',
  driver_offline: 'posisi GPS driver saat offline',
}
const REAL_POSITION_SOURCES = Object.keys(POSITION_SOURCE_LABEL)

/**
 * Posisi nyata terakhir dari riwayat pengiriman (saat ini: koordinat manual dari SMS).
 * Mengembalikan { lat, lng, at, source } atau null bila belum ada.
 */
export const getRealPosition = (s) => {
  let found = null
  for (const h of s.history ?? []) {
    if (REAL_POSITION_SOURCES.includes(h.source) && isValidPoint(h.lat, h.lng)) found = { lat: Number(h.lat), lng: Number(h.lng), at: h.at, source: h.source }
  }
  return found
}

/**
 * Progres perjalanan (0-1) dihitung dari kedekatan posisi dengan tujuan:
 * 1 - (jarak sisa ke tujuan / jarak asal ke tujuan). Posisi diambil dari `livePoint` (mis. GPS perangkat),
 * atau dari posisi nyata terakhir. Tanpa posisi nyata, dipakai progres tersimpan (simulasi).
 * Maksimal 99% sampai status benar-benar "terkirim".
 */
export const getProgress = (s, livePoint = null) => {
  if (s.status === 'delivered') return 1
  const point = livePoint ?? getRealPosition(s)
  const total = distanceKm(s.origin, s.destination)
  if (!point || !(total > 0)) return s.progress ?? 0
  return Math.min(0.99, Math.max(0, 1 - distanceKm(point, s.destination) / total))
}

/** Sisa jarak lurus ke tujuan (km), atau null bila belum ada posisi nyata. */
export const getRemainingKm = (s, livePoint = null) => {
  if (s.status === 'delivered') return 0
  const point = livePoint ?? getRealPosition(s)
  return point ? distanceKm(point, s.destination) : null
}

/** Posisi kendaraan saat ini: posisi nyata terakhir bila ada, kalau tidak dihitung dari `progress` (simulasi). */
export const getCurrentPosition = (s) => {
  if (s.status === 'delivered') return [s.destination.lat, s.destination.lng]
  const real = getRealPosition(s)
  if (real) return [real.lat, real.lng]
  return pointAt(s.origin, s.destination, s.progress ?? 0)
}

/** Titik koordinat valid bila lat/lng terisi, berupa angka, dan dalam rentang. */
export const isValidPoint = (lat, lng) => {
  const blank = (v) => String(v ?? '').trim() === ''
  return !blank(lat) && !blank(lng) && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180
}
