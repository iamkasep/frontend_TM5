import { Link } from 'react-router-dom'
import { Bell, Menu, Radio, WifiOff } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useGps } from '@/hooks/useGps'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useOutboxCount } from '@/hooks/useOutboxCount'
import { useUnreadCount } from '@/hooks/useNotifications'
import { MENUS, ROLE_LABEL } from '@/lib/constants'
import { Badge } from '@/components/ui/Badge'

export default function Topbar({ onMenu }) {
  const { user } = useAuth()
  const { tracking, position } = useGps()
  const online = useOnlineStatus()
  const queued = useOutboxCount()
  const unread = useUnreadCount()
  const notifPath = MENUS[user.role].find((m) => m.path?.endsWith('/notifications'))?.path

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-800 bg-ink-900/95 px-4 text-white backdrop-blur sm:px-6 lg:px-8">
      <button type="button" onClick={onMenu} className="rounded-lg p-2 text-ink-200 hover:bg-white/10 lg:hidden" aria-label="Buka menu">
        <Menu className="size-5" />
      </button>
      {user.role === 'driver' && tracking && (
        <Link to="/driver/navigation" aria-label="GPS real-time aktif, buka halaman navigasi">
          <Badge tone={position ? 'green' : 'amber'}>
            <Radio className="size-3.5 animate-pulse" aria-hidden />
            <span className="hidden sm:inline">{position ? 'GPS aktif' : 'Mencari GPS…'}</span>
          </Badge>
        </Link>
      )}
      {user.role === 'driver' && !online && (
        <Link to="/driver/navigation" aria-label="Tidak ada internet, buka halaman navigasi">
          <Badge tone="red">
            <WifiOff className="size-3.5" aria-hidden />
            <span>Offline</span>
            <span className="hidden sm:inline">· posisi dikirim ke admin{queued ? ` (${queued} menunggu)` : ''}</span>
          </Badge>
        </Link>
      )}
      <div className="ml-auto flex items-center gap-3">
        {notifPath && (
          <Link to={notifPath} className="relative rounded-lg p-2 text-ink-200 hover:bg-white/10" aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'}>
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-ink-900">{unread > 9 ? '9+' : unread}</span>
            )}
          </Link>
        )}
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-route-500 text-sm font-bold text-ink-950 ring-2 ring-route-400/40" aria-hidden>
            {user.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-semibold text-white">{user.name}</p>
            <p className="text-xs text-ink-300">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
