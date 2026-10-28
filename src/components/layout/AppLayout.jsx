import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Breadcrumb from './Breadcrumb'
import BottomNav from './BottomNav'
import DriverReportAgent from './DriverReportAgent'
import OfflineSmsBanner from './OfflineSmsBanner'
import { useNotificationToasts } from '@/hooks/useNotifications'
import { useAuth } from '@/hooks/useAuth'

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  useNotificationToasts()
  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
          {user.role === 'driver' && <OfflineSmsBanner />}
          <Breadcrumb />
          <Outlet />
        </main>
      </div>
      {user.role === 'driver' && <DriverReportAgent />}
      {user.role === 'driver' && <BottomNav />}
    </div>
  )
}
