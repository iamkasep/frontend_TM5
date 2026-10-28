import { users } from './mock/data/people'
import { sleep } from '@/lib/utils'
import { api, ENDPOINTS, USE_MOCK, getToken, setToken } from './api'
import { ROLES } from '@/lib/constants'

const VALID_ROLES = Object.values(ROLES)
const SESSION_KEY = 'tms_session'
const PROFILE_KEY = `${SESSION_KEY}_profile`

/** Kredensial dummy untuk demo lokal. Jangan digunakan sebagai autentikasi produksi. */
const MOCK_ACCOUNTS = [
  { username: 'superadmin', password: 'TMSdemo123!', role: 'superadmin', userId: 'USR-SA' },
  { username: 'admin', password: 'TMSdemo123!', role: 'admin', userId: 'USR-AD' },
  { username: 'driver', password: 'TMSdemo123!', role: 'driver', userId: 'USR-DR' },
  { username: 'customer', password: 'TMSdemo123!', role: 'customer', userId: 'USR-CU' },
].map((account) => ({ ...account, name: users.find((u) => u.id === account.userId)?.name ?? account.username }))

/** Akun demo untuk halaman login. Kosong pada mode API agar kredensial dummy tidak tampil di produksi. */
export const DEMO_ACCOUNTS = USE_MOCK ? MOCK_ACCOUNTS : []

const publicUser = (user) => {
  if (!user) return null
  const safe = { ...user }
  delete safe.password
  return safe
}

const readJson = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

/* ---------------------- sesi khusus mode simulasi ---------------------- */

function readMockSession() {
  const id = readJson(SESSION_KEY, null)?.userId
  const base = users.find((u) => u.id === id)
  if (!base) return null
  const overrides = readJson(PROFILE_KEY, {})
  return publicUser({ ...base, ...(overrides[id] || {}) })
}

function saveMockProfile(userId, patch) {
  try {
    const all = readJson(PROFILE_KEY, {})
    all[userId] = { ...(all[userId] || {}), ...patch }
    localStorage.setItem(PROFILE_KEY, JSON.stringify(all))
  } catch { /* storage diblokir: perubahan hanya berlaku selama halaman terbuka */ }
}

/* ------------------------------ service ------------------------------ */

export const authService = {
  /**
   * Mode API: POST /auth/login -> { token, user }. `user` wajib memuat id, name, role (superadmin|admin|driver|customer),
   * serta customerId (customer) atau driverId (driver). ASUMSI SEMENTARA sampai kontrak backend final.
   */
  async login(username, password) {
    if (!USE_MOCK) {
      const { data } = await api.post(ENDPOINTS.auth.login, { username: String(username).trim(), password })
      const token = data?.token ?? data?.accessToken ?? data?.access_token
      const user = data?.user
      if (!token || !user) throw new Error('Respons login dari server tidak lengkap (token/user tidak ada).')
      if (!VALID_ROLES.includes(user.role)) throw new Error('Role akun tidak dikenal oleh aplikasi.')
      setToken(token)
      return user
    }
    await sleep(250)
    const account = MOCK_ACCOUNTS.find((a) => a.username.toLowerCase() === String(username).trim().toLowerCase() && a.password === password)
    if (!account) throw new Error('Username atau password salah. Gunakan akun demo yang tersedia.')
    const user = users.find((u) => u.id === account.userId)
    if (!user || user.role !== account.role) throw new Error('Akun demo tidak terkonfigurasi dengan benar.')
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id })) } catch { /* abaikan */ }
    return readMockSession() ?? publicUser(user)
  },

  /** Sesi tersimpan yang bisa dipulihkan tanpa request (hanya mode simulasi; mode API memakai me()). */
  restoreSession() {
    return USE_MOCK ? readMockSession() : null
  },

  /** Mode API: ambil user dari token yang tersimpan (dipakai saat halaman dimuat ulang). */
  async me() {
    if (USE_MOCK) return readMockSession()
    const { data } = await api.get(ENDPOINTS.auth.me)
    if (!data || !VALID_ROLES.includes(data.role)) throw new Error('Data akun dari server tidak valid.')
    return data
  },

  async logout() {
    if (USE_MOCK) {
      try { localStorage.removeItem(SESSION_KEY) } catch { /* abaikan */ }
      return
    }
    const token = getToken()
    setToken(null)
    // Token dilampirkan manual karena sudah dihapus dari storage; kegagalan logout di server tidak menghalangi keluar.
    try { await api.post(ENDPOINTS.auth.logout, null, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined) } catch { /* abaikan */ }
  },

  /**
   * Perbarui profil akun yang sedang login.
   * Mode API: PATCH /auth/profile { name, phone } -> user (ASUMSI SEMENTARA). Mode simulasi: tersimpan di browser ini.
   */
  async updateProfile(user, patch) {
    if (!USE_MOCK) return (await api.patch(ENDPOINTS.auth.profile, patch)).data
    await sleep(150)
    saveMockProfile(user.id, patch)
    return { ...user, ...patch }
  },
}
