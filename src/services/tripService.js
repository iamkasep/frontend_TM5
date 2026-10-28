import { trips as initialTrips } from './mock/data/trips'
import { api, ENDPOINTS, USE_MOCK } from '@/services/api'
import { shipmentService } from '@/services/shipmentService'
import { driverService } from '@/services/driverService'
import { notifyDemoDataChanged } from './mock/mockStore'

const KEY = 'tms_demo_trips_v2'
const EVENTS_KEY = 'tms_demo_tracking_events_v2'
const LINK_SEED_KEY = 'tms_demo_trip_links_seeded_v2'

const clone = (value) => JSON.parse(JSON.stringify(value))

const read = (key, fallback) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key))
    return parsed ?? clone(fallback)
  } catch {
    return clone(fallback)
  }
}

const write = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
  notifyDemoDataChanged(key)
}

const initialEvents = initialTrips.flatMap((trip) => [{
  id: `${trip.id}-EVT-001`,
  tripId: trip.id,
  eventType: 'trip_created',
  eventTime: trip.plannedDeparture,
  source: 'manual',
  latitude: null,
  longitude: null,
  remarks: 'Trip dibuat (data simulasi)',
  podId: null,
}])

export const tripService = {
  async list() {
    if (!USE_MOCK) return (await api.get(ENDPOINTS.trips)).data
    const trips = read(KEY, initialTrips)
    if (!localStorage.getItem(KEY)) write(KEY, trips)
    // Seed hubungan trip-AWB satu kali agar data awal juga saling terhubung.
    if (!localStorage.getItem(LINK_SEED_KEY)) {
      localStorage.setItem(LINK_SEED_KEY, '1')
      const awbs = await shipmentService.list()
      for (const trip of trips) {
        for (const shipmentId of (trip.shipmentIds || [])) {
          const awb = awbs.find((item) => item.id === shipmentId)
          if (awb && !awb.tripId) {
            await shipmentService.update(awb.id, { tripId: trip.id, tripCode: trip.tripCode })
          }
        }
      }
    }
    return trips
  },

  async get(id) {
    if (!USE_MOCK) return (await api.get(`${ENDPOINTS.trips}/${id}`)).data
    const trip = (await this.list()).find((item) => item.id === id)
    if (!trip) throw new Error('Trip tidak ditemukan')
    return trip
  },

  /**
   * Hitung ETA AWB dari jadwal trip terakhir yang terhubung.
   * Trip harus punya plannedArrival; jika trip terakhir selesai, gunakan actualArrival.
   */
  async syncShipmentEtas() {
    if (!USE_MOCK) return
    const trips = await this.list()
    const shipments = await shipmentService.list()
    for (const shipment of shipments) {
      const linked = trips.filter((trip) => (trip.shipmentIds || []).includes(shipment.id))
      if (!linked.length) {
        if (shipment.etaSource === 'trip_schedule' && shipment.etaInitial) {
          await shipmentService.update(shipment.id, {
            eta: shipment.etaInitial,
            etaSource: null,
            etaUpdatedAt: new Date().toISOString(),
          })
        }
        continue
      }
      // Jadwal keberangkatan menentukan urutan segmen; jika tidak tersedia, gunakan urutan trip yang ada.
      const ordered = [...linked].sort((a, b) => {
        const ta = a.plannedDeparture ? new Date(a.plannedDeparture).getTime() : Number.POSITIVE_INFINITY
        const tb = b.plannedDeparture ? new Date(b.plannedDeparture).getTime() : Number.POSITIVE_INFINITY
        if (ta !== tb) return ta - tb
        return String(a.tripCode || a.id).localeCompare(String(b.tripCode || b.id))
      })
      const finalTrip = ordered[ordered.length - 1]
      const eta = finalTrip.status === 'completed' && finalTrip.actualArrival
        ? finalTrip.actualArrival
        : finalTrip.plannedArrival
      // Jangan menebak ETA jika jadwal trip terakhir belum lengkap; pulihkan ETA awal bila sebelumnya otomatis.
      if (!eta || !Number.isFinite(new Date(eta).getTime())) {
        if (shipment.etaSource === 'trip_schedule' && shipment.etaInitial) {
          await shipmentService.update(shipment.id, {
            eta: shipment.etaInitial,
            etaSource: null,
            etaUpdatedAt: new Date().toISOString(),
          })
        }
        continue
      }
      const currentTime = shipment.eta ? new Date(shipment.eta).getTime() : NaN
      const nextTime = new Date(eta).getTime()
      if (currentTime !== nextTime || shipment.etaSource !== 'trip_schedule') {
        await shipmentService.update(shipment.id, {
          etaInitial: shipment.etaSource === 'trip_schedule' ? (shipment.etaInitial || shipment.eta) : (shipment.eta || null),
          eta: new Date(nextTime).toISOString(),
          etaSource: 'trip_schedule',
          etaUpdatedAt: new Date().toISOString(),
        })
      }
    }
  },

  async create(data) {
    if (!USE_MOCK) return (await api.post(ENDPOINTS.trips, data)).data
    const list = await this.list()
    const maxSeq = Math.max(0, ...list.map((t) => Number(t.id.split('-').pop()) || 0))
    const id = `TRP-${String(maxSeq + 1).padStart(3, '0')}`
    const datePart = new Date().toISOString().slice(0, 10).replaceAll('-', '')
    const trip = {
      ...data,
      id,
      tripCode: `TRIP-${datePart}-${id.split('-')[1]}`,
      status: data.status || 'planned',
      shipmentIds: data.shipmentIds || [],
      actualDeparture: null,
      actualArrival: null,
    }
    write(KEY, [trip, ...list])
    await this.addEvent({
      tripId: id,
      eventType: 'trip_created',
      source: 'manual',
      remarks: 'Trip dibuat (data simulasi)',
    })
    await this.syncShipmentEtas()
    return trip
  },

  async update(id, patch) {
    if (!USE_MOCK) return (await api.patch(`${ENDPOINTS.trips}/${id}`, patch)).data
    const list = await this.list()
    const next = list.map((t) => (t.id === id ? { ...t, ...patch } : t))
    if (!next.some((t) => t.id === id)) throw new Error('Trip tidak ditemukan')
    write(KEY, next)
    await this.syncShipmentEtas()
    return next.find((t) => t.id === id)
  },

  async remove(id) {
    if (!USE_MOCK) return (await api.delete(`${ENDPOINTS.trips}/${id}`)).data
    write(KEY, (await this.list()).filter((t) => t.id !== id))
    await this.syncShipmentEtas()
    return { id }
  },

  async assignShipment(id, shipmentId) {
    if (!USE_MOCK) return (await api.post(`${ENDPOINTS.trips}/${id}/shipments`, { awbId: shipmentId })).data
    const trip = await this.get(id)
    const shipment = await shipmentService.get(shipmentId)
    if ((trip.shipmentIds || []).includes(shipmentId)) return trip

    const updated = await this.update(id, { shipmentIds: [...(trip.shipmentIds || []), shipmentId] })
    const existingTripIds = shipment.tripIds || (shipment.tripId ? [shipment.tripId] : [])
    await shipmentService.update(shipmentId, {
      tripIds: [...new Set([...existingTripIds, trip.id])],
      tripId: shipment.tripId || trip.id,
      tripCode: shipment.tripCode || trip.tripCode,
    })
    await this.syncShipmentEtas()

    const assignedDriver = (await driverService.list()).find((d) => d.id === trip.driverId)
    if (assignedDriver && shipment.status === 'pending') {
      await shipmentService.assignDriver(shipmentId, assignedDriver)
      await driverService.update(assignedDriver.id, { status: 'on_duty' })
    }
    await this.addEvent({
      tripId: id,
      eventType: 'shipment_added',
      source: 'manual',
      awbId: shipment.trackingNumber,
      remarks: `AWB ${shipment.trackingNumber} ditambahkan ke trip`,
    })
    return updated
  },

  async removeShipment(id, shipmentId) {
    if (!USE_MOCK) return (await api.delete(`${ENDPOINTS.trips}/${id}/shipments/${shipmentId}`)).data
    const trip = await this.get(id)
    const updated = await this.update(id, {
      shipmentIds: (trip.shipmentIds || []).filter((s) => s !== shipmentId),
    })
    const shipment = await shipmentService.get(shipmentId).catch(() => null)
    if (shipment) {
      const tripIds = (shipment.tripIds || (shipment.tripId ? [shipment.tripId] : [])).filter((tid) => tid !== id)
      const firstTrip = tripIds.length ? await this.get(tripIds[0]).catch(() => null) : null
      await shipmentService.update(shipmentId, {
        tripIds,
        tripId: tripIds[0] || null,
        tripCode: firstTrip?.tripCode || null,
      })
    }
    await this.syncShipmentEtas()
    return updated
  },

  async updateStatus(id, status) {
    if (!USE_MOCK) return (await api.patch(`${ENDPOINTS.trips}/${id}/status`, { status })).data
    const trip = await this.get(id)
    const now = new Date().toISOString()
    const patch = { status }
    if (status === 'in_progress' && !trip.actualDeparture) patch.actualDeparture = now
    if (status === 'completed') patch.actualArrival = now
    const updated = await this.update(id, patch)
    await this.addEvent({
      tripId: id,
      eventType: status,
      source: 'manual',
      remarks: `Status trip diperbarui menjadi ${status.replaceAll('_', ' ')}`,
    })
    return updated
  },

  async listEvents(tripId) {
    if (!USE_MOCK) {
      return (await api.get(ENDPOINTS.trackingEvents, { params: tripId ? { trip_id: tripId } : {} })).data
    }
    return read(EVENTS_KEY, initialEvents)
      .filter((e) => !tripId || e.tripId === tripId)
      .sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime))
  },

  async addEvent(data) {
    if (!USE_MOCK) return (await api.post(ENDPOINTS.trackingEvents, data)).data
    const events = read(EVENTS_KEY, initialEvents)
    const now = new Date().toISOString()
    const event = {
      ...data,
      id: `EVT-${Date.now()}`,
      eventTime: data.eventTime || data.enteredAt || now,
      enteredAt: data.enteredAt || now,
      positionObtainedAt: data.positionObtainedAt || null,
      enteredBy: data.enteredBy || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      podId: data.podId ?? null,
    }
    write(EVENTS_KEY, [event, ...events])
    return event
  },

  async resetDemo() {
    if (!USE_MOCK) throw new Error('Reset demo hanya tersedia pada mode simulasi')
    localStorage.removeItem(KEY)
    localStorage.removeItem(EVENTS_KEY)
    localStorage.removeItem(LINK_SEED_KEY)
    notifyDemoDataChanged(KEY)
  },
}
