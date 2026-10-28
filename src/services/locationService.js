import { api, ENDPOINTS, USE_MOCK } from './api'
import { createCollection, notifyDemoDataChanged } from './mock/mockStore'

const seed = [
  { id: 'LOC-001', code: 'WH-BDG', name: 'Gudang Bandung', type: 'warehouse', address: 'Bandung, Jawa Barat', latitude: -6.9147, longitude: 107.6098, status: 'active' },
  { id: 'LOC-002', code: 'AP-JKT', name: 'Bandara Soekarno-Hatta', type: 'airport', address: 'Tangerang, Banten', latitude: -6.1256, longitude: 106.6559, status: 'active' },
  { id: 'LOC-003', code: 'SITE-JKT', name: 'Lokasi Customer Jakarta', type: 'customer_site', address: 'Jakarta, DKI Jakarta', latitude: -6.2088, longitude: 106.8456, status: 'active' },
  { id: 'LOC-004', code: 'AP-SMG', name: 'Bandara Ahmad Yani Semarang', type: 'airport', address: 'Semarang, Jawa Tengah', latitude: -6.9727, longitude: 110.3755, status: 'active' },
  { id: 'LOC-005', code: 'SITE-SMG', name: 'Site Semarang', type: 'customer_site', address: 'Semarang, Jawa Tengah', latitude: -6.9667, longitude: 110.4167, status: 'active' },
]
const store = USE_MOCK ? createCollection(seed, { prefix: 'LOC' }) : null
const endpoint = ENDPOINTS.locations || '/locations'
export const locationService = {
  async list() {
    if (!USE_MOCK) return (await api.get(endpoint)).data
    const current = await store.list()
    // Tambahkan seed lokasi baru ke browser yang sudah pernah membuka versi demo sebelumnya.
    const missing = seed.filter((item) => !current.some((saved) => saved.id === item.id))
    for (const item of missing) await store.create(item)
    return store.list()
  },
  async get(id) { return USE_MOCK ? store.get(id) : (await api.get(`${endpoint}/${id}`)).data },
  async create(data) { return USE_MOCK ? store.create(data) : (await api.post(endpoint, data)).data },
  async update(id, data) { return USE_MOCK ? store.update(id, data) : (await api.patch(`${endpoint}/${id}`, data)).data },
  async remove(id) {
    // Lokasi yang pernah dipakai tidak dihapus fisik; lokasi master dinonaktifkan.
    if (!USE_MOCK) return (await api.patch(`${endpoint}/${id}`, { status: 'inactive' })).data
    const result = await store.update(id, { status: 'inactive' })
    notifyDemoDataChanged('locations')
    return result
  },
}
