import { useSyncExternalStore } from 'react'

const subscribe = (callback) => {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

/**
 * Status koneksi dari browser. Catatan: `navigator.onLine` hanya tahu perangkat
 * tersambung ke jaringan, bukan apakah internetnya benar-benar bisa dipakai
 * (mis. Wi-Fi tanpa internet). Karena itu UI juga menyediakan tombol manual.
 */
export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
}
