import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { isValidPoint } from '@/lib/geo'

const pinIcon = L.divIcon({ className: '', html: '<span style="display:block;width:18px;height:18px;background:#e65c3b;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 1px 5px #555"></span>', iconSize: [18, 18], iconAnchor: [9, 18] })

function ClickToPin({ onPick }) {
  useMapEvents({ click(e) { onPick({ lat: e.latlng.lat.toFixed(6), lng: e.latlng.lng.toFixed(6) }) } })
  return null
}

function MapController({ position, focusPoint }) {
  const map = useMap()
  const positionKey = position ? position.join(',') : ''
  const focusPointKey = focusPoint ? focusPoint.join(',') : ''
  useEffect(() => {
    if (focusPointKey) map.flyTo(focusPointKey.split(',').map(Number), 16, { duration: 1.2 })
    else if (positionKey) map.setView(positionKey.split(',').map(Number), 13)
  }, [map, positionKey, focusPointKey])
  return null
}

/**
 * Penitik koordinat: cari alamat, klik peta, atau isi latitude/longitude manual.
 * value = { lat, lng } (string); onChange menerima objek yang sama.
 */
export default function LocationPicker({ title, hint, value, onChange, error, mapHeight = 'h-64' }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [focusPoint, setFocusPoint] = useState(null)
  const valid = isValidPoint(value.lat, value.lng)
  const position = valid ? [Number(value.lat), Number(value.lng)] : null

  const search = async () => {
    const q = query.trim()
    if (!q) { setSearchError('Masukkan nama jalan atau lokasi yang ingin dicari.'); setResults([]); return }
    setSearching(true); setSearchError(''); setResults([])
    try {
      const params = new URLSearchParams({ q, format: 'jsonv2', addressdetails: '1', limit: '5', countrycodes: 'id' })
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error('Layanan pencarian lokasi sedang tidak tersedia.')
      const found = await response.json()
      if (!found.length) setSearchError('Lokasi tidak ditemukan. Coba tambahkan nama kota, misalnya Bandung.')
      else setResults(found)
    } catch (e) {
      setSearchError(e.message || 'Gagal mencari lokasi. Periksa koneksi internet lalu coba lagi.')
    } finally {
      setSearching(false)
    }
  }

  const choose = (r) => {
    const lat = Number(r.lat); const lng = Number(r.lon)
    onChange({ lat: lat.toFixed(6), lng: lng.toFixed(6) })
    setFocusPoint([lat, lng]); setQuery(r.display_name || ''); setResults([]); setSearchError('')
  }

  return (
    <section className="space-y-3 rounded-xl border border-ink-100 p-4">
      <div>
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search() } }}
          aria-label={`Cari lokasi: ${title}`} placeholder="Cari alamat, contoh: Jl. Logam, Bandung"
          className="min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-route-500 focus:ring-2 focus:ring-route-100"
        />
        <Button onClick={search} loading={searching} disabled={searching}>{searching ? 'Mencari...' : 'Cari lokasi'}</Button>
      </div>
      {searchError && <p role="alert" className="text-sm text-rose-600">{searchError}</p>}
      {results.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
          {results.map((r) => (
            <button key={r.place_id} type="button" onClick={() => choose(r)} className="block w-full border-b border-ink-100 px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-route-50 focus:bg-route-50 focus:outline-none">
              <span className="block font-medium text-ink-900">{r.name || r.display_name}</span>
              <span className="mt-0.5 block text-xs text-ink-500">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-xl ring-1 ring-ink-200">
        <MapContainer center={position || [-2.5, 118]} zoom={position ? 13 : 5} scrollWheelZoom className={`${mapHeight} w-full`}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapController position={position} focusPoint={focusPoint} />
          <ClickToPin onPick={(p) => { onChange(p); setFocusPoint([Number(p.lat), Number(p.lng)]) }} />
          {position && <Marker position={position} icon={pinIcon} />}
        </MapContainer>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Latitude" type="number" step="any" min="-90" max="90" value={value.lat} onChange={(e) => onChange({ ...value, lat: e.target.value })} placeholder="Contoh: -6.890506" />
        <Input label="Longitude" type="number" step="any" min="-180" max="180" value={value.lng} onChange={(e) => onChange({ ...value, lng: e.target.value })} placeholder="Contoh: 109.676149" />
      </div>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {valid && <p className="text-xs text-emerald-700">Titik dipilih: {value.lat}, {value.lng}</p>}
    </section>
  )
}
