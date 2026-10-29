import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

/** Selama VITE_API_BASE_URL kosong, semua service memakai mock data (mode simulasi). */
export const USE_MOCK = !API_BASE_URL

export const mockNote = ''

/* ------------------------------ token ------------------------------ */

// ASUMSI SEMENTARA: token dikirim sebagai Bearer dan disimpan di sessionStorage.
// Sesuaikan setelah tim backend memutuskan mekanisme autentikasi (cookie httpOnly, refresh token, dsb).
export const TOKEN_KEY = 'tms_token'
export const UNAUTHORIZED_EVENT = 'tms:unauthorized'

export const getToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null }
}
export const setToken = (token) => {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch { /* storage diblokir: sesi hanya berlaku selama halaman terbuka */ }
}

/* ------------------------------ error ------------------------------ */

/**
 * Error terstandar dari lapisan API.
 * - status: kode HTTP (0 = tidak ada respons: jaringan putus / timeout)
 * - fieldErrors: { namaField: 'pesan' } untuk 422 (bila backend mengirimnya)
 * - data: isi respons mentah dari backend
 */
export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = null, data = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.data = data
  }
}

const DEFAULT_MESSAGES = {
  0: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
  400: 'Permintaan tidak valid.',
  401: 'Sesi berakhir atau kredensial tidak valid. Silakan login kembali.',
  403: 'Anda tidak memiliki izin untuk tindakan ini.',
  404: 'Data tidak ditemukan.',
  409: 'Data bentrok dengan data yang sudah ada.',
  422: 'Data yang dikirim tidak valid. Periksa kembali isian Anda.',
  429: 'Terlalu banyak permintaan. Coba lagi beberapa saat.',
  500: 'Terjadi kesalahan pada server. Coba lagi nanti.',
}
const messageFor = (status) => DEFAULT_MESSAGES[status] ?? (status >= 500 ? DEFAULT_MESSAGES[500] : 'Terjadi kesalahan.')

/**
 * ASUMSI SEMENTARA bentuk error validasi (422), keduanya didukung:
 *   { message, errors: { field: ['pesan', ...] | 'pesan' } }
 *   { message, errors: [{ field, message }] }
 */
function readFieldErrors(data) {
  const raw = data?.errors
  if (!raw || typeof raw !== 'object') return null
  const out = {}
  if (Array.isArray(raw)) {
    raw.forEach((item) => { if (item?.field && item?.message && !out[item.field]) out[item.field] = String(item.message) })
  } else {
    Object.entries(raw).forEach(([field, value]) => {
      const text = Array.isArray(value) ? value[0] : value
      // Laravel mengirim nama field snake_case (customer_id); form frontend memakai camelCase.
      if (text) out[API_CASE === 'snake' ? toCamel(field) : field] = String(text)
    })
  }
  return Object.keys(out).length ? out : null
}

/* ------------------------- format respons Laravel ------------------------- */

/**
 * Konvensi nama field dari backend:
 *   - 'camel' (default): backend mengirim/menerima camelCase (customerId), tanpa konversi.
 *   - 'snake': backend Laravel memakai snake_case (customer_id). Body & query request diubah ke snake_case,
 *     respons diubah ke camelCase, sehingga komponen tidak perlu tahu perbedaannya.
 */
export const API_CASE = (import.meta.env.VITE_API_CASE || 'camel').toLowerCase() === 'snake' ? 'snake' : 'camel'

const isPlainObject = (v) => Object.prototype.toString.call(v) === '[object Object]'
const toCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())
const toSnake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()

/** Ubah nama key secara rekursif (hanya objek biasa & array; FormData/Blob/Date dibiarkan). */
export function convertKeys(value, fn) {
  if (Array.isArray(value)) return value.map((v) => convertKeys(v, fn))
  if (!isPlainObject(value)) return value
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [fn(k), convertKeys(v, fn)]))
}

const WRAPPER_KEYS = new Set(['data', 'meta', 'links', 'message', 'success', 'status'])

/**
 * Laravel API Resource membungkus data: { data: ... } dan pagination: { data: [...], meta, links }.
 * Fungsi ini mengembalikan isi `data` agar service tetap menerima resource/array secara langsung.
 * Respons yang tidak dibungkus (mis. { token, user }) dikembalikan apa adanya.
 */
export function unwrap(body) {
  if (!isPlainObject(body) || !('data' in body)) return body
  return Object.keys(body).every((k) => WRAPPER_KEYS.has(k)) ? body.data : body
}

/* ------------------------------ instance ------------------------------ */

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    // Wajib untuk Laravel: tanpa header ini error auth/validasi bisa dikembalikan sebagai redirect HTML, bukan JSON.
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`
  if (API_CASE === 'snake') {
    if (isPlainObject(config.data) || Array.isArray(config.data)) config.data = convertKeys(config.data, toSnake)
    if (isPlainObject(config.params)) config.params = convertKeys(config.params, toSnake)
  }
  return config
})

api.interceptors.response.use(
  (res) => {
    const body = API_CASE === 'snake' ? convertKeys(res.data, toCamel) : res.data
    // Metadata pagination Laravel tetap tersedia lewat res.meta / res.links bila dibutuhkan.
    if (isPlainObject(body)) { res.meta = body.meta; res.links = body.links }
    res.data = unwrap(body)
    return res
  },
  (err) => {
    if (axios.isCancel(err)) return Promise.reject(err)
    const status = err.response?.status ?? 0
    const data = err.response?.data
    const serverMessage = typeof data?.message === 'string' && data.message.trim() ? data.message : null
    const timedOut = err.code === 'ECONNABORTED'
    const message = serverMessage
      ?? (timedOut ? 'Server terlalu lama merespons. Coba lagi.' : messageFor(status))

    // 401 pada endpoint selain login = sesi tidak berlaku lagi: bersihkan token dan beri tahu AuthProvider.
    const isLogin = String(err.config?.url ?? '').endsWith(ENDPOINTS.auth.login)
    if (status === 401 && !isLogin) {
      setToken(null)
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(new ApiError(message, { status, fieldErrors: status === 422 ? readFieldErrors(data) : null, data }))
  },
)

/**
 * ASUMSI SEMENTARA — path endpoint BUKAN keputusan final.
 * Ubah semuanya di sini setelah spesifikasi API dari tim backend tersedia.
 */
export const ENDPOINTS = {
  // Autentikasi. ASUMSI: POST login { username, password } -> { token, user }; GET me -> user; PATCH profile -> user.
  auth: { login: '/auth/login', me: '/auth/me', logout: '/auth/logout', profile: '/auth/profile' },
  shipments: '/shipments',
  drivers: '/drivers',
  vehicles: '/vehicles',
  locations: '/locations',
  customers: '/customers',
  vendors: '/vendors',
  admins: '/admins',
  companies: '/companies',
  trips: '/trips',
  tripShipments: '/trip-shipments',
  trackingEvents: '/tracking-events',
  pods: '/pods',
  notifications: '/notifications',
  // Laporan otomatis dari perangkat driver (posisi saat offline, masalah GPS). Dikirim ulang dari antrean bila gagal.
  driverReports: '/driver-reports',
  // Posisi GPS driver (di-throttle di frontend) + kirim ulang antrean offline lewat /driver-locations/batch.
  driverLocations: '/driver-locations',
  auditLogs: '/audit-logs',
}
