import { useAsync } from './useAsync'
import { useScope } from './useAuth'
import { shipmentService } from '@/services/shipmentService'

export function useShipments() {
  const scope = useScope()
  return useAsync(() => shipmentService.list(scope), [scope.role, scope.customerId, scope.driverId])
}
