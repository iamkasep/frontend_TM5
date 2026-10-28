/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogOut, ChevronDown, ChevronRight } from 'lucide-react'
import BrandLogo from '@/components/ui/BrandLogo'
import { MENUS, ROLE_LABEL } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { useUnreadCount } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

/** Item menu aktif = path terpanjang yang cocok dengan lokasi saat ini. */
export function useActivePath(items) {
  const { pathname } = useLocation()
  return items
    .flatMap((item) => item.children || [item])
    .filter((i) => pathname === i.path || pathname.startsWith(`${i.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]?.path
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const items = MENUS[user.role]
  const unread = useUnreadCount()
  const active = useActivePath(items)
  const [expandedMenus, setExpandedMenus] = useState(() => {
    const initial = {}
    items.filter((item) => item.children).forEach((item) => {
      initial[item.label] = item.children.some((child) => window.location.pathname === child.path || window.location.pathname.startsWith(`${child.path}/`))
    })
    return initial
  })

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-ink-950/50 lg:hidden" onClick={onClose} aria-hidden />}
      <aside className={cn('fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-hidden bg-gradient-to-b from-ink-900 via-ink-900 to-ink-950 text-ink-200 transition-transform lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="pointer-events-none absolute -left-16 -top-16 -z-10 size-56 rounded-full bg-route-500/20 blur-3xl" aria-hidden />
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <BrandLogo className="size-10" />
          <div className="leading-tight">
            <p className="text-sm font-extrabold tracking-wide text-white">TMS</p>
            <p className="text-xs text-ink-300">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Menu utama">
          {items.map((item) => {
            if (item.children) {
              const groupActive = item.children.some((child) => child.path === active)
              const expanded = Boolean(expandedMenus[item.label])
              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => setExpandedMenus((current) => ({ ...current, [item.label]: !current[item.label] }))}
                    aria-expanded={expanded}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                      groupActive ? 'bg-white/10 text-white' : 'text-ink-300 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <item.icon className="size-[18px] shrink-0" aria-hidden />
                    <span className="flex-1">{item.label}</span>
                    {expanded ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
                  </button>
                  {expanded && (
                    <div className="ml-3 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                      {item.children.map((child) => {
                        const childActive = child.path === active
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            onClick={onClose}
                            aria-current={childActive ? 'page' : undefined}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                              childActive ? 'bg-route-500/15 text-white shadow-[inset_3px_0_0_var(--color-route-400)]' : 'text-ink-300 hover:bg-white/5 hover:text-white',
                            )}
                          >
                            <child.icon className="size-[17px] shrink-0" aria-hidden />
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }
            const isActive = item.path === active
            return (
              <Link
                key={item.path} to={item.path} onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-route-500/15 text-white shadow-[inset_3px_0_0_var(--color-route-400)]' : 'text-ink-300 hover:bg-white/5 hover:text-white',
                )}
              >
                <item.icon className="size-[18px] shrink-0" aria-hidden />
                {item.label}
                {item.path.endsWith('/notifications') && unread > 0 && (
                  <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold leading-5 text-white" aria-label={`${unread} belum dibaca`}>{unread > 99 ? '99+' : unread}</span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-300 hover:bg-white/5 hover:text-white">
            <LogOut className="size-[18px]" aria-hidden /> Keluar
          </button>
        </div>
      </aside>
    </>
  )
}
