export const cn = (...classes) => classes.flat().filter(Boolean).join(' ')

export const sleep = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))

export const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)

/** Unduh data sebagai CSV (dibuat di browser, tanpa backend). */
export function downloadCsv(filename, rows, columns) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = columns.map((c) => esc(c.header)).join(',')
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(','))
  const blob = new Blob(['\uFEFF' + [head, ...body].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Sapaan sesuai jam lokal. */
export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
}
