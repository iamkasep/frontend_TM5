import { api, USE_MOCK, ENDPOINTS } from './api'
import { createCrudService } from './crudService'
import { shipments } from './mock/data/shipments'
import { syncMockTripFromShipment } from './mock/mockStore'
import { CITIES, pointAt } from '@/lib/geo'
import { sleep } from '@/lib/utils'

const crud = createCrudService({ endpoint: ENDPOINTS.shipments, mock: shipments, prefix: 'SHP' })

/**
 * Pembatasan data per role HANYA untuk simulasi di frontend.
 * Backend wajib memvalidasi role, izin, dan kepemilikan data sendiri.
 */
const inScope = (s, scope) => {
  if (!scope || scope.role === 'superadmin' || scope.role === 'admin') return true
  if (scope.role === 'customer') return s.customerId === scope.customerId
  if (scope.role === 'driver') return s.driverId === scope.driverId
  return false
}

const place = (city) => ({ city, ...(CITIES[city] || {}) })
const originFromForm = (form, existing) => {
  if (form.origin && Number.isFinite(Number(form.origin.lat)) && Number.isFinite(Number(form.origin.lng))) return { ...form.origin, lat: Number(form.origin.lat), lng: Number(form.origin.lng) }
  if (form.originCity && CITIES[form.originCity]) return place(form.originCity)
  return existing?.origin || { city: 'Bandung', ...CITIES.Bandung }
}
const destinationFromForm = (form, existing) => {
  if (form.destination && Number.isFinite(Number(form.destination.lat)) && Number.isFinite(Number(form.destination.lng))) return { ...form.destination, lat: Number(form.destination.lat), lng: Number(form.destination.lng) }
  if (form.destCity && CITIES[form.destCity]) return place(form.destCity)
  return existing?.destination || { city: 'Bandung', ...CITIES.Bandung }
}
const nowIso = () => new Date().toISOString()
const PROGRESS_MIN = { assigned: 0, picked_up: 0.03, in_transit: 0.2, delayed: 0.2 }

export const shipmentService = {
  async list(scope) {
    if (!USE_MOCK) return crud.list()
    return (await crud.list()).filter((s) => inScope(s, scope))
  },

  async get(id, scope) {
    const s = await crud.get(id)
    if (USE_MOCK && !inScope(s, scope)) throw new Error('Pengiriman tidak ditemukan')
    return s
  },

  async findByTrackingNumber(resi, scope) {
    const term = resi.trim().toLowerCase()
    if (!USE_MOCK) {
      // ASUMSI: GET /shipments/track/{awb} -> shipment, 404 bila tidak ada.
      try {
        return (await api.get(`${ENDPOINTS.shipments}/track/${encodeURIComponent(resi.trim())}`)).data ?? null
      } catch (err) {
        if (err?.status === 404) return null
        throw err
      }
    }
    return (await this.list(scope)).find((s) => s.trackingNumber.toLowerCase() === term) ?? null
  },

  /** form: { customerId, customerName, tripId, tripCode, awb, origin|originCity, destination|destCity, weightKg, eta, notes } */
  async create(form) {
    if (!USE_MOCK) return crud.create(form)
    const created = new Date()
    const seq = crud.store.nextId().split('-')[1]
    const awb = String(form.awb || form.trackingNumber || '').trim()
    const existing = await crud.list()
    if (awb && existing.some((item) => item.trackingNumber.toLowerCase() === awb.toLowerCase())) {
      throw new Error('Nomor AWB / Resi sudah digunakan. Pilih nomor lain.')
    }
    const origin = originFromForm(form)
    const destination = destinationFromForm(form)
    return crud.store.create({
      trackingNumber: awb || `TMS-${created.toISOString().slice(0, 10).replaceAll('-', '')}-${seq}`,
      customerId: form.customerId,
      customerName: form.customerName,
      originLocationId: form.originLocationId || null, destinationLocationId: form.destinationLocationId || null,
      tripId: form.tripId || null, tripCode: form.tripCode || null,
      driverId: null, driverName: null, vehicleId: null, vehiclePlate: null,
      origin,
      destination,
      weightKg: Number(form.weightKg),
      status: 'pending',
      progress: 0,
      notes: form.notes || '',
      createdAt: created.toISOString(),
      eta: new Date(form.eta).toISOString(),
      history: [{
        status: 'pending', at: created.toISOString(), location: origin.city,
        note: 'Pesanan dibuat, menunggu penugasan driver', lat: origin.lat, lng: origin.lng,
      }],
    })
  },

  async update(id, form) {
    if (!USE_MOCK) return crud.update(id, form)
    const existing = await crud.store.get(id)
    const patch = {}
    if ('customerId' in form) patch.customerId = form.customerId
    if ('customerName' in form) patch.customerName = form.customerName
    if ('originLocationId' in form) patch.originLocationId = form.originLocationId || null
    if ('destinationLocationId' in form) patch.destinationLocationId = form.destinationLocationId || null
    if ('origin' in form || 'originCity' in form) patch.origin = originFromForm(form, existing)
    if ('destination' in form || 'destCity' in form) patch.destination = destinationFromForm(form, existing)
    if ('weightKg' in form) patch.weightKg = Number(form.weightKg)
    if ('eta' in form && form.eta) patch.eta = new Date(form.eta).toISOString()
    if ('etaSource' in form) patch.etaSource = form.etaSource
    if ('etaInitial' in form) patch.etaInitial = form.etaInitial
    if ('etaUpdatedAt' in form) patch.etaUpdatedAt = form.etaUpdatedAt
    if ('notes' in form) patch.notes = form.notes || ''
    // Posisi manual dari admin dicatat sebagai titik perjalanan baru, bukan mengubah tujuan pengiriman.
    if (form.manualPosition && Number.isFinite(Number(form.manualPosition.lat)) && Number.isFinite(Number(form.manualPosition.lng))) {
      const lat = Number(form.manualPosition.lat)
      const lng = Number(form.manualPosition.lng)
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new Error('Koordinat posisi driver tidak valid.')
      const at = nowIso()
      const note = String(form.manualPosition.note || '').trim()
      const fromDriver = form.manualPosition.source === 'driver_offline'
      patch.history = [...(existing.history || []), {
        status: existing.status, at, lat, lng, source: fromDriver ? 'driver_offline' : 'admin_manual',
        location: fromDriver ? 'Posisi GPS driver (offline)' : 'Posisi manual dari SMS',
        note: fromDriver
          ? `Posisi GPS terakhir driver saat offline diterapkan oleh admin${note ? `: ${note}` : ''}`
          : `Posisi driver diperbarui manual oleh admin${note ? `: ${note}` : ' berdasarkan koordinat yang dikirim melalui SMS'}`,
      }]
    }
    if ('tripId' in form) patch.tripId = form.tripId || null
    if ('tripIds' in form) patch.tripIds = [...new Set(form.tripIds || [])]
    if ('tripCode' in form) patch.tripCode = form.tripCode || null
    const nextAwb = String(form.awb || form.trackingNumber || '').trim()
    if (nextAwb && nextAwb !== existing.trackingNumber) {
      const all = await crud.list()
      if (all.some((item) => item.id !== id && item.trackingNumber.toLowerCase() === nextAwb.toLowerCase())) throw new Error('Nomor AWB / Resi sudah digunakan. Pilih nomor lain.')
      patch.trackingNumber = nextAwb
    }
    return crud.store.update(id, patch)
  },

  // ASUMSI SEMENTARA untuk mode API: POST {id}/assign dan PATCH {id}/status
  async assignDriver(id, driver) {
    if (!USE_MOCK) return (await api.post(`${ENDPOINTS.shipments}/${id}/assign`, { driverId: driver.id })).data
    const s = await crud.store.get(id)
    return crud.store.update(id, {
      driverId: driver.id, driverName: driver.name, vehicleId: driver.vehicleId, vehiclePlate: driver.vehiclePlate,
      status: 'assigned',
      history: [...(s.history || []), {
        status: 'assigned', at: nowIso(), location: s.origin.city, note: `Driver ${driver.name} ditugaskan`,
        lat: s.origin.lat, lng: s.origin.lng,
      }],
    })
  },

  async updateStatus(id, status, note) {
    if (!USE_MOCK) return (await api.patch(`${ENDPOINTS.shipments}/${id}/status`, { status, note })).data
    const s = await crud.store.get(id)
    const progress = status === 'delivered' ? 1 : Math.max(s.progress ?? 0, PROGRESS_MIN[status] ?? 0)
    const [lat, lng] = pointAt(s.origin, s.destination, progress)
    const defaultNote = {
      picked_up: 'Barang dijemput di lokasi asal', in_transit: 'Pengiriman dalam perjalanan',
      delivered: 'Barang diterima di lokasi tujuan', delayed: 'Pengiriman terlambat', cancelled: 'Pengiriman dibatalkan',
    }[status]
    const updated = await crud.store.update(id, {
      status, progress,
      history: [...(s.history || []), {
        status, at: nowIso(), lat, lng, note: note || defaultNote,
        location: status === 'delivered' ? s.destination.city : `Perjalanan ${s.origin.city} - ${s.destination.city}`,
      }],
    })
    // Hubungkan status AWB ke trip terkait agar dashboard operasional tetap konsisten.
    if (s.tripId) {
      syncMockTripFromShipment(s.tripId, status, await crud.list())
    }
    return updated
  },

  cancel(id) { return this.updateStatus(id, 'cancelled', 'Pengiriman dibatalkan oleh admin') },

  /** Riwayat lokasi dipakai oleh halaman tracking. Pada mode simulasi diambil dari riwayat status. */
  async locationHistory(id, scope) {
    if (!USE_MOCK) {
      // ASUMSI: GET /shipments/{id}/locations -> [{ lat, lng, at }] (atau [[lat, lng]]).
      const points = (await api.get(`${ENDPOINTS.shipments}/${id}/locations`)).data || []
      return points.map((p) => (Array.isArray(p) ? p : [Number(p.lat ?? p.latitude), Number(p.lng ?? p.longitude)]))
    }
    await sleep(100)
    const s = await this.get(id, scope)
    return (s.history || []).map((h) => [h.lat, h.lng])
  },
}
