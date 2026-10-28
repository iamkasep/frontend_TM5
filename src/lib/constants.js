import {
  LayoutDashboard, Users, UserCog, Building2, Truck, Package, MapPinned, ClipboardList, MapPin,
  Settings, UserCheck, Navigation, History, Search, Route, Building, Bell, ClipboardCheck,
} from 'lucide-react'

export const ROLES = { SUPERADMIN: 'superadmin', ADMIN: 'admin', DRIVER: 'driver', CUSTOMER: 'customer' }

export const ROLE_LABEL = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  driver: 'Driver',
  customer: 'Customer',
}

export const ROLE_DESC = {
  superadmin: 'Memantau seluruh operasional dan mengelola data induk.',
  admin: 'Membuat pengiriman, menugaskan driver, dan memantau armada.',
  driver: 'Menjalankan tugas pengiriman dari ponsel.',
  customer: 'Melacak pengiriman milik perusahaan Anda.',
}

/** Rancangan menu awal per role (dapat disesuaikan dengan kebutuhan bisnis). */
export const MENUS = {
  superadmin: [
    { label: 'Dashboard', path: '/superadmin/dashboard', icon: LayoutDashboard },
    {
      label: 'Manajemen', icon: UserCog, children: [
        { label: 'Manajemen Perusahaan', path: '/superadmin/companies', icon: Building },
        { label: 'Manajemen Admin', path: '/superadmin/admins', icon: UserCog },
        { label: 'Manajemen Customer', path: '/superadmin/customers', icon: Users },
        { label: 'Manajemen Driver', path: '/superadmin/drivers', icon: UserCheck },
        { label: 'Manajemen Vendor', path: '/superadmin/vendors', icon: Building2 },
        { label: 'Manajemen Kendaraan', path: '/superadmin/vehicles', icon: Truck },
        { label: 'Manajemen Koordinat', path: '/superadmin/locations', icon: MapPin },
      ],
    },
    { label: 'Semua Pengiriman', path: '/superadmin/shipments', icon: Package },
    { label: 'Monitoring Tracking', path: '/superadmin/tracking', icon: MapPinned },
    { label: 'Notifikasi', path: '/superadmin/notifications', icon: Bell },
    { label: 'Laporan', path: '/superadmin/reports', icon: ClipboardList },
    { label: 'Pengaturan', path: '/superadmin/settings', icon: Settings },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    {
      label: 'Data Master', icon: UserCog, children: [
        { label: 'Manajemen Vendor', path: '/admin/vendors', icon: Building2 },
        { label: 'Manajemen Kendaraan', path: '/admin/vehicles', icon: Truck },
        { label: 'Manajemen Driver', path: '/admin/drivers', icon: UserCheck },
        { label: 'Manajemen Koordinat', path: '/admin/locations', icon: MapPin },
        { label: 'Manajemen Customer', path: '/admin/customers', icon: Users },
      ],
    },
    {
      label: 'Data Transaction', icon: ClipboardList, children: [
        { label: 'Manajemen Pengiriman', path: '/admin/shipments', icon: Package },
        { label: 'Manajemen Trip', path: '/admin/trips', icon: Route },
        { label: 'Tracking Pengiriman', path: '/admin/tracking', icon: MapPinned },
        { label: 'Bukti Serah Terima', path: '/admin/proof-of-delivery', icon: ClipboardCheck },
      ],
    },
    { label: 'Notifikasi', path: '/admin/notifications', icon: Bell },
  ],
  driver: [
    { label: 'Dashboard', path: '/driver/dashboard', icon: LayoutDashboard, bottom: true },
    { label: 'Pengiriman Saya', path: '/driver/shipments', icon: Package, bottom: true },
    { label: 'Navigasi dan Tracking', path: '/driver/navigation', icon: Navigation, bottom: true },
    { label: 'Riwayat Pengiriman', path: '/driver/history', icon: History, bottom: true },
  ],
  customer: [
    { label: 'Dashboard', path: '/customer/dashboard', icon: LayoutDashboard },
    { label: 'Pengiriman Saya', path: '/customer/shipments', icon: Package },
    { label: 'Lacak Pengiriman', path: '/customer/track', icon: Search },
  ],
}

export const SHIPMENT_STATUS = {
  pending: { label: 'Menunggu', badge: 'bg-slate-100 text-slate-700 ring-slate-300', dot: 'bg-slate-400', color: '#94a3b8' },
  assigned: { label: 'Pemuatan', badge: 'bg-indigo-50 text-indigo-700 ring-indigo-200', dot: 'bg-indigo-500', color: '#6366f1' },
  picked_up: { label: 'Pemuatan', badge: 'bg-cyan-50 text-cyan-800 ring-cyan-200', dot: 'bg-cyan-500', color: '#06b6d4' },
  in_transit: { label: 'Dalam perjalanan', badge: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500', color: '#3b82f6' },
  delivered: { label: 'Sudah dikirim', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', color: '#10b981' },
  delayed: { label: 'Terlambat', badge: 'bg-amber-50 text-amber-800 ring-amber-300', dot: 'bg-amber-500', color: '#f59e0b' },
  cancelled: { label: 'Cancel', badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500', color: '#f43f5e' },
}

export const STATUS_OPTIONS = Object.entries(SHIPMENT_STATUS).map(([value, s]) => ({ value, label: s.label }))
export const ACTIVE_STATUSES = ['assigned', 'picked_up', 'in_transit', 'delayed']
export const HISTORY_STATUSES = ['delivered', 'cancelled']

/** Tindakan driver berikutnya untuk tiap status (simulasi alur kerja). */
export const NEXT_ACTION = {
  assigned: { to: 'picked_up', label: 'Konfirmasi barang dijemput' },
  picked_up: { to: 'in_transit', label: 'Mulai perjalanan' },
  in_transit: { to: 'delivered', label: 'Tandai terkirim', confirm: true },
  delayed: { to: 'in_transit', label: 'Lanjutkan perjalanan' },
}

/** Status entitas master (driver, kendaraan, customer, vendor, admin). */
export const ENTITY_STATUS = {
  active: { label: 'Aktif', tone: 'green' },
  inactive: { label: 'Nonaktif', tone: 'slate' },
  available: { label: 'Tersedia', tone: 'green' },
  on_duty: { label: 'Bertugas', tone: 'blue' },
  in_use: { label: 'Dipakai', tone: 'blue' },
  off: { label: 'Libur', tone: 'slate' },
  maintenance: { label: 'Perawatan', tone: 'amber' },
}
