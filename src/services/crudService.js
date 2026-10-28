import { api, USE_MOCK } from './api'
import { createCollection } from './mock/mockStore'

/**
 * Pabrik service CRUD. Mode mock memakai penyimpanan memori; mode API memakai Axios.
 * ASUMSI SEMENTARA: respons API berbentuk data langsung (bukan dibungkus {data: ...}).
 */
export function createCrudService({ endpoint, mock, prefix }) {
  const store = USE_MOCK ? createCollection(mock, { prefix }) : null
  return {
    store,
    list: async (params) => (USE_MOCK ? store.list() : (await api.get(endpoint, { params })).data),
    get: async (id) => (USE_MOCK ? store.get(id) : (await api.get(`${endpoint}/${id}`)).data),
    create: async (data) => (USE_MOCK ? store.create(data) : (await api.post(endpoint, data)).data),
    update: async (id, data) => (USE_MOCK ? store.update(id, data) : (await api.patch(`${endpoint}/${id}`, data)).data),
    remove: async (id) => (USE_MOCK ? store.remove(id) : (await api.delete(`${endpoint}/${id}`)).data),
  }
}
