import { shipmentService } from './shipmentService'
import { getCurrentPosition, isValidPoint } from '@/lib/geo'
import { ACTIVE_STATUSES } from '@/lib/constants'

function resolveLivePosition(s) {
  const pos = s.currentPosition || s.latestPosition
  if (Array.isArray(pos) && isValidPoint(pos[0], pos[1])) return [Number(pos[0]), Number(pos[1])]
  if (pos && isValidPoint(pos.lat ?? pos.latitude, pos.lng ?? pos.longitude)) {
    return [Number(pos.lat ?? pos.latitude), Number(pos.lng ?? pos.longitude)]
  }
  if (isValidPoint(s.currentLatitude, s.currentLongitude)) {
    return [Number(s.currentLatitude), Number(s.currentLongitude)]
  }
  return getCurrentPosition(s)
}

/**
 * Data posisi kendaraan. Pada mode simulasi posisi dihitung dari progres pengiriman,
 * BUKAN dari GPS nyata. Pada mode API, jika backend menyertakan `currentPosition` / `latestPosition`
 * pada objek pengiriman, posisi tersebut langsung dipakai.
 */
export const trackingService = {
  async listLive(scope) {
    const list = await shipmentService.list(scope)
    return list
      .filter((s) => ACTIVE_STATUSES.includes(s.status))
      .map((s) => ({
        shipment: s,
        position: resolveLivePosition(s),
        updatedAt: (s.history || []).at(-1)?.at || s.updatedAt || s.createdAt,
      }))
  },
  async getRoute(id, scope) {
    return shipmentService.locationHistory(id, scope)
  },
}
