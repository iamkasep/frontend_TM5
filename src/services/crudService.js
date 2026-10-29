import { api, USE_MOCK } from './api'
import { createCollection } from './mock/mockStore'

const identity = (x) => x

/**
 * Pabrik service CRUD. Mode mock memakai penyimpanan lokal; mode API memakai Axios.
 * Mendukung fungsi `normalize` (saat membaca respons) dan `serialize` (saat mengirim payload)
 * agar nama kolom database existing (dm_vendors, dm_vehicles, dm_drivers) selaras dengan UI.
 */
export function createCrudService({ endpoint, mock, prefix, normalize = identity, serialize = identity }) {
  const store = USE_MOCK ? createCollection((mock || []).map(normalize), { prefix }) : null
  const mapList = (items) => (Array.isArray(items) ? items.map(normalize) : [])

  return {
    store,
    list: async (params) => {
      const res = USE_MOCK ? await store.list() : (await api.get(endpoint, { params })).data
      return mapList(res)
    },
    get: async (id) => {
      const res = USE_MOCK ? await store.get(id) : (await api.get(`${endpoint}/${id}`)).data
      return normalize(res)
    },
    create: async (data) => {
      const payload = serialize(data)
      const res = USE_MOCK ? await store.create(payload) : (await api.post(endpoint, payload)).data
      return normalize(res)
    },
    update: async (id, data) => {
      const payload = serialize(data)
      const res = USE_MOCK ? await store.update(id, payload) : (await api.patch(`${endpoint}/${id}`, payload)).data
      return normalize(res)
    },
    remove: async (id) => (USE_MOCK ? store.remove(id) : (await api.delete(`${endpoint}/${id}`)).data),
  }
}
