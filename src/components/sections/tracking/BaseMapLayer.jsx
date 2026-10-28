import { useEffect, useMemo, useRef, useState } from 'react'
import { TileLayer, useMap } from 'react-leaflet'
import {
  FALLBACK_ATTRIBUTION,
  FALLBACK_TILE_URL,
  MAP_ATTRIBUTION,
  MAP_MAX_ZOOM,
  MAP_STYLE_URL,
} from '@/lib/mapConfig'

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/**
 * Basemap: OpenFreeMap (vektor, via MapLibre GL di dalam Leaflet).
 * Cadangan: tile raster OpenStreetMap bila WebGL tidak ada atau style gagal dimuat.
 * Library MapLibre dimuat lazy agar bundle awal aplikasi tidak membengkak.
 *
 * onStatus('ok' | 'failed') dipakai induk untuk menampilkan pesan bila
 * tidak ada satu pun basemap yang berhasil dimuat.
 */
export default function BaseMapLayer({ onStatus }) {
  const map = useMap()
  const [mode, setMode] = useState(() => (hasWebGL() ? 'vector' : 'raster'))

  useEffect(() => {
    if (mode !== 'vector') return undefined

    let cancelled = false
    let layer = null

    ;(async () => {
      try {
        const [{ maplibreGL }, { setWorkerUrl }, worker] = await Promise.all([
          import('@maplibre/maplibre-gl-leaflet'),
          import('maplibre-gl'),
          import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
          import('maplibre-gl/dist/maplibre-gl.css'),
        ])
        if (cancelled) return

        setWorkerUrl(worker.default)
        layer = maplibreGL({
          style: MAP_STYLE_URL,
          attribution: MAP_ATTRIBUTION,
          maxZoom: MAP_MAX_ZOOM,
        }).addTo(map)

        const gl = layer.getMaplibreMap()
        let loaded = false
        gl.on('load', () => {
          loaded = true
          onStatus('ok')
        })
        // Error tile tunggal setelah style termuat tidak dianggap fatal.
        gl.on('error', () => {
          if (!loaded && !cancelled) setMode('raster')
        })
      } catch {
        if (!cancelled) setMode('raster')
      }
    })()

    return () => {
      cancelled = true
      if (layer) map.removeLayer(layer)
    }
  }, [map, mode, onStatus])

  if (mode === 'vector') return null
  return <RasterFallback onStatus={onStatus} />
}

function RasterFallback({ onStatus }) {
  const loadedRef = useRef(false)
  const handlers = useMemo(
    () => ({
      tileload: () => {
        loadedRef.current = true
        onStatus('ok')
      },
      tileerror: () => {
        if (!loadedRef.current) onStatus('failed')
      },
    }),
    [onStatus]
  )

  return (
    <TileLayer
      url={FALLBACK_TILE_URL}
      attribution={FALLBACK_ATTRIBUTION}
      maxZoom={MAP_MAX_ZOOM}
      eventHandlers={handlers}
    />
  )
}
