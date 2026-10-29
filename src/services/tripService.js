import { trips as initialTrips } from './mock/data/trips'
import { api, ENDPOINTS, USE_MOCK } from '@/services/api'
import { shipmentService } from '@/services/shipmentService'
import { driverService } from '@/services/driverService'
import { notifyDemoDataChanged } from './mock/mockStore'

const KEY = 'tms_demo_trips_v4'
const EVENTS_KEY = 'tms_demo_tracking_events_v4'
const LINK_SEED_KEY = 'tms_demo_trip_links_seeded_v4'

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

/** Normalisasi record `dt_trips` + `dt_trip_shipments` agar kolom DB existing selaras dengan UI. */
export function normalizeTrip(item = {}) {
  if (!item || typeof item !== 'object') return item
  const tripNumber = item.tripNumber ?? item.trip_number ?? item.tripCode ?? item.trip_code ?? ''
  const origin = item.origin ?? item.Origin ?? ''
  const destination = item.destination ?? item.Destination ?? ''
  const rawStatus = String(item.status ?? 'planned').toLowerCase()
  const status = ['planned', 'loading', 'in_progress', 'completed', 'cancelled'].includes(rawStatus)
    ? rawStatus
    : 'planned'

  const rawTripShipments = Array.isArray(item.tripShipments ?? item.trip_shipments)
    ? (item.tripShipments ?? item.trip_shipments)
    : []
  const shipmentIdsFromRel = rawTripShipments.map((ts) => ts.awbId ?? ts.awb_id).filter(Boolean)
  const shipmentIds = Array.from(new Set([...(item.shipmentIds || []), ...shipmentIdsFromRel]))

  const tripShipments = shipmentIds.map((awbId, idx) => {
    const existing = rawTripShipments.find((ts) => (ts.awbId ?? ts.awb_id) === awbId) || {}
    return {
      id: existing.id ?? `${item.id || 'TRP'}-TS-${String(idx + 1).padStart(3, '0')}`,
      tripId: existing.tripId ?? existing.trip_id ?? item.id,
      awbId,
      deliveryStatus: existing.deliveryStatus ?? existing.delivery_status ?? (
        status === 'completed' ? 'DELIVERED' : status === 'in_progress' ? 'IN_TRANSIT' : 'LOADING'
      ),
      loadedAt: existing.loadedAt ?? existing.loaded_at ?? item.actualDeparture ?? item.plannedDeparture ?? null,
      deliveredAt: existing.deliveredAt ?? existing.delivered_at ?? (status === 'completed' ? item.actualArrival : null),
    }
  })

  return {
    ...item,
    tripNumber,
    tripCode: tripNumber,
    origin,
    destination,
    plannedDeparture: item.plannedDeparture ?? item.planned_departure ?? null,
    actualDeparture: item.actualDeparture ?? item.actual_departure ?? null,
    plannedArrival: item.plannedArrival ?? item.planned_arrival ?? null,
    actualArrival: item.actualArrival ?? item.actual_arrival ?? null,
    status,
    shipmentIds,
    tripShipments,
  }
}

/** Normalisasi record `dt_tracking_events`. */
export function normalizeTrackingEvent(event = {}) {
  if (!event || typeof event !== 'object') return event
  const idPod = event.idPod ?? event.id_pod ?? event.podId ?? event.pod_id ?? null
  return {
    ...event,
    tripId: event.tripId ?? event.trip_id ?? null,
    awbId: event.awbId ?? event.awb_id ?? null,
    eventType: event.eventType ?? event.event_type ?? 'IN_TRANSIT',
    latitude: event.latitude ?? null,
    longitude: event.longitude ?? null,
    source: event.source ?? 'manual',
    eventTime: event.eventTime ?? event.event_time ?? event.enteredAt ?? null,
    idPod,
    podId: idPod,
    remarks: event.remarks ?? '',
  }
}

const initialEvents = initialTrips.flatMap((trip) => [{
  id: `${trip.id}-EVT-001`,
  tripId: trip.id,
  awbId: null,
  eventType: 'PLANNED',
  eventTime: trip.plannedDeparture,
  source: 'manual',
  latitude: null,
  longitude: null,
  remarks: 'Trip dijadwalkan dalam sistem',
  idPod: null,
  podId: null,
}])

export const tripService = {
  async list() {
    if (!USE_MOCK) {
      const data = (await api.get(ENDPOINTS.trips)).data
      return Array.isArray(data) ? data.map(normalizeTrip) : []
    }
    const trips = read(KEY, initialTrips).map(normalizeTrip)
    if (!localStorage.getItem(KEY)) write(KEY, trips)
    if (!localStorage.getItem(LINK_SEED_KEY)) {
      localStorage.setItem(LINK_SEED_KEY, '1')
      const awbs = await shipmentService.list()
      for (const trip of trips) {
        for (const shipmentId of (trip.shipmentIds || [])) {
          const awb = awbs.find((item) => item.id === shipmentId)
          if (awb && !awb.tripId) {
            await shipmentService.update(awb.id, { tripId: trip.id, tripCode: trip.tripNumber })
          }
        }
      }
    }
    return trips
  },

  async get(id) {
    if (!USE_MOCK) return normalizeTrip((await api.get(`${ENDPOINTS.trips}/${id}`)).data)
    const trip = (await this.list()).find((item) => item.id === id)
    if (!trip) throw new Error('Trip tidak ditemukan')
    return normalizeTrip(trip)
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
      const ordered = [...linked].sort((a, b) => {
        const ta = a.plannedDeparture ? new Date(a.plannedDeparture).getTime() : Number.POSITIVE_INFINITY
        const tb = b.plannedDeparture ? new Date(b.plannedDeparture).getTime() : Number.POSITIVE_INFINITY
        if (ta !== tb) return ta - tb
        return String(a.tripNumber || a.id).localeCompare(String(b.tripNumber || b.id))
      })
      const finalTrip = ordered[ordered.length - 1]
      const eta = finalTrip.status === 'completed' && finalTrip.actualArrival
        ? finalTrip.actualArrival
        : finalTrip.plannedArrival
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
    if (!USE_MOCK) return normalizeTrip((await api.post(ENDPOINTS.trips, data)).data)
    const list = await this.list()
    const maxSeq = Math.max(0, ...list.map((t) => Number(t.id.split('-').pop()) || 0))
    const id = `TRP-${String(maxSeq + 1).padStart(3, '0')}`
    const datePart = new Date().toISOString().slice(0, 10).replaceAll('-', '')
    const tripNumber = data.tripNumber || data.tripCode || `TRIP-${datePart}-${id.split('-')[1]}`
    const trip = normalizeTrip({
      ...data,
      id,
      tripNumber,
      tripCode: tripNumber,
      status: data.status || 'planned',
      shipmentIds: data.shipmentIds || [],
      actualDeparture: null,
      actualArrival: null,
    })
    write(KEY, [trip, ...list])
    await this.addEvent({
      tripId: id,
      eventType: 'PLANNED',
      source: 'manual',
      remarks: 'Trip baru berhasil dijadwalkan',
    })
    await this.syncShipmentEtas()
    return trip
  },

  async update(id, patch) {
    if (!USE_MOCK) return normalizeTrip((await api.patch(`${ENDPOINTS.trips}/${id}`, patch)).data)
    const list = await this.list()
    const next = list.map((t) => (t.id === id ? normalizeTrip({ ...t, ...patch }) : t))
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
    if (!USE_MOCK) return normalizeTrip((await api.post(`${ENDPOINTS.trips}/${id}/shipments`, { awbId: shipmentId })).data)
    const trip = await this.get(id)
    const shipment = await shipmentService.get(shipmentId)
    if ((trip.shipmentIds || []).includes(shipmentId)) return trip

    const now = new Date().toISOString()
    const nextTripShipments = [
      ...(trip.tripShipments || []),
      {
        id: `${id}-TS-${Date.now()}`,
        tripId: id,
        awbId: shipmentId,
        deliveryStatus: trip.status === 'in_progress' ? 'IN_TRANSIT' : 'LOADING',
        loadedAt: now,
        deliveredAt: null,
      },
    ]
    const updated = await this.update(id, {
      shipmentIds: [...(trip.shipmentIds || []), shipmentId],
      tripShipments: nextTripShipments,
    })
    const existingTripIds = shipment.tripIds || (shipment.tripId ? [shipment.tripId] : [])
    await shipmentService.update(shipmentId, {
      tripIds: [...new Set([...existingTripIds, trip.id])],
      tripId: shipment.tripId || trip.id,
      tripCode: shipment.tripCode || trip.tripNumber,
    })
    await this.syncShipmentEtas()

    const assignedDriver = (await driverService.list()).find((d) => d.id === trip.driverId)
    if (assignedDriver && shipment.status === 'pending') {
      await shipmentService.assignDriver(shipmentId, assignedDriver)
    }
    await this.addEvent({
      tripId: id,
      awbId: shipment.trackingNumber,
      eventType: 'LOADING',
      source: 'manual',
      remarks: `AWB ${shipment.trackingNumber} dimuat ke dalam trip`,
    })
    return updated
  },

  async removeShipment(id, shipmentId) {
    if (!USE_MOCK) return normalizeTrip((await api.delete(`${ENDPOINTS.trips}/${id}/shipments/${shipmentId}`)).data)
    const trip = await this.get(id)
    const updated = await this.update(id, {
      shipmentIds: (trip.shipmentIds || []).filter((s) => s !== shipmentId),
      tripShipments: (trip.tripShipments || []).filter((ts) => ts.awbId !== shipmentId),
    })
    const shipment = await shipmentService.get(shipmentId).catch(() => null)
    if (shipment) {
      const tripIds = (shipment.tripIds || (shipment.tripId ? [shipment.tripId] : [])).filter((tid) => tid !== id)
      const firstTrip = tripIds.length ? await this.get(tripIds[0]).catch(() => null) : null
      await shipmentService.update(shipmentId, {
        tripIds,
        tripId: tripIds[0] || null,
        tripCode: firstTrip?.tripNumber || null,
      })
    }
    await this.syncShipmentEtas()
    return updated
  },

  async updateStatus(id, status) {
    if (!USE_MOCK) return normalizeTrip((await api.patch(`${ENDPOINTS.trips}/${id}/status`, { status })).data)
    const trip = await this.get(id)
    const now = new Date().toISOString()
    const patch = { status }
    if (status === 'in_progress' && !trip.actualDeparture) patch.actualDeparture = now
    if (status === 'completed') patch.actualArrival = now

    if (Array.isArray(trip.tripShipments) && trip.tripShipments.length > 0) {
      patch.tripShipments = trip.tripShipments.map((ts) => ({
        ...ts,
        deliveryStatus: status === 'completed' ? 'DELIVERED' : status === 'in_progress' ? 'IN_TRANSIT' : 'LOADING',
        loadedAt: ts.loadedAt || (status === 'loading' || status === 'in_progress' ? now : null),
        deliveredAt: status === 'completed' ? (ts.deliveredAt || now) : ts.deliveredAt,
      }))
    }

    const updated = await this.update(id, patch)
    const eventTypeMap = {
      planned: 'PLANNED',
      loading: 'LOADING',
      in_progress: 'IN_TRANSIT',
      completed: 'DELIVERED',
      cancelled: 'CANCELLED',
    }
    await this.addEvent({
      tripId: id,
      eventType: eventTypeMap[status] || status.toUpperCase(),
      source: 'manual',
      remarks: `Status trip diperbarui menjadi ${status.replaceAll('_', ' ')}`,
    })
    return updated
  },

  async listEvents(tripId) {
    if (!USE_MOCK) {
      const data = (await api.get(ENDPOINTS.trackingEvents, { params: tripId ? { trip_id: tripId } : {} })).data
      return Array.isArray(data) ? data.map(normalizeTrackingEvent) : []
    }
    return read(EVENTS_KEY, initialEvents)
      .map(normalizeTrackingEvent)
      .filter((e) => !tripId || e.tripId === tripId)
      .sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime))
  },

  async addEvent(data) {
    const idPod = data.idPod ?? data.id_pod ?? data.podId ?? null
    const payload = {
      ...data,
      idPod,
      podId: idPod,
    }
    if (!USE_MOCK) return normalizeTrackingEvent((await api.post(ENDPOINTS.trackingEvents, payload)).data)
    const events = read(EVENTS_KEY, initialEvents)
    const now = new Date().toISOString()
    const event = normalizeTrackingEvent({
      ...payload,
      id: `EVT-${Date.now()}`,
      eventTime: data.eventTime || data.positionObtainedAt || data.enteredAt || now,
      enteredAt: data.enteredAt || now,
      positionObtainedAt: data.positionObtainedAt || null,
      enteredBy: data.enteredBy || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      idPod,
      podId: idPod,
    })
    write(EVENTS_KEY, [event, ...events])
    return event
  },
}
