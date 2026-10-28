import { useSyncExternalStore } from 'react'
import { getOutboxCount, subscribeOutbox } from '@/services/reportService'

/** Jumlah laporan driver yang masih menunggu internet untuk terkirim (antrean di perangkat). */
export function useOutboxCount() {
  return useSyncExternalStore(subscribeOutbox, getOutboxCount, () => 0)
}
