import { cn } from '@/lib/utils'

export function Card({ className, children, ...props }) {
  return <section className={cn('rounded-2xl bg-white shadow-sm shadow-ink-900/5 ring-1 ring-ink-100', className)} {...props}>{children}</section>
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-1 h-4 w-1 shrink-0 rounded-full bg-route-500" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className, children }) {
  return <div className={cn('p-5', className)}>{children}</div>
}
