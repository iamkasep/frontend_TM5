import { ENDPOINTS } from './api'
import { createCrudService } from './crudService'
import { vehicles } from './mock/data/people'

export const vehicleService = createCrudService({ endpoint: ENDPOINTS.vehicles, mock: vehicles, prefix: 'VHC' })
