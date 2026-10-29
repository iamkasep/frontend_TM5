import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MapContainer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import BaseMapLayer from './BaseMapLayer'
import { MAP_MAX_ZOOM } from '@/lib/mapConfig'

// Simbol SVG untuk masing-masing jenis titik pada peta:
// - origin: Gudang / titik keberangkatan
// - vehicle: Truk armada / posisi driver
// - destination: Pin jarum (pushpin) titik tujuan
const PIN_SVGS = {
  origin: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21V8l9-5 9 5v13"/><path d="M13 13h4v8H7v-8h6Z"/><path d="M7 17h10"/></svg>`,
  vehicle: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`,
  destination: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>`,
}

// Ikon marker dengan simbol SVG tanpa file gambar eksternal.
const icon = (kind, selected) => {
  const isVehicle = kind === 'vehicle'
  const size = isVehicle ? 28 : 24
  const anchor = isVehicle ? 14 : 12
  const svg = PIN_SVGS[kind] || PIN_SVGS.destination
  return L.divIcon({
    className: '',
    html: `<span class="tms-pin tms-pin-${kind}${
      selected ? ' tms-pin-selected' : ''
    }">${svg}</span>`,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    popupAnchor: [0, -anchor],
  })
}

// Marker: klik memperbesar peta (zoom in) ke titik tersebut.
function PinMarker({ marker, onSelect }) {
  const map = useMap()
  return (
    <Marker
      position={marker.position}
      icon={icon(marker.kind, marker.selected)}
      eventHandlers={{
        click: () => {
          map.flyTo(marker.position, Math.min(Math.max(map.getZoom(), 14), MAP_MAX_ZOOM))
          onSelect?.(marker)
        },
      }}
    >
      {marker.label && <Popup>{marker.label}</Popup>}
    </Marker>
  )
}

function FitBounds({ points, fitKey }) {
  const map = useMap()
  const lastFitKey = useRef(null)

  // Kunci berbasis isi koordinat: array `markers` yang dibuat ulang di setiap
  // render induk (mis. halaman driver) tidak lagi memicu fitBounds berulang
  // yang mereset zoom/geser peta milik pengguna.
  const pointsKey = JSON.stringify(points)

  useEffect(() => {
    const pts = JSON.parse(pointsKey)
    if (!pts.length || lastFitKey.current === fitKey) return

    if (pts.length === 1) {
      map.setView(pts[0], 9)
    } else {
      map.fitBounds(pts, {
        padding: [40, 40],
        maxZoom: 11,
      })
    }
    lastFitKey.current = fitKey
  }, [fitKey, map, pointsKey])

  return null
}

// Leaflet hanya menghitung ulang ukuran saat jendela di-resize. Ukuran container
// juga bisa berubah karena layout (sidebar, tab, grid), jadi diamati langsung.
function InvalidateOnResize() {
  const map = useMap()

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])

  return null
}

/**
 * markers: [
 *   {
 *     id,
 *     kind: 'origin' | 'destination' | 'vehicle',
 *     position: [lat, lng],
 *     label,
 *     selected
 *   }
 * ]
 *
 * Peta hanya menampilkan titik koordinat pasti (Asal, Posisi Armada, dan Tujuan)
 * tanpa garis penghubung rute karena jalur perjalanan aktual bersifat dinamis.
 */
export default function TrackingMap({
  markers = [],
  height = 360,
  onSelect,
  fitKey = 'default',
}) {
  const points = useMemo(
    () => markers.map((marker) => marker.position),
    [markers],
  )

  const [baseStatus, setBaseStatus] = useState('loading')
  const notice =
    baseStatus === 'failed'
      ? 'Peta dasar gagal dimuat. Periksa koneksi internet, lalu muat ulang halaman.'
      : null

  return (
    <div
      className="relative isolate overflow-hidden rounded-xl ring-1 ring-ink-100"
      style={{ height }}
    >
      <MapContainer
        center={[-7.2, 109.5]}
        zoom={7}
        scrollWheelZoom={true}
        touchZoom={true}
        doubleClickZoom={true}
        dragging={true}
        keyboard={true}
        zoomControl={true}
        maxZoom={MAP_MAX_ZOOM}
        className="h-full w-full"
      >
        <BaseMapLayer onStatus={setBaseStatus} />

        {markers.map((marker) => (
          <PinMarker key={marker.id} marker={marker} onSelect={onSelect} />
        ))}

        <FitBounds points={points} fitKey={fitKey} />
        <InvalidateOnResize />
      </MapContainer>

      {/* Legenda simbol pin peta */}
      <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-[900] flex flex-wrap items-center gap-2.5 rounded-md bg-white/90 px-2.5 py-1 text-[11px] font-medium text-ink-800 shadow-sm ring-1 ring-ink-200 backdrop-blur">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-ink-800" />
          Asal
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-route-500" />
          Posisi driver
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-emerald-600" />
          Tujuan
        </span>
      </div>

      {notice && (
        <div
          role="alert"
          className="pointer-events-none absolute bottom-12 left-3 right-3 z-[1000] rounded-lg bg-signal-100 px-3 py-2 text-xs font-medium text-ink-900 ring-1 ring-signal-400"
        >
          {notice}
        </div>
      )}
    </div>
  )
}
