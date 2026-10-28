import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useGps } from '@/hooks/useGps'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useShipments } from '@/hooks/useShipments'
import { ACTIVE_STATUSES } from '@/lib/constants'
import { distanceKm } from '@/lib/geo'
import { getOutboxCount, reportService } from '@/services/reportService'

const OFFLINE_GRACE_MS = 5000 // putus sesaat (mis. terowongan) tidak dianggap offline
const MIN_OFFLINE_REPORT_MS = 60000 // putus < 1 menit tanpa posisi tidak perlu dilaporkan
const RESEND_MS = 2 * 60 * 1000 // selama offline, posisi diperbarui paling cepat tiap 2 menit
const MIN_MOVE_KM = 0.03 // ...dan hanya bila bergerak minimal 30 meter
const GPS_LOST_MS = 90 * 1000 // sinyal GPS hilang selama ini baru dilaporkan

/**
 * Agen latar belakang untuk akun driver (tidak menampilkan apa pun).
 * - Internet putus > 5 detik: koordinat GPS terakhir dikirim otomatis ke admin sebagai notifikasi,
 *   lalu diperbarui bila driver bergerak. Satu episode offline = satu notifikasi.
 * - Internet kembali: episode ditutup dan antrean (mode API) dikirim ulang.
 * - Izin lokasi ditolak / sinyal GPS hilang lama: dilaporkan sebagai masalah GPS.
 */
export default function DriverReportAgent() {
  const { user } = useAuth()
  const online = useOnlineStatus()
  const { position, lastUpdated, tracking, permission, error } = useGps()
  const { data } = useShipments()

  const driver = useMemo(() => ({ id: user.driverId ?? user.id, name: user.name }), [user.driverId, user.id, user.name])
  const shipmentRef = useRef(null)
  const episodeRef = useRef(null) // { id, startedAt, lastSent: {at, lat, lng} | null, reported }
  const gpsKeyRef = useRef('')
  const live = useRef({ driver, position, lastUpdated, tracking, permission })

  useEffect(() => {
    live.current = { driver, position, lastUpdated, tracking, permission }
  })

  // Ingat pengiriman aktif terakhir: data bisa gagal dimuat saat offline.
  useEffect(() => {
    if (!data) return
    const active = data.filter((s) => ACTIVE_STATUSES.includes(s.status))
    const s = active.find((x) => x.status === 'in_transit') ?? active[0]
    shipmentRef.current = s ? { id: s.id, trackingNumber: s.trackingNumber } : null
  }, [data])

  const sendIfDue = useCallback((fix, fixedAt) => {
    const ep = episodeRef.current
    const pos = fix ?? live.current.position
    if (!ep || !pos) return
    const last = ep.lastSent
    if (last && (Date.now() - last.at < RESEND_MS || distanceKm(last, pos) < MIN_MOVE_KM)) return
    ep.lastSent = { at: Date.now(), lat: pos.lat, lng: pos.lng }
    ep.reported = true
    reportService.offlinePosition({
      episodeId: ep.id,
      driver: live.current.driver,
      shipment: shipmentRef.current,
      position: { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy ?? null },
      capturedAt: (fixedAt ?? live.current.lastUpdated ?? new Date()).toISOString(),
      startedAt: ep.startedAt,
    })
  }, [])

  // Awal / akhir episode offline.
  useEffect(() => {
    if (online) {
      const ep = episodeRef.current
      episodeRef.current = null
      ;(async () => {
        await reportService.flush() // posisi yang tertahan harus tiba sebelum penutupan episode
        if (!ep || (!ep.reported && Date.now() - new Date(ep.startedAt).getTime() < MIN_OFFLINE_REPORT_MS)) return
        reportService.connectionRestored({
          episodeId: ep.id,
          driver: live.current.driver,
          shipment: shipmentRef.current,
          startedAt: ep.startedAt,
          restoredAt: new Date().toISOString(),
          hadPosition: ep.reported,
        })
      })()
      return undefined
    }
    const timer = setTimeout(() => {
      episodeRef.current = { id: reportService.newEpisodeId(), startedAt: new Date().toISOString(), lastSent: null, reported: false }
      if (live.current.position) {
        sendIfDue()
      } else if (live.current.permission === 'granted' && navigator.geolocation) {
        // GPS aktif tanpa internet: baca satu kali bila pelacakan belum berjalan (izin sudah diberikan sebelumnya).
        navigator.geolocation.getCurrentPosition(
          (r) => sendIfDue({ lat: r.coords.latitude, lng: r.coords.longitude, accuracy: r.coords.accuracy }, new Date()),
          () => {},
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
        )
      }
    }, OFFLINE_GRACE_MS)
    return () => clearTimeout(timer)
  }, [online, sendIfDue])

  // Selama offline, perbarui posisi bila driver bergerak. Dicek saat posisi berubah DAN berkala,
  // supaya posisi yang datang sebelum jeda habis tetap terkirim walau tidak ada pembaruan GPS berikutnya.
  useEffect(() => {
    if (!online) sendIfDue()
  }, [online, position, sendIfDue])
  useEffect(() => {
    if (online) return undefined
    const timer = setInterval(() => sendIfDue(), 15000)
    return () => clearInterval(timer)
  }, [online, sendIfDue])

  // Antrean (mode API): event "online" bisa datang sebelum jaringan benar-benar siap, jadi coba lagi
  // tiap 10 detik selama masih ada laporan yang tertahan.
  useEffect(() => {
    if (!online) return undefined
    const timer = setInterval(() => { if (getOutboxCount() > 0) reportService.flush() }, 10000)
    return () => clearInterval(timer)
  }, [online])

  // Masalah GPS.
  useEffect(() => {
    if (!error) { gpsKeyRef.current = ''; return undefined }
    const send = (title) => {
      const key = `${title}|${error}`
      if (gpsKeyRef.current === key) return
      gpsKeyRef.current = key
      reportService.gpsIssue({ driver: live.current.driver, shipment: shipmentRef.current, title, message: error })
    }
    if (permission === 'denied') { send('izin lokasi ditolak'); return undefined }
    if (!live.current.tracking) return undefined
    const timer = setTimeout(() => send('sinyal GPS hilang'), GPS_LOST_MS)
    return () => clearTimeout(timer)
  }, [error, permission])

  return null
}
