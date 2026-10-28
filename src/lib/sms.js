/** Nomor penerima SMS (gateway/admin). Boleh kosong: driver memilih sendiri di aplikasi SMS. */
export const SMS_GATEWAY_NUMBER = (import.meta.env.VITE_SMS_GATEWAY_NUMBER || '').replace(/[^\d+]/g, '')

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

/**
 * Format pesan ringkas (< 160 karakter) dan mudah di-parse backend:
 * TMS|<nomor resi>|<lat>,<lng>|<akurasi meter>|<waktu UTC, ISO tanpa detik>
 */
export function buildGpsSms({ trackingNumber, position, fixedAt }) {
  const time = (fixedAt ?? new Date()).toISOString().slice(0, 16) + 'Z'
  return [
    'TMS',
    trackingNumber || '-',
    `${position.lat.toFixed(6)},${position.lng.toFixed(6)}`,
    Math.round(position.accuracy ?? 0),
    time,
  ].join('|')
}

/** Tautan sms: yang membuka aplikasi SMS bawaan dengan isi pesan sudah terisi. */
export function buildSmsHref(body, number = SMS_GATEWAY_NUMBER) {
  const separator = isIOS() ? '&' : '?'
  return `sms:${number}${separator}body=${encodeURIComponent(body)}`
}

export const SMS_FORMAT_HINT = 'TMS|<nomor resi>|<lat>,<lng>|<akurasi meter>|<waktu UTC>'

/**
 * Kebalikan dari buildGpsSms: membaca pesan SMS format TMS menjadi data posisi.
 * Isi SMS boleh diawali/diakhiri teks lain (mis. nama pengirim dari aplikasi SMS).
 * Mengembalikan { trackingNumber|null, lat, lng, accuracy|null, fixedAt (ISO), raw } atau null bila tidak valid.
 * Pesan dari luar TIDAK dipercaya: koordinat dan waktu divalidasi, pengirim harus dicek backend.
 */
export function parseGpsSms(text) {
  const raw = String(text ?? '')
  const start = raw.search(/TMS\s*\|/i)
  if (start < 0) return null
  const line = raw.slice(start).split(/\r?\n/)[0].trim()
  const parts = line.split('|').map((p) => p.trim())
  if (parts.length < 5 || parts[0].toUpperCase() !== 'TMS') return null
  const [, resi, coords, acc, time] = parts
  const [latText, lngText] = coords.split(',')
  if (!latText || !lngText) return null
  const lat = Number(latText)
  const lng = Number(lngText)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null
  const fixedAt = new Date(time)
  if (Number.isNaN(fixedAt.getTime())) return null
  const accuracy = acc === '' ? NaN : Number(acc)
  return {
    trackingNumber: resi && resi !== '-' ? resi : null,
    lat,
    lng,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    fixedAt: fixedAt.toISOString(),
    raw: line,
  }
}
