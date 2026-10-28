const dateFmt = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const numFmt = new Intl.NumberFormat('id-ID')

export const formatDate = (v) => (v ? dateFmt.format(new Date(v)) : '-')
export const formatDateTime = (v) => (v ? dateTimeFmt.format(new Date(v)) : '-')
export const formatNumber = (n) => numFmt.format(n ?? 0)
export const formatWeight = (kg) => `${formatNumber(kg)} kg`

export function formatRelative(v) {
  if (!v) return '-'
  const diff = Date.now() - new Date(v).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'baru saja'
  if (min < 60) return `${min} menit lalu`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} jam lalu`
  return `${Math.round(hr / 24)} hari lalu`
}
