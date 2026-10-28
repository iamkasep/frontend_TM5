import { Link } from 'react-router-dom'
import { MENUS } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { useActivePath } from './Sidebar'
import { cn } from '@/lib/utils'

/** Navigasi bawah untuk driver di ponsel (mobile-first). */
export default function BottomNav() {
  const { user } = useAuth()
  const all = MENUS[user.role]
  const active = useActivePath(all)
  const items = all.filter((i) => i.bottom)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-ink-100 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Navigasi cepat">
      {items.map((item) => (
        <Link
          key={item.path} to={item.path}
          aria-current={item.path === active ? 'page' : undefined}
          className={cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', item.path === active ? 'text-route-600' : 'text-ink-400')}
        >
          <item.icon className="size-5" aria-hidden />
          <span className="max-w-full truncate px-1">{item.label.split(' ')[0]}</span>
        </Link>
      ))}
    </nav>
  )
}
