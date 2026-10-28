import { useCallback, useEffect, useState } from 'react'

/** Menjalankan fungsi async dan melacak status loading/error. `reload()` untuk memuat ulang. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    fn()
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch((err) => { if (!cancelled) setState({ data: null, loading: false, error: err.message || 'Terjadi kesalahan' }) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  // Sinkronkan tampilan lintas role/tab saat mock data berubah di localStorage.
  useEffect(() => {
    const refreshDemo = (event) => {
      if (event.type === 'tms:demo-data-change' || event.type === 'tms-driver-events-updated' || String(event.key || '').startsWith('tms_demo_')) {
        setTick((t) => t + 1)
      }
    }
    window.addEventListener('tms:demo-data-change', refreshDemo)
    window.addEventListener('tms-driver-events-updated', refreshDemo)
    window.addEventListener('storage', refreshDemo)
    return () => {
      window.removeEventListener('tms:demo-data-change', refreshDemo)
      window.removeEventListener('tms-driver-events-updated', refreshDemo)
      window.removeEventListener('storage', refreshDemo)
    }
  }, [])

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    setTick((t) => t + 1)
  }, [])

  return { ...state, reload }
}
