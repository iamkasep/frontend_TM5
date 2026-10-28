import { cn } from '@/lib/utils'

// icon = ubin ikon, bar = garis aksen di sisi kiri kartu
const tones = {
  default: { icon: 'bg-ink-900 text-ink-100', bar: 'bg-ink-700' },
  route: { icon: 'bg-ink-900 text-route-400', bar: 'bg-route-500' },
  amber: { icon: 'bg-signal-100 text-signal-500', bar: 'bg-signal-400' },
  green: { icon: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500' },
  red: { icon: 'bg-rose-50 text-rose-600', bar: 'bg-rose-500' },
}

export default function StatCard({ label, value, icon: Icon, tone = 'default', hint }) {
  const t = tones[tone] ?? tones.default
  return (
    <div className="dash-rise relative flex items-center gap-4 overflow-hidden rounded-2xl bg-white p-4 shadow-sm shadow-ink-900/5 ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:shadow-md">
      <span className={cn('absolute inset-y-0 left-0 w-1', t.bar)} aria-hidden />
      {Icon && <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', t.icon)}><Icon className="size-5" /></span>}
      <div className="min-w-0">
        <p className="truncate text-sm text-ink-500">{label}</p>
        <p className="text-2xl font-extrabold leading-tight text-ink-900">{value}</p>
        {hint && <p className="truncate text-xs text-ink-400">{hint}</p>}
      </div>
    </div>
  )
}
