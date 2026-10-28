import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import Button from '@/components/ui/Button'
import { cn, getPath } from '@/lib/utils'

/**
 * columns: [{ key, header, sortable, sortValue(row), render(row), className }]
 * filters: [{ key, label, options: [{value,label}] }]  (cocokkan row[key] === value)
 */
export default function DataTable({
  columns, rows, loading, error, onRetry, searchKeys = [], searchPlaceholder = 'Cari...',
  filters = [], pageSize = 8, onRowClick, emptyTitle = 'Belum ada data', emptyDescription, toolbar, initialSort = null,
}) {
  const [q, setQ] = useState('')
  const [fv, setFv] = useState({})
  const [sort, setSort] = useState(initialSort)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let r = rows || []
    const term = q.trim().toLowerCase()
    if (term) r = r.filter((row) => searchKeys.some((k) => String(getPath(row, k) ?? '').toLowerCase().includes(term)))
    filters.forEach((f) => {
      const v = fv[f.key]
      if (v) r = r.filter((row) => String(getPath(row, f.key)) === v)
    })
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)
      const val = (row) => (col?.sortValue ? col.sortValue(row) : getPath(row, sort.key))
      r = [...r].sort((a, b) => {
        const x = val(a); const y = val(b)
        const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'id')
        return sort.dir === 'asc' ? c : -c
      })
    }
    return r
  }, [rows, q, fv, sort, searchKeys, filters, columns])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pageCount)
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize)
  const from = filtered.length ? (current - 1) * pageSize + 1 : 0

  const toggleSort = (key) => {
    setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }))
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            type="search" value={q} placeholder={searchPlaceholder} aria-label="Cari"
            onChange={(e) => { setQ(e.target.value); setPage(1) }}
            className="h-10 w-full rounded-lg bg-ink-50 pl-9 pr-3 text-sm ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 focus:ring-2 focus:ring-route-600 focus:outline-none"
          />
        </div>
        {filters.map((f) => (
          <select
            key={f.key} aria-label={f.label} value={fv[f.key] || ''}
            onChange={(e) => { setFv((v) => ({ ...v, [f.key]: e.target.value })); setPage(1) }}
            className="h-10 rounded-lg bg-white px-3 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-route-600 focus:outline-none"
          >
            <option value="">{f.label}: semua</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        {toolbar}
      </div>

      {loading ? <Loading />
        : error ? <ErrorState message={error} onRetry={onRetry} />
        : filtered.length === 0 ? (
          <EmptyState
            title={rows?.length ? 'Tidak ada hasil yang cocok' : emptyTitle}
            description={rows?.length ? 'Ubah kata kunci atau filter pencarian.' : emptyDescription}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-ink-50 text-xs font-semibold text-ink-500">
                  <tr>
                    {columns.map((c) => {
                      const active = sort?.key === c.key
                      return (
                        <th key={c.key} scope="col" className={cn('px-4 py-3', c.className)} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                          {c.sortable ? (
                            <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-ink-800">
                              {c.header}
                              {active ? (sort.dir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />) : <ChevronsUpDown className="size-3.5 opacity-50" />}
                            </button>
                          ) : c.header}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {visible.map((row, i) => (
                    <tr
                      key={row.id ?? i}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      className={cn(onRowClick && 'cursor-pointer hover:bg-ink-50 focus-visible:bg-ink-50')}
                    >
                      {columns.map((c) => (
                        <td key={c.key} className={cn('px-4 py-3 align-middle text-ink-700', c.className)}>
                          {c.render ? c.render(row) : getPath(row, c.key) ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-sm text-ink-500">
              <span>Menampilkan {from}–{Math.min(current * pageSize, filtered.length)} dari {filtered.length}</span>
              <div className="flex items-center gap-1">
                <Button variant="secondary" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)} aria-label="Halaman sebelumnya"><ChevronLeft className="size-4" /></Button>
                <span className="px-2 tabular-nums">{current} / {pageCount}</span>
                <Button variant="secondary" size="sm" disabled={current >= pageCount} onClick={() => setPage(current + 1)} aria-label="Halaman berikutnya"><ChevronRight className="size-4" /></Button>
              </div>
            </div>
          </>
        )}
    </Card>
  )
}
