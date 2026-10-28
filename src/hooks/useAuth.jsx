/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authService } from '@/services/authService'
import { USE_MOCK, UNAUTHORIZED_EVENT, getToken, setToken } from '@/services/api'

const AuthContext = createContext(null)
export const SESSION_EXPIRED_FLAG = 'tms_session_expired'

export function AuthProvider({ children }) {
  // Mode simulasi memulihkan sesi dari browser; mode API memulihkan dari token lewat /auth/me.
  const [user, setUser] = useState(() => authService.restoreSession())
  // `ready` = pemulihan sesi selesai (mode API dengan token tersimpan perlu memanggil /auth/me dulu).
  const [ready, setReady] = useState(() => USE_MOCK || !getToken())

  useEffect(() => {
    if (ready) return undefined
    let cancelled = false
    authService.me()
      .then((u) => { if (!cancelled) setUser(u) })
      .catch(() => { if (!cancelled) setToken(null) })
      .finally(() => { if (!cancelled) setReady(true) })
    return () => { cancelled = true }
  }, [ready])

  // 401 dari API mana pun: sesi tidak berlaku lagi, kembali ke halaman login.
  useEffect(() => {
    if (USE_MOCK) return undefined
    const onUnauthorized = () => {
      try { sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1') } catch { /* abaikan */ }
      setUser(null)
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const login = useCallback(async (username, password) => {
    const u = await authService.login(username, password)
    setUser(u)
    try { sessionStorage.removeItem(SESSION_EXPIRED_FLAG) } catch { /* abaikan */ }
    return u
  }, [])

  const logout = useCallback(async () => {
    // UI langsung keluar; permintaan logout ke server berjalan di belakang dan kegagalannya diabaikan.
    setUser(null)
    await authService.logout()
  }, [])

  /** Simpan perubahan profil (mode API ke server, mode simulasi ke browser). Melempar ApiError bila gagal. */
  const updateProfile = useCallback(async (patch) => {
    if (!user) return null
    const saved = await authService.updateProfile(user, patch)
    const next = { ...user, ...patch, ...(saved || {}) }
    setUser(next)
    return next
  }, [user])

  const value = useMemo(() => ({ user, ready, login, logout, updateProfile }), [user, ready, login, logout, updateProfile])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}

/** Cakupan data untuk service (hanya simulasi; backend yang menegakkan kepemilikan data). */
export function useScope() {
  const { user } = useAuth()
  return useMemo(
    () => ({ role: user?.role, customerId: user?.customerId, driverId: user?.driverId }),
    [user?.role, user?.customerId, user?.driverId],
  )
}
