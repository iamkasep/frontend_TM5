import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { MENUS, ROLE_LABEL } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'

const SEGMENT_LABEL = { new: 'Buat Pengiriman', edit: 'Edit', shipments: 'Pengiriman' }

export default function Breadcrumb() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const segments = pathname.split('/').filter(Boolean).slice(1) // buang segmen role
  const menu = MENUS[user.role]

  const crumbs = segments.map((seg, i) => {
    const path = `/${user.role}/${segments.slice(0, i + 1).join('/')}`
    const label = menu.find((m) => m.path === path)?.label ?? SEGMENT_LABEL[seg] ?? decodeURIComponent(seg)
    return { path, label }
  })

  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1 text-xs text-ink-500">
      <Link to={`/${user.role}/dashboard`} className="hover:text-ink-800">{ROLE_LABEL[user.role]}</Link>
      {crumbs.map((c, i) => (
        <span key={c.path} className="flex items-center gap-1">
          <ChevronRight className="size-3" aria-hidden />
          {i === crumbs.length - 1
            ? <span className="font-semibold text-ink-700" aria-current="page">{c.label}</span>
            : <Link to={c.path} className="hover:text-ink-800">{c.label}</Link>}
        </span>
      ))}
    </nav>
  )
}
