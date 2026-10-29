import { ENDPOINTS } from './api'
import { createCrudService } from './crudService'
import { vehicles } from './mock/data/people'

/** Normalisasi record `dm_vehicles` (id, plate_number, vehicle_type, capacity_kg, capacity_m3, vendor_id, status). */
export function normalizeVehicle(item = {}) {
  if (!item || typeof item !== 'object') return item
  const plateNumber = item.plateNumber ?? item.plate_number ?? item.plate ?? ''
  const vehicleType = item.vehicleType ?? item.vehicle_type ?? item.type ?? ''
  const rawStatus = String(item.status ?? 'active').toLowerCase()
  const status = rawStatus === 'inactive' ? 'inactive' : rawStatus === 'maintenance' ? 'maintenance' : 'active'

  return {
    ...item,
    plateNumber,
    plate: plateNumber,
    vehicleType,
    type: vehicleType,
    capacityKg: Number(item.capacityKg ?? item.capacity_kg ?? 0),
    capacityM3: item.capacityM3 ?? item.capacity_m3 ?? null,
    vendorId: item.vendorId ?? item.vendor_id ?? '',
    vendorName: item.vendorName ?? item.vendor_name ?? item.vendor?.vendorName ?? item.vendor?.name ?? '',
    status,
  }
}

export function serializeVehicle(data = {}) {
  return normalizeVehicle(data)
}

export const vehicleService = createCrudService({
  endpoint: ENDPOINTS.vehicles,
  mock: vehicles,
  prefix: 'VHC',
  normalize: normalizeVehicle,
  serialize: serializeVehicle,
})
