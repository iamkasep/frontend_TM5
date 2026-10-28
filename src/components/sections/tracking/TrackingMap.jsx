
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import BaseMapLayer from './BaseMapLayer'
import { MAP_MAX_ZOOM } from '@/lib/mapConfig'
import { fetchRoadRoute } from '@/lib/routing'

// Ikon marker tanpa file gambar tambahan.
const icon = (kind, selected) =>
  L.divIcon({
    className: '',
    html: `<span class="tms-pin tms-pin-${kind}${
      selected ? ' tms-pin-selected' : ''
    }"></span>`,
    iconSize: kind === 'vehicle' ? [22, 22] : [18, 18],
    iconAnchor: kind === 'vehicle' ? [11, 11] : [9, 9],
  })

// Warna garis: perjalanan biasa (oranye) dan ruas yang berakhir di titik input manual (ungu).
const ROUTE_COLOR = '#e5863c'
const MANUAL_ROUTE_COLOR = '#7c3aed'

// Satu ruas garis mengikuti jalan. Garis lurus tampil lebih dulu dan menjadi cadangan
// bila layanan routing tidak dapat dijangkau.
function RoadLine({ points, color }) {
  const key = JSON.stringify(points)
  const [snapped, setSnapped] = useState({ key: null, line: null })

  useEffect(() => {
    const controller = new AbortController()
    fetchRoadRoute(JSON.parse(key), controller.signal)
      .then((line) => { if (!controller.signal.aborted) setSnapped({ key, line }) })
      .catch(() => { /* gagal/offline: tetap garis lurus */ })
    return () => controller.abort()
  }, [key])

  const positions = snapped.key === key && snapped.line ? snapped.line : points
  return <Polyline positions={positions} pathOptions={{ color, weight: 4 }} />
}

// Pecah rute menjadi ruas berurutan; ruas yang berakhir di titik bertanda 'manual'
// ([lat, lng, 'manual']) diwarnai berbeda dari perjalanan biasa.
function RoadRoute({ route }) {
  const runs = []
  for (let i = 1; i < route.length; i += 1) {
    const manual = route[i][2] === 'manual'
    const last = runs[runs.length - 1]
    if (last && last.manual === manual) last.points.push(route[i])
    else runs.push({ manual, points: [route[i - 1], route[i]] })
  }
  return runs.map((run, i) => (
    <RoadLine key={i} points={run.points} color={run.manual ? MANUAL_ROUTE_COLOR : ROUTE_COLOR} />
  ))
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
 * route: [[lat, lng, 'manual'?], ...] garis rute yang sudah ditempuh; titik ketiga 'manual' menandai input manual.
 * plan: [[lat, lng], ...] garis rute rencana.
 */
export default function TrackingMap({
  markers = [],
  route,
  plan,
  height = 360,
  onSelect,
  fitKey = 'default',
}) {
  const points = useMemo(
    () => markers.map((marker) => marker.position),
    [markers]
  )

  // Peta abu-abu = basemap gagal dimuat. Tampilkan pesan agar penyebabnya
  // terlihat. BaseMapLayer hanya melapor 'failed' jika vektor DAN cadangan gagal.
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

        {plan && (
          <Polyline
            positions={plan}
            pathOptions={{
              color: '#7389a1',
              weight: 3,
              dashArray: '6 8',
            }}
          />
        )}

        {route && route.length > 1 && <RoadRoute route={route} />}

        {markers.map((marker) => (
          <PinMarker key={marker.id} marker={marker} onSelect={onSelect} />
        ))}

        <FitBounds points={points} fitKey={fitKey} />
        <InvalidateOnResize />
      </MapContainer>

      {notice && (
        <div
          role="alert"
          className="pointer-events-none absolute bottom-9 left-3 right-3 z-[1000] rounded-lg bg-signal-100 px-3 py-2 text-xs font-medium text-ink-900 ring-1 ring-signal-400"
        >
          {notice}
        </div>
      )}
    </div>
  )
}
