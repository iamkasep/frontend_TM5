// Konfigurasi basemap peta.
//
// Basemap utama: OpenFreeMap (tile vektor dari data OpenStreetMap).
//  - Tanpa API key, tanpa registrasi, tanpa batas request, penggunaan komersial
//    diizinkan menurut situs resminya: https://openfreemap.org
//  - Ketentuan: https://openfreemap.org/tos/ (layanan "as-is", tanpa SLA)
//
// Cadangan (hanya jika WebGL tidak tersedia atau style OpenFreeMap gagal dimuat):
// tile raster resmi OpenStreetMap. Kebijakan: https://operations.osmfoundation.org/policies/tiles/
// (best-effort tanpa SLA; wajib mengirim header Referer, jadi jangan memasang
// Referrer-Policy yang menghapusnya).

const env = import.meta.env

// Style resmi OpenFreeMap. liberty = paling detail (jalan, nama jalan, POI).
const STYLES = ['liberty', 'bright', 'positron', 'dark', 'fiord']
const DEFAULT_STYLE = 'liberty'

const requested = String(env.VITE_MAP_STYLE ?? '').trim()
export const MAP_STYLE = STYLES.includes(requested) ? requested : DEFAULT_STYLE
export const MAP_STYLE_URL = `https://tiles.openfreemap.org/styles/${MAP_STYLE}`

// Atribusi wajib: OpenMapTiles + OpenStreetMap (bagian "OpenFreeMap" opsional tetapi dianjurkan).
export const MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">&copy; OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'

export const FALLBACK_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const FALLBACK_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'

export const MAP_MAX_ZOOM = 19
