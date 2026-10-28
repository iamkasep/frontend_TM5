import { useId } from 'react'
import { cn } from '@/lib/utils'

const base = 'w-full rounded-lg border-0 bg-white px-3 text-sm text-ink-900 ring-1 ring-inset placeholder:text-ink-300 focus:ring-2 focus:ring-route-600 focus:outline-none'

export function Field({ label, error, hint, required, children, htmlFor, className }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink-700">
          {label}{required && <span className="text-rose-600"> *</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1 text-xs text-rose-600" role="alert">{error}</p> : hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  )
}

export function Input({ label, error, hint, className, wrapperClassName, ...props }) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} required={props.required} htmlFor={id} className={wrapperClassName}>
      <input id={id} aria-invalid={!!error} className={cn(base, 'h-10', error ? 'ring-rose-400' : 'ring-ink-200', className)} {...props} />
    </Field>
  )
}

export function Select({ label, error, hint, options = [], placeholder = 'Pilih...', className, wrapperClassName, ...props }) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} required={props.required} htmlFor={id} className={wrapperClassName}>
      <select id={id} aria-invalid={!!error} className={cn(base, 'h-10', error ? 'ring-rose-400' : 'ring-ink-200', className)} {...props}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  )
}

export function Textarea({ label, error, hint, className, wrapperClassName, ...props }) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} required={props.required} htmlFor={id} className={wrapperClassName}>
      <textarea id={id} rows={3} aria-invalid={!!error} className={cn(base, 'py-2', error ? 'ring-rose-400' : 'ring-ink-200', className)} {...props} />
    </Field>
  )
}
