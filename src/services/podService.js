import { api, ENDPOINTS, USE_MOCK, API_CASE, convertKeys } from './api'
import { notifyDemoDataChanged } from './mock/mockStore'
import { sleep } from '@/lib/utils'

const POD_KEY = 'tms_demo_proof_of_delivery_v1'

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
 * Normalisasi data POD agar UI tetap konsisten baik dari localStorage maupun response Laravel
 * (mis. backend mengirim `imageUrl` / `photoUrl` alih-alih `imageDataUrl`).
 */
function normalizePod(item) {
  if (!item) return item
  return {
    ...item,
    imageDataUrl: item.imageDataUrl || item.imageUrl || item.photoUrl || null,
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
    return readMockProofs().map(normalizePod)
  },

  /**
   * Simpan bukti serah terima (POD).
   * - Mode API: bila `file` (Blob/File) disertakan, dikirim sebagai `multipart/form-data` ke `POST /pods`
   *   agar kompatibel dengan `$request->file('photo')` di Laravel; bila tidak, dikirim sebagai JSON.
   * - Mode simulasi: disimpan di localStorage browser ini.
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
    const record = {
      id: payload.id || `POD-${Date.now()}`,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      ...payload,
    }
    try {
      const existing = readMockProofs()
      writeMockProofs([record, ...existing.filter((x) => x.shipmentId !== record.shipmentId)])
    } catch {
      throw new Error('Penyimpanan bukti lokal penuh. Foto sudah dikompres, tetapi bukti belum tersimpan. Coba foto lebih kecil atau hubungi admin.')
    }
    return normalizePod(record)
  },
}
