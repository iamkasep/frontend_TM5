import { api, ENDPOINTS, USE_MOCK, API_CASE, convertKeys } from './api'
import { notifyDemoDataChanged } from './mock/mockStore'
import { sleep } from '@/lib/utils'

const POD_KEY = 'tms_demo_proof_of_delivery_v1'

/** Masa simpan file foto bukti serah terima (1×24 jam). */
export const POD_PHOTO_TTL_MS = 24 * 60 * 60 * 1000

const toSnake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()

function readMockProofs() {
  try {
    const value = JSON.parse(localStorage.getItem(POD_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function writeMockProofs(list) {
  localStorage.setItem(POD_KEY, JSON.stringify(list))
  notifyDemoDataChanged(POD_KEY)
}

/**
 * Purging otomatis file foto yang sudah melewati 1×24 jam sejak disubmit/diambil,
 * sementara metadata serah terima (AWB, driver, waktu, koordinat GPS) tetap disimpan.
 */
function purgeExpiredMockPhotos() {
  const list = readMockProofs()
  const now = Date.now()
  let mutated = false

  const next = list.map((item) => {
    if (!item || typeof item !== 'object') return item
    const baseTime = new Date(item.submittedAt || item.capturedAt || 0).getTime()
    if (!Number.isFinite(baseTime) || baseTime <= 0) return item
    const isExpired = now - baseTime >= POD_PHOTO_TTL_MS
    if (isExpired && (item.imageDataUrl || item.imageUrl || item.photoUrl)) {
      mutated = true
      return {
        ...item,
        imageDataUrl: null,
        imageUrl: null,
        photoUrl: null,
        photoExpired: true,
        photoDeletedAt: item.photoDeletedAt || new Date(baseTime + POD_PHOTO_TTL_MS).toISOString(),
      }
    }
    return item
  })

  if (mutated) {
    try { writeMockProofs(next) } catch { /* abaikan */ }
  }
  return next
}

/**
 * Normalisasi data POD agar UI tetap konsisten baik dari localStorage maupun response Laravel
 * (termasuk perhitungan sisa waktu auto-delete 1×24 jam).
 */
function normalizePod(item) {
  if (!item) return item
  const baseTime = new Date(item.submittedAt || item.capturedAt || 0).getTime()
  const hasValidTime = Number.isFinite(baseTime) && baseTime > 0
  const expiresAtMs = hasValidTime ? baseTime + POD_PHOTO_TTL_MS : null
  const remainingMs = expiresAtMs ? Math.max(0, expiresAtMs - Date.now()) : null
  const isExpired = Boolean(item.photoExpired) || (remainingMs !== null && remainingMs === 0)
  const rawImage = isExpired ? null : (item.imageDataUrl || item.imageUrl || item.photoUrl || null)

  return {
    ...item,
    imageDataUrl: rawImage,
    photoExpired: isExpired,
    photoExpiresAt: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
    photoRemainingMs: remainingMs,
    latitude: item.latitude !== null && item.latitude !== undefined ? Number(item.latitude) : null,
    longitude: item.longitude !== null && item.longitude !== undefined ? Number(item.longitude) : null,
  }
}

export const podService = {
  async list(params) {
    if (!USE_MOCK) {
      const list = (await api.get(ENDPOINTS.pods, { params })).data || []
      return Array.isArray(list) ? list.map(normalizePod) : []
    }
    await sleep(100)
    return purgeExpiredMockPhotos().map(normalizePod)
  },

  /**
   * Simpan bukti serah terima (POD).
   * - Mode API: bila `file` (Blob/File) disertakan, dikirim sebagai `multipart/form-data` ke `POST /pods`
   *   agar kompatibel dengan `$request->file('photo')` di Laravel; bila tidak, dikirim sebagai JSON.
   * - Mode lokal: disimpan dengan masa aktif file foto 1×24 jam.
   */
  async create(payload, file = null) {
    if (!USE_MOCK) {
      if (file instanceof Blob) {
        const formData = new FormData()
        const body = API_CASE === 'snake' ? convertKeys(payload, toSnake) : payload
        Object.entries(body).forEach(([key, value]) => {
          if (value !== null && value !== undefined && key !== 'imageDataUrl' && key !== 'image_data_url') {
            formData.append(key, String(value))
          }
        })
        formData.append('photo', file, file.name || `pod-${payload.shipmentId || Date.now()}.jpg`)
        const saved = (await api.post(ENDPOINTS.pods, formData)).data
        return normalizePod(saved)
      }
      const saved = (await api.post(ENDPOINTS.pods, payload)).data
      return normalizePod(saved)
    }

    await sleep(150)
    const submittedAt = new Date().toISOString()
    const record = {
      id: payload.id || `POD-${Date.now()}`,
      status: 'Terverifikasi',
      submittedAt,
      photoExpiresAt: new Date(Date.now() + POD_PHOTO_TTL_MS).toISOString(),
      ...payload,
    }
    try {
      const existing = purgeExpiredMockPhotos()
      writeMockProofs([record, ...existing.filter((x) => x.shipmentId !== record.shipmentId)])
    } catch {
      throw new Error('Penyimpanan bukti lokal penuh. Foto sudah dikompres, tetapi bukti belum tersimpan. Coba foto lebih kecil atau hubungi admin.')
    }
    return normalizePod(record)
  },
}
