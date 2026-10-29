import { Link } from 'react-router-dom'
import { ACTIVE_STATUSES, MENUS } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { useShipments } from '@/hooks/useShipments'
import { useActivePath } from './Sidebar'
import { cn } from '@/lib/utils'

/** Label ringkas khusus navigasi bawah agar tidak terpotong di layar sempit. */
const SHORT_LABEL = {
  dashboard: 'Beranda',
  shipments: 'Tugas',
  navigation: 'Navigasi',
  history: 'Riwayat',
}

const shortLabel = (item) => SHORT_LABEL[item.path.split('/').pop()] ?? item.label.split(' ')[0]

/** Navigasi bawah untuk driver di ponsel (mobile-first, mudah dijangkau ibu jari). */
export default function BottomNav() {
  const { user } = useAuth()
  const { data } = useShipments()
  const all = MENUS[user.role]
  const active = useActivePath(all)
  const items = all.filter((i) => i.bottom)
  const activeTasks = (data ?? []).filter((s) => ACTIVE_STATUSES.includes(s.status)).length

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(10,21,32,0.06)] backdrop-blur lg:hidden"
      aria-label="Navigasi cepat"
    >
      <ul className="mx-auto flex max-w-md">
        {items.map((item) => {
          const selected = item.path === active
          const isTasks = item.path.endsWith('/shipments')
          return (
            <li key={item.path} className="flex-1">
              <Link
                to={item.path}
                aria-current={selected ? 'page' : undefined}
                className="relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold"
              >
                {selected && <span className="absolute inset-x-6 top-0 h-0.5 rounded-b-full bg-route-500" aria-hidden />}
                <span
                  className={cn(
                    'relative grid h-8 w-14 place-items-center rounded-full transition-colors',
                    selected ? 'bg-route-50 text-route-600' : 'text-ink-400',
                  )}
                >
                  <item.icon className="size-5" aria-hidden />
                  {isTasks && activeTasks > 0 && (
                    <span className="absolute -right-0.5 -top-1 grid min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-white">
                      {activeTasks > 9 ? '9+' : activeTasks}
                    </span>
                  )}
                </span>
                <span className={cn(selected ? 'text-route-700' : 'text-ink-500')}>{shortLabel(item)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
