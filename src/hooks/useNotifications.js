import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { NOTIFICATION_ROLES } from '@/lib/notifications'
import { USE_MOCK } from '@/services/api'
import { notificationService } from '@/services/systemService'

const POLL_MS = 30000

/** Jumlah notifikasi belum dibaca untuk role saat ini (0 untuk role tanpa menu notifikasi). */
export function useUnreadCount() {
  const { user } = useAuth()
  const role = user?.role
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!NOTIFICATION_ROLES.includes(role)) return undefined
    let cancelled = false
    const load = () => {
      notificationService.unreadCount(role).then((c) => { if (!cancelled) setCount(c) }).catch(() => {})
    }
    load()
    // Mode simulasi: data berubah lewat event browser. Mode API: polling berkala.
    window.addEventListener('tms:demo-data-change', load)
    window.addEventListener('storage', load)
    const timer = USE_MOCK ? null : setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      window.removeEventListener('tms:demo-data-change', load)
      window.removeEventListener('storage', load)
      if (timer) clearInterval(timer)
    }
  }, [role])

  return count
}

/** Toast singkat saat laporan driver baru masuk (riwayat lama tidak ditampilkan ulang). */
export function useNotificationToasts() {
  const { user } = useAuth()
  const toast = useToast()
  const role = user?.role

  useEffect(() => {
    if (!NOTIFICATION_ROLES.includes(role)) return undefined
    let cancelled = false
    let seen = null
    const check = async () => {
      try {
        const list = await notificationService.list(role)
        if (cancelled) return
        if (seen === null) { seen = new Set(list.map((n) => n.id)); return }
        const fresh = list.filter((n) => !seen.has(n.id) && !n.read)
        list.forEach((n) => seen.add(n.id))
        if (fresh.length === 0) return
        if (fresh.length > 3) toast.warn(`${fresh.length} notifikasi baru dari driver`)
        else fresh.forEach((n) => (n.severity === 'warning' ? toast.warn(n.title) : toast.success(n.title)))
      } catch { /* abaikan, coba lagi pada pembaruan berikutnya */ }
    }
    check()
    window.addEventListener('tms:demo-data-change', check)
    window.addEventListener('storage', check)
    const timer = USE_MOCK ? null : setInterval(check, POLL_MS)
    return () => {
      cancelled = true
      window.removeEventListener('tms:demo-data-change', check)
      window.removeEventListener('storage', check)
      if (timer) clearInterval(timer)
    }
  }, [role, toast])
}
