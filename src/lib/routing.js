/**
 * Garis rute mengikuti jalan (seperti aplikasi peta), bukan garis lurus.
 * Memakai layanan routing publik OSRM (tanpa API key). Layanan demo ini bersifat best-effort
 * tanpa SLA; untuk produksi berskala besar, ganti ROUTING_URL ke server OSRM/Valhalla sendiri.
 * Bila permintaan gagal (offline, di luar jangkauan jalan), pemanggil memakai garis lurus.
 */
export const ROUTING_URL = 'https://router.project-osrm.org'

const MAX_WAYPOINTS = 25
const cache = new Map()

const isPoint = (p) => Array.isArray(p) && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1])) && p[0] !== null && p[1] !== null

// Buang titik tidak valid dan titik kembar berurutan, lalu batasi jumlah titik singgah.
function prepare(points) {
  const clean = []
  for (const p of points) {
    if (!isPoint(p)) continue
    const q = [Number(p[0]), Number(p[1])]
    const last = clean[clean.length - 1]
    if (last && Math.abs(last[0] - q[0]) < 1e-5 && Math.abs(last[1] - q[1]) < 1e-5) continue
    clean.push(q)
  }
  if (clean.length <= MAX_WAYPOINTS) return clean
  const step = (clean.length - 1) / (MAX_WAYPOINTS - 1)
  return Array.from({ length: MAX_WAYPOINTS }, (_, i) => clean[Math.round(i * step)])
}

/** Mengembalikan [[lat, lng], ...] mengikuti jalan, atau null bila tidak tersedia. */
export async function fetchRoadRoute(points, signal) {
  const pts = prepare(points)
  if (pts.length < 2) return null
  const coords = pts.map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(';')
  if (cache.has(coords)) return cache.get(coords)
  const res = await fetch(`${ROUTING_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson`, { signal })
  if (!res.ok) return null
  const json = await res.json()
  const line = json.code === 'Ok' ? json.routes?.[0]?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) : null
  const result = line?.length > 1 ? line : null
  if (result) cache.set(coords, result)
  return result
}
