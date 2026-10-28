import { useState } from 'react'
import { Input, Select, Textarea } from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const today = () => new Date().toISOString().slice(0, 10)

function validateShipment(v, { isEdit, usedAwbs = [] }) {
  const e = {}
  if (!v.customerId) e.customerId = 'Pilih customer.'
  if (!isEdit && !v.originLocationId) e.originLocationId = 'Pilih titik asal.'
  if (!isEdit && !v.destinationLocationId) e.destinationLocationId = 'Pilih titik tujuan.'
  const awb = String(v.awb || '').trim()
  if (!awb) e.awb = 'Nomor AWB wajib diisi.'
  else if (usedAwbs.some((used) => String(used).toLowerCase() === awb.toLowerCase())) e.awb = 'Nomor AWB / Resi sudah digunakan.'
  if (!(Number(v.weightKg) > 0)) e.weightKg = 'Berat harus lebih dari 0.'
  if (!v.eta) e.eta = 'Estimasi tiba wajib diisi.'
  else if (!isEdit && v.eta < today()) e.eta = 'Estimasi tiba tidak boleh di masa lalu.'
  if (isEdit) {
    const hasLat = String(v.manualLat ?? '').trim() !== ''
    const hasLng = String(v.manualLng ?? '').trim() !== ''
    if (hasLat !== hasLng) {
      e.manualLat = 'Latitude dan longitude harus diisi bersamaan.'
      e.manualLng = 'Latitude dan longitude harus diisi bersamaan.'
    } else if (hasLat && hasLng) {
      if (!Number.isFinite(Number(v.manualLat)) || Number(v.manualLat) < -90 || Number(v.manualLat) > 90) e.manualLat = 'Latitude harus antara -90 dan 90.'
      if (!Number.isFinite(Number(v.manualLng)) || Number(v.manualLng) < -180 || Number(v.manualLng) > 180) e.manualLng = 'Longitude harus antara -180 dan 180.'
    }
  }
  return e
}

export default function ShipmentForm({ initial, customers, locations = [], usedAwbs = [], isEdit, saving, onSubmit, onCancel }) {
  const [v, setV] = useState(initial)
  const [errors, setErrors] = useState({})
  const set = (key) => (e) => setV((old) => ({ ...old, [key]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    const nextErrors = validateShipment(v, { isEdit, usedAwbs })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const origin = locations.find((l) => l.id === v.originLocationId)
    const destination = locations.find((l) => l.id === v.destinationLocationId)
    const customer = customers.find((c) => c.id === v.customerId)
    onSubmit({
      ...v,
      trackingNumber: v.awb,
      customerName: customer?.name || '',
      ...(origin ? { origin: { city: origin.name, lat: Number(origin.latitude), lng: Number(origin.longitude) } } : {}),
      ...(destination ? { destination: { city: destination.name, lat: Number(destination.latitude), lng: Number(destination.longitude) } } : {}),
      ...(isEdit && String(v.manualLat ?? '').trim() !== '' && String(v.manualLng ?? '').trim() !== '' ? { manualPosition: { lat: Number(v.manualLat), lng: Number(v.manualLng), note: String(v.notes || '').trim(), source: 'admin_manual' } } : {}),
    })
  }
  const activeLocations = locations.filter((l) => l.status === 'active')
  const locationOptions = activeLocations.map((l) => ({ value: l.id, label: `${l.name} — ${l.address || l.code || ''}` }))
  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Customer" required value={v.customerId || ''} onChange={set('customerId')} error={errors.customerId} options={customers.map((c) => ({ value: c.id, label: c.name }))} wrapperClassName="sm:col-span-2" />
        <Input label="Nomor AWB / Resi" required value={v.awb || ''} onChange={set('awb')} error={errors.awb} placeholder="Contoh: AWB-TEST-001" autoComplete="off" />
        <Input label="Berat (kg)" type="number" min="0.1" step="any" required value={v.weightKg ?? ''} onChange={set('weightKg')} error={errors.weightKg} />
        <div><Input label="Estimasi tiba (ETA awal)" type="date" required value={v.eta || ''} onChange={set('eta')} error={errors.eta} /><p className="mt-1 text-xs text-ink-500">Tanggal ini menjadi estimasi awal. Setelah trip dijadwalkan, ETA pengiriman akan mengikuti jadwal kedatangan trip terakhir yang terhubung.</p></div>
        {!isEdit && <>
          <Select label="Titik asal pengiriman" required value={v.originLocationId || ''} onChange={set('originLocationId')} error={errors.originLocationId} options={locationOptions} placeholder="Pilih asal dari Manajemen Koordinat" />
          <Select label="Titik tujuan pengiriman" required value={v.destinationLocationId || ''} onChange={set('destinationLocationId')} error={errors.destinationLocationId} options={locationOptions} placeholder="Pilih tujuan dari Manajemen Koordinat" />
          <p className="text-sm text-ink-500 sm:col-span-2">Pengiriman utama dibuat terlebih dahulu. Trip tidak perlu dibuat atau dipilih pada form ini; hubungkan AWB ke satu atau beberapa trip nanti melalui Manajemen Trip.</p>
        </>}
      </div>
      {isEdit && <section className="space-y-3 rounded-xl border border-ink-200 p-4">
        <div><h3 className="text-sm font-semibold text-ink-900">Posisi aktual (opsional)</h3><p className="mt-1 text-sm text-ink-500">Masukkan koordinat posisi yang dilaporkan driver. Ini bukan titik tujuan pengiriman. Kosongkan keduanya jika tidak memperbarui posisi.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Latitude posisi aktual" type="number" step="any" value={v.manualLat ?? ''} onChange={set('manualLat')} error={errors.manualLat} placeholder="Contoh: -6.914700" />
          <Input label="Longitude posisi aktual" type="number" step="any" value={v.manualLng ?? ''} onChange={set('manualLng')} error={errors.manualLng} placeholder="Contoh: 107.609800" />
        </div>
      </section>}
      <Textarea label="Catatan" value={v.notes || ''} onChange={set('notes')} />
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Batal</Button><Button type="submit" loading={saving}>{isEdit ? 'Simpan perubahan' : 'Buat pengiriman'}</Button></div>
    </form>
  )
}
