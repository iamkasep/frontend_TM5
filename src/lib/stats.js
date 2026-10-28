import { SHIPMENT_STATUS, ACTIVE_STATUSES } from './constants'

export function summarize(list) {
  const byStatus = Object.fromEntries(Object.keys(SHIPMENT_STATUS).map((k) => [k, 0]))
  list.forEach((s) => { if (s.status in byStatus) byStatus[s.status] += 1 })
  return {
    total: list.length,
    byStatus,
    active: list.filter((s) => ACTIVE_STATUSES.includes(s.status)).length,
    delivered: byStatus.delivered,
    issues: byStatus.delayed + byStatus.cancelled,
    pending: byStatus.pending,
  }
}

export function statusChartData(summary) {
  return Object.entries(SHIPMENT_STATUS)
    .map(([key, s]) => ({ key, name: s.label, value: summary.byStatus[key], color: s.color }))
    .filter((d) => d.value > 0)
}

/** Jumlah pengiriman dibuat per hari (N hari terakhir). */
export function dailyTrend(list, days = 7) {
  const out = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const next = new Date(d)
    next.setDate(d.getDate() + 1)
    out.push({
      label: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      total: list.filter((s) => {
        const t = new Date(s.createdAt)
        return t >= d && t < next
      }).length,
    })
  }
  return out
}

export function recentEvents(list, n = 6) {
  return list
    .flatMap((s) => (s.history ?? []).map((h) => ({ ...h, shipmentId: s.id, trackingNumber: s.trackingNumber })))
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, n)
}
