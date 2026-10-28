import { AlertTriangle, CheckCircle2, LocateOff, MessageSquareText, Package, WifiOff } from 'lucide-react'

/** Role yang menerima notifikasi laporan driver. */
export const NOTIFICATION_ROLES = ['admin', 'superadmin']

export const NOTIFICATION_CATEGORIES = [
  { value: 'all', label: 'Semua' },
  { value: 'offline', label: 'Offline' },
  { value: 'status', label: 'Status' },
  { value: 'delay', label: 'Terlambat' },
  { value: 'gps', label: 'GPS' },
]

const TYPES = {
  offline_position: { label: 'Posisi offline', category: 'offline', icon: WifiOff, tone: 'amber' },
  sms_position: { label: 'Posisi via SMS', category: 'offline', icon: MessageSquareText, tone: 'blue' },
  connection_lost: { label: 'Koneksi terputus', category: 'offline', icon: WifiOff, tone: 'amber' },
  delay_report: { label: 'Keterlambatan', category: 'delay', icon: AlertTriangle, tone: 'red' },
  status_update: { label: 'Status pengiriman', category: 'status', icon: Package, tone: 'blue' },
  gps_issue: { label: 'Masalah GPS', category: 'gps', icon: LocateOff, tone: 'red' },
}

/** Ikon, label, kategori, dan warna untuk satu notifikasi. */
export function notificationMeta(n) {
  if (n.type === 'status_update' && n.status === 'delivered') {
    return { ...TYPES.status_update, label: 'Terkirim', icon: CheckCircle2, tone: 'green' }
  }
  return TYPES[n.type] ?? { label: 'Laporan driver', category: 'status', icon: Package, tone: 'slate' }
}

export const TONE_ICON = {
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-300',
}

export const mapsUrl = (p) => `https://www.google.com/maps?q=${p.lat},${p.lng}`
export const formatCoordinates = (p) => `${Number(p.lat).toFixed(6)}, ${Number(p.lng).toFixed(6)}`
