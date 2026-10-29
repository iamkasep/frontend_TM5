import { ENDPOINTS } from './api'
import { createCrudService } from './crudService'
import { drivers } from './mock/data/people'

/** Normalisasi record `dm_drivers` (id, driver_code, driver_name, phone_number, vendor_id, status). */
export function normalizeDriver(item = {}) {
  if (!item || typeof item !== 'object') return item
  const driverName = item.driverName ?? item.driver_name ?? item.name ?? ''
  const phoneNumber = item.phoneNumber ?? item.phone_number ?? item.phone ?? ''
  const rawStatus = String(item.status ?? 'active').toLowerCase()
  const status = ['inactive', 'off'].includes(rawStatus) ? 'inactive' : 'active'

  return {
    ...item,
    driverCode: item.driverCode ?? item.driver_code ?? '',
    driverName,
    name: driverName,
    phoneNumber,
    phone: phoneNumber,
    vendorId: item.vendorId ?? item.vendor_id ?? '',
    vendorName: item.vendorName ?? item.vendor_name ?? item.vendor?.vendorName ?? item.vendor?.name ?? '',
    status,
  }
}

export function serializeDriver(data = {}) {
  return normalizeDriver(data)
}

export const driverService = createCrudService({
  endpoint: ENDPOINTS.drivers,
  mock: drivers,
  prefix: 'DRV',
  normalize: normalizeDriver,
  serialize: serializeDriver,
})
