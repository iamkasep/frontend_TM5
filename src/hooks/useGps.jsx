/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { addDriverEvent, recordDriverPosition, queueLastPositionForOffline, syncPendingLocations, getLastDriverPosition } from '@/services/driverIncidentService'

const GpsContext = createContext(null)
const STORAGE_KEY = 'tms_gps_tracking'
const WATCH_OPTIONS = { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }

const supported = () => typeof navigator !== 'undefined' && !!navigator.geolocation

const ERROR_MESSAGES = {
  1: 'Izin lokasi ditolak. Klik ikon lokasi di address bar browser dan izinkan akses lokasi.',
  2: 'Posisi belum tersedia. Pastikan layanan lokasi perangkat aktif.',
  3: 'Waktu mendapatkan posisi habis. Pastikan sinyal GPS baik, atau coba lagi di area terbuka.',
}

/**
 * Pelacakan GPS perangkat yang hidup di level aplikasi (bukan per halaman),
 * sehingga tetap aktif ketika driver berpindah menu.
 * Posisi disimpan/dikirim lewat driverIncidentService (mode API: POST /driver-locations).
 */
export function GpsProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const watchIdRef = useRef(null)
  // Nama terbaru disimpan di ref agar callback GPS tidak memakai nama lama setelah profil diubah.
  const userNameRef = useRef(user?.name ?? 'Driver')
  useEffect(() => { userNameRef.current = user?.name ?? 'Driver' }, [user?.name])
  const [tracking, setTracking] = useState(false)
  const [position, setPosition] = useState(() => getLastDriverPosition())
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState('')
  const [permission, setPermission] = useState(() => (supported() ? 'unknown' : 'unsupported'))

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    clearWatch()
    try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* abaikan */ }
    setTracking(false)
    setPosition(null)
    setLastUpdated(null)
    setError('')
  }, [clearWatch])

  const start = useCallback(() => {
    if (watchIdRef.current !== null) return // sudah berjalan
    setError('')
    if (!supported()) {
      setError('Browser ini tidak mendukung GPS/geolocation.')
      return
    }
    setTracking(true)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (result) => {
        setPosition({
          lat: result.coords.latitude,
          lng: result.coords.longitude,
          accuracy: result.coords.accuracy,
          heading: result.coords.heading,
          speed: result.coords.speed,
        })
        setLastUpdated(new Date())
        // Disimpan/dikirim dengan throttle di service (≥15 detik atau ≥25 m), bukan setiap update GPS.
        recordDriverPosition({ lat: result.coords.latitude, lng: result.coords.longitude, accuracy: result.coords.accuracy, heading: result.coords.heading, speed: result.coords.speed }, userNameRef.current)
        setPermission('granted')
        setError('')
      },
      (err) => {
        setError(ERROR_MESSAGES[err.code] ?? 'Terjadi masalah saat membaca GPS.')
        if (err.code === 1) {
          // Izin ditolak: pelacakan tidak bisa dilanjutkan.
          setPermission('denied')
          clearWatch()
          setTracking(false)
          try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* abaikan */ }
        }
        // Kode 2/3 bersifat sementara: watch tetap jalan dan pulih sendiri saat sinyal kembali.
      },
      WATCH_OPTIONS,
    )
    try { sessionStorage.setItem(STORAGE_KEY, userId ?? '1') } catch { /* abaikan */ }
  }, [clearWatch, userId])

  // Catat gangguan koneksi dan sinkronisasi antrean saat koneksi kembali.
  useEffect(() => {
    if (!userId) return undefined
    const onOffline = () => {
      queueLastPositionForOffline()
      addDriverEvent({ type: 'offline', title: 'Driver kehilangan koneksi internet', body: `${user?.name ?? 'Driver'} terdeteksi offline. Lokasi terakhir disimpan lokal; admin di perangkat lain belum menerima data ini tanpa backend.`, position: getLastDriverPosition(), driverName: user?.name ?? 'Driver' })
    }
    const onOnline = async () => {
      const count = await syncPendingLocations()
      if (count) addDriverEvent({ type: 'connection_restored', title: 'Koneksi internet pulih', body: `${user?.name ?? 'Driver'} kembali online. ${count} posisi tertunda telah diproses.`, position: getLastDriverPosition(), driverName: user?.name ?? 'Driver' })
    }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => { window.removeEventListener('offline', onOffline); window.removeEventListener('online', onOnline) }
  }, [userId, user?.name])

  // Pantau status izin lokasi dari browser.
  useEffect(() => {
    if (!navigator.permissions?.query) return undefined
    let status
    let cancelled = false
    navigator.permissions.query({ name: 'geolocation' }).then((r) => {
      if (cancelled) return
      status = r
      setPermission(r.state)
      r.onchange = () => setPermission(r.state)
    }).catch(() => {})
    return () => {
      cancelled = true
      if (status) status.onchange = null
    }
  }, [])

  // Lanjutkan otomatis setelah refresh halaman bila tadi sedang melacak dan izin sudah diberikan.
  useEffect(() => {
    if (!userId || !navigator.permissions?.query) return undefined
    let saved = null
    try { saved = sessionStorage.getItem(STORAGE_KEY) } catch { /* abaikan */ }
    if (saved !== userId) return undefined
    let cancelled = false
    navigator.permissions.query({ name: 'geolocation' }).then((r) => {
      if (!cancelled && r.state === 'granted') start()
    }).catch(() => {})
    return () => { cancelled = true }
  }, [userId, start])

  // Hentikan pelacakan saat logout.
  const prevUserId = useRef(userId)
  useEffect(() => {
    if (prevUserId.current && !userId) stop()
    prevUserId.current = userId
  }, [userId, stop])

  // Bersihkan watcher hanya ketika aplikasi benar-benar ditutup (bukan saat pindah halaman).
  useEffect(() => clearWatch, [clearWatch])

  const value = useMemo(
    () => ({ tracking, position, lastUpdated, error, permission, start, stop }),
    [tracking, position, lastUpdated, error, permission, start, stop],
  )
  return <GpsContext.Provider value={value}>{children}</GpsContext.Provider>
}

export function useGps() {
  const ctx = useContext(GpsContext)
  if (!ctx) throw new Error('useGps harus dipakai di dalam GpsProvider')
  return ctx
}
