import { ENDPOINTS } from './api'
import { createCrudService } from './crudService'
import { customers, vendors, admins, companies } from './mock/data/people'

/** Normalisasi record `dm_vendors` agar sesuai dengan kolom DB existing maupun komponen UI. */
export function normalizeVendor(item = {}) {
  if (!item || typeof item !== 'object') return item
  const vendorName = item.vendorName ?? item.vendor_name ?? item.name ?? ''
  const rawType = String(item.vendorType ?? item.vendor_type ?? item.type ?? 'TRANSPORTER').toUpperCase()
  const vendorType = ['TRANSPORTER', 'COURIER', 'THIRD_PARTY'].includes(rawType)
    ? rawType
    : rawType === 'INTERNAL'
      ? 'TRANSPORTER'
      : 'THIRD_PARTY'
  const phoneNumber = item.phoneNumber ?? item.phone_number ?? item.phone ?? ''
  const isActive = item.isActive !== undefined
    ? Boolean(Number(item.isActive === true ? 1 : item.isActive))
    : item.is_active !== undefined
      ? Boolean(Number(item.is_active === true ? 1 : item.is_active))
      : String(item.status ?? 'active').toLowerCase() !== 'inactive'
  const status = isActive ? 'active' : 'inactive'

  return {
    ...item,
    vendorCode: item.vendorCode ?? item.vendor_code ?? '',
    vendorName,
    name: vendorName,
    vendorType,
    type: vendorType,
    npwp: item.npwp ?? '',
    contactPerson: item.contactPerson ?? item.contact_person ?? '',
    phoneNumber,
    phone: phoneNumber,
    email: item.email ?? '',
    address: item.address ?? '',
    city: item.city ?? '',
    province: item.province ?? '',
    postalCode: item.postalCode ?? item.postal_code ?? '',
    isActive,
    status,
    remarks: item.remarks ?? '',
  }
}

export function serializeVendor(data = {}) {
  const normalized = normalizeVendor(data)
  return {
    ...normalized,
    isActive: normalized.status === 'active',
  }
}

export const customerService = createCrudService({ endpoint: ENDPOINTS.customers, mock: customers, prefix: 'CUS' })
export const vendorService = createCrudService({
  endpoint: ENDPOINTS.vendors,
  mock: vendors,
  prefix: 'VND',
  normalize: normalizeVendor,
  serialize: serializeVendor,
})
export const adminService = createCrudService({ endpoint: ENDPOINTS.admins, mock: admins, prefix: 'ADM' })
export const companyService = createCrudService({ endpoint: ENDPOINTS.companies, mock: companies, prefix: 'CMP' })
