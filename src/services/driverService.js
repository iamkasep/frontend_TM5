import { ENDPOINTS } from './api'
import { createCrudService } from './crudService'
import { drivers } from './mock/data/people'

export const driverService = createCrudService({ endpoint: ENDPOINTS.drivers, mock: drivers, prefix: 'DRV' })
