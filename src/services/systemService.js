import { api, USE_MOCK, ENDPOINTS } from './api'
import { notifications, auditLogs } from './mock/data/system'
import { sleep } from '@/lib/utils'
import { notifyDemoDataChanged } from './mock/mockStore'

const NOTIF_KEY = 'tms_demo_notifications_v1'
const MAX_NOTIFS = 200
const ADMIN_ROLES = ['admin', 'superadmin']

const seed = () => notifications.map((n) => ({ ...n }))
const readNotifs = () => {
  try {
    const raw = localStorage.getItem(NOTIF_KEY)
    return raw ? JSON.parse(raw) : seed()
  } catch { return seed() }
}
const writeNotifs = (list) => {
  try { localStorage.setItem(NOTIF_KEY, JSON.stringify(list.slice(0, MAX_NOTIFS))) } catch { /* storage penuh */ }
  notifyDemoDataChanged(NOTIF_KEY)
}
const newId = () => `NTF-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const stamp = (n) => new Date(n.updatedAt ?? n.at).getTime()
const mockList = (role) => readNotifs().filter((n) => n.roles.includes(role)).sort((a, b) => stamp(b) - stamp(a))

/**
 * Penyimpanan notifikasi untuk mode simulasi (localStorage, dibaca semua role di browser ini).
 * Dipakai reportService; pada mode API pembuatan notifikasi adalah tugas backend.
 */
export const notificationStore = {
  all() { return readNotifs() },
  patch(id, patch) { writeNotifs(readNotifs().map((n) => (n.id === id ? { ...n, ...patch } : n))) },
  add(data) {
    const item = { id: newId(), read: false, at: new Date().toISOString(), roles: ADMIN_ROLES, ...data }
    writeNotifs([item, ...readNotifs()])
    return item
  },
  /** Perbarui notifikasi ber-clientId sama (satu episode offline = satu notifikasi), atau buat baru. */
  upsert(clientId, build) {
    const list = readNotifs()
    const index = list.findIndex((n) => n.clientId === clientId)
    const next = build(index >= 0 ? list[index] : null)
    if (!next) return null
    const item = { roles: ADMIN_ROLES, read: false, at: new Date().toISOString(), ...next, id: index >= 0 ? list[index].id : newId() }
    writeNotifs(index >= 0 ? list.map((n, i) => (i === index ? item : n)) : [item, ...list])
    return item
  },
}

export const notificationService = {
  async list(role) {
    if (!USE_MOCK) return (await api.get(ENDPOINTS.notifications)).data
    await sleep()
    return mockList(role)
  },
  async unreadCount(role) {
    if (!USE_MOCK) {
      // ASUMSI: GET /notifications/unread-count -> { count }. Bila backend belum menyediakannya (404), hitung dari list.
      try {
        const data = (await api.get(`${ENDPOINTS.notifications}/unread-count`)).data
        return Number(data?.count ?? data) || 0
      } catch (err) {
        if (err?.status !== 404) throw err
        return (await this.list(role)).filter((n) => !n.read).length
      }
    }
    return mockList(role).filter((n) => !n.read).length
  },
  async markRead(id) {
    if (!USE_MOCK) return (await api.patch(`${ENDPOINTS.notifications}/${id}`, { read: true })).data
    writeNotifs(readNotifs().map((n) => (n.id === id ? { ...n, read: true } : n)))
    return { id }
  },
  async markAllRead(role) {
    if (!USE_MOCK) return (await api.post(`${ENDPOINTS.notifications}/read-all`)).data
    writeNotifs(readNotifs().map((n) => (n.roles.includes(role) ? { ...n, read: true } : n)))
    return {}
  },
  /** ASUMSI SEMENTARA untuk mode API: PATCH /notifications/:id dengan field yang diubah (mis. applied). */
  async update(id, patch) {
    if (!USE_MOCK) return (await api.patch(`${ENDPOINTS.notifications}/${id}`, patch)).data
    writeNotifs(readNotifs().map((n) => (n.id === id ? { ...n, ...patch } : n)))
    return { id }
  },
}

export const auditService = {
  async list() {
    if (!USE_MOCK) return (await api.get(ENDPOINTS.auditLogs)).data
    await sleep()
    return auditLogs.map((a) => ({ ...a }))
  },
}
