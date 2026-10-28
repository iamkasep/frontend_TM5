/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, type, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])

  const api = useMemo(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), warn: (m) => push('warn', m) }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-20 z-[70] flex flex-col items-center gap-2 lg:bottom-6 lg:items-end" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-lg bg-ink-900 px-4 py-3 text-sm text-white shadow-lg">
            {t.type === 'success' && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-route-400" />}
            {t.type === 'warn' && <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />}
            {t.type === 'error' && <XCircle className="mt-0.5 size-4 shrink-0 text-rose-400" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider')
  return ctx
}
