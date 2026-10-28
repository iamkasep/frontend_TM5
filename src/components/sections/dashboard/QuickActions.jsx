import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Pintasan ke halaman yang sudah ada. items: [{ to, label, hint, icon }] */
export default function QuickActions({ items, className }) {
  return (
    <nav aria-label="Pintasan" className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>
      {items.map(({ to, label, hint, icon: Icon }) => (
        <Link key={to} to={to} className="dash-rise group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-ink-900/5 ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-route-400">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-900 text-route-400"><Icon className="size-5" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-ink-900">{label}</span>
            {hint && <span className="block truncate text-xs text-ink-500">{hint}</span>}
          </span>
          <ArrowRight className="hidden size-4 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-route-600 sm:block" aria-hidden />
        </Link>
      ))}
    </nav>
  )
}
