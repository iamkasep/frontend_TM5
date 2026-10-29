/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { addDriverEvent, recordDriverPosition, queueLastPositionForOffline, syncPendingLocations, getLastDriverPosition } from '@/services/driverIncidentService'

const GpsContext = createContext(null)
const STORAGE_KEY = 'tms_gps_tracking'
const WATCH_OPTIONS = { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }

const supported = () => typeof navigator !== 'undefined' && !!navigator.geolocation
const wakeLockSupported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator

const readSavedTrackingUser = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const writeSavedTrackingUser = (value) => {
  try {
    if (value) {
      sessionStorage.setItem(STORAGE_KEY, value)
      localStorage.setItem(STORAGE_KEY, value)
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch { /* abaikan bila storage diblokir */ }
}

const ERROR_MESSAGES = {
  1: 'Izin lokasi ditolak. Klik ikon lokasi di address bar browser dan izinkan akses lokasi.',
  2: 'Posisi belum tersedia. Pastikan layanan lokasi perangkat aktif.',
  3: 'Waktu mendapatkan posisi habis. Pastikan sinyal GPS baik, atau coba lagi di area terbuka.',
}

/**
 * Pelacakan GPS perangkat yang hidup di level aplikasi (bukan per halaman),
 * sehingga tetap aktif ketika driver berpindah menu.
 * Dilengkapi:
 * 1. Screen Wake Lock API (`navigator.wakeLock`) agar layar HP Android tidak mati otomatis saat melacak.
 * 2. Auto-Resume (`visibilitychange`) agar saat layar HP dinyalakan kembali dari kondisi terkunci,
 *    sensor GPS langsung di-refresh dan mengirim titik koordinat terbaru seketika.
 */
export function GpsProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const watchIdRef = useRef(null)
  const wakeLockRef = useRef(null)
  const trackingRef = useRef(false)
  const userNameRef = useRef(user?.name ?? 'Driver')
  useEffect(() => { userNameRef.current = user?.name ?? 'Driver' }, [user?.name])

  const [tracking, setTracking] = useState(false)
  const [wakeLockActive, setWakeLockActive] = useState(false)
  const [position, setPosition] = useState(() => getLastDriverPosition())
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState('')
  const [permission, setPermission] = useState(() => (supported() ? 'unknown' : 'unsupported'))

  useEffect(() => {
    trackingRef.current = tracking
  }, [tracking])

  const releaseWakeLock = useCallback(async () => {
    const lock = wakeLockRef.current
    wakeLockRef.current = null
    if (lock) {
      try { await lock.release() } catch { /* abaikan jika sudah dilepas OS */ }
    }
    setWakeLockActive(false)
  }, [])

  const acquireWakeLock = useCallback(async () => {
    if (!wakeLockSupported() || !trackingRef.current) return
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      setWakeLockActive(true)
      return
    }
    try {
      const sentinel = await navigator.wakeLock.request('screen')
      wakeLockRef.current = sentinel
      setWakeLockActive(true)
      sentinel.addEventListener('release', () => {
        if (wakeLockRef.current === sentinel) {
          wakeLockRef.current = null
          setWakeLockActive(false)
        }
      })
    } catch {
      // Browser/OS bisa menolak Wake Lock saat mode hemat daya ekstrem aktif.
      setWakeLockActive(false)
    }
  }, [])

  const handlePositionSuccess = useCallback((result) => {
    const nextPos = {
      lat: result.coords.latitude,
      lng: result.coords.longitude,
      accuracy: result.coords.accuracy,
      heading: result.coords.heading,
      speed: result.coords.speed,
    }
    setPosition(nextPos)
    setLastUpdated(new Date())
    // Disimpan/dikirim dengan throttle di service (≥15 detik atau ≥25 m).
    recordDriverPosition(nextPos, userNameRef.current)
    setPermission('granted')
    setError('')
  }, [])

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null && supported()) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    clearWatch()
    trackingRef.current = false
    releaseWakeLock()
    writeSavedTrackingUser(null)
    setTracking(false)
    setPosition(null)
    setLastUpdated(null)
    setError('')
  }, [clearWatch, releaseWakeLock])

  const bindWatch = useCallback(() => {
    if (!supported()) return
    clearWatch()
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      (err) => {
        setError(ERROR_MESSAGES[err.code] ?? 'Terjadi masalah saat membaca GPS.')
        if (err.code === 1) {
          setPermission('denied')
          clearWatch()
          trackingRef.current = false
          releaseWakeLock()
          writeSavedTrackingUser(null)
          setTracking(false)
        }
      },
      WATCH_OPTIONS,
    )
  }, [clearWatch, handlePositionSuccess, releaseWakeLock])

  const start = useCallback(() => {
    if (watchIdRef.current !== null) return
    setError('')
    if (!supported()) {
      setError('Browser ini tidak mendukung GPS/geolocation.')
      return
    }
    trackingRef.current = true
    setTracking(true)
    bindWatch()
    acquireWakeLock()
    writeSavedTrackingUser(userId ?? '1')
  }, [acquireWakeLock, bindWatch, userId])

  // Saat layar HP Android menyala kembali (visibilitychange -> visible),
  // aktifkan ulang Screen Wake Lock, hidupkan ulang watchPosition yang sempat di-pause OS,
  // dan langsung ambil 1 titik GPS terbaru saat itu juga.
  useEffect(() => {
    if (!tracking || typeof document === 'undefined') return undefined

    const handleResume = () => {
      if (document.visibilityState !== 'visible' || !trackingRef.current) return
      acquireWakeLock()
      bindWatch()
      if (supported()) {
        navigator.geolocation.getCurrentPosition(
          handlePositionSuccess,
          () => {},
          WATCH_OPTIONS,
        )
      }
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        syncPendingLocations().catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', handleResume)
    window.addEventListener('pageshow', handleResume)
    window.addEventListener('focus', handleResume)
    return () => {
      document.removeEventListener('visibilitychange', handleResume)
      window.removeEventListener('pageshow', handleResume)
      window.removeEventListener('focus', handleResume)
    }
  }, [tracking, acquireWakeLock, bindWatch, handlePositionSuccess])

  // Catat gangguan koneksi dan sinkronisasi antrean saat koneksi kembali.
  useEffect(() => {
    if (!userId) return undefined
    const onOffline = () => {
      queueLastPositionForOffline()
      addDriverEvent({
        type: 'offline',
        title: 'Driver kehilangan koneksi internet',
        body: `${user?.name ?? 'Driver'} terdeteksi offline. Lokasi terakhir disimpan dan akan disinkronkan saat koneksi kembali.`,
        position: getLastDriverPosition(),
        driverName: user?.name ?? 'Driver',
      })
    }
    const onOnline = async () => {
      const count = await syncPendingLocations()
      if (count) {
        addDriverEvent({
          type: 'connection_restored',
          title: 'Koneksi internet pulih',
          body: `${user?.name ?? 'Driver'} kembali online. ${count} posisi tertunda telah dikirim.`,
          position: getLastDriverPosition(),
          driverName: user?.name ?? 'Driver',
        })
      }
    }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
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
    const saved = readSavedTrackingUser()
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

  // Bersihkan watcher dan wake lock ketika aplikasi ditutup.
  useEffect(() => () => {
    clearWatch()
    releaseWakeLock()
  }, [clearWatch, releaseWakeLock])

  const value = useMemo(
    () => ({ tracking, wakeLockActive, position, lastUpdated, error, permission, start, stop }),
    [tracking, wakeLockActive, position, lastUpdated, error, permission, start, stop],
  )
  return <GpsContext.Provider value={value}>{children}</GpsContext.Provider>
}

export function useGps() {
  const ctx = useContext(GpsContext)
  if (!ctx) throw new Error('useGps harus dipakai di dalam GpsProvider')
  return ctx
}
