import { cn } from '@/lib/utils'
import { SHIPMENT_STATUS, ENTITY_STATUS } from '@/lib/constants'

const tones = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-300',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-300',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
}

export function Badge({ tone = 'slate', className, children }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', tones[tone], className)}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const s = SHIPMENT_STATUS[status]
  if (!s) return <Badge>{status}</Badge>
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', s.badge)}>
      <span className={cn('size-1.5 rounded-full', s.dot)} aria-hidden />
      {s.label}
    </span>
  )
}

export function EntityStatusBadge({ status }) {
  const s = ENTITY_STATUS[status]
  return <Badge tone={s?.tone}>{s?.label ?? status}</Badge>
}
