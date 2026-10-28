import { ENDPOINTS } from './api'
import { createCrudService } from './crudService'
import { customers, vendors, admins, companies } from './mock/data/people'

export const customerService = createCrudService({ endpoint: ENDPOINTS.customers, mock: customers, prefix: 'CUS' })
export const vendorService = createCrudService({ endpoint: ENDPOINTS.vendors, mock: vendors, prefix: 'VND' })
export const adminService = createCrudService({ endpoint: ENDPOINTS.admins, mock: admins, prefix: 'ADM' })

export const companyService = createCrudService({ endpoint: ENDPOINTS.companies, mock: companies, prefix: 'CMP' })
