/* eslint-disable react-refresh/only-export-components */
import { Input, Select } from '@/components/ui/Input'
import LocationPicker from '@/components/forms/LocationPicker'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateFields(fields, values) {
  const errors = {}
  fields.forEach((f) => {
    const v = values[f.name]
    const empty = v === undefined || v === null || String(v).trim() === ''
    if (f.required && empty) errors[f.name] = `${f.label} wajib diisi`
    else if (!empty && f.type === 'email' && !EMAIL.test(v)) errors[f.name] = 'Format email tidak valid'
    else if (!empty && f.type === 'number' && f.min !== undefined && Number(v) < f.min) errors[f.name] = `${f.label} minimal ${f.min}`
    else if (!empty && f.type === 'number' && f.max !== undefined && Number(v) > f.max) errors[f.name] = `${f.label} maksimal ${f.max}`
  })
  return errors
}

/** fields: [{ name, label, type: text|email|tel|number|select, required, options, min }] */
export default function EntityForm({ fields, values, errors, onChange, optionsMap = {} }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        // Untuk Manajemen Koordinat, satu peta mengisi latitude dan longitude sekaligus.
        if (f.name === 'longitude' && fields.some((field) => field.name === 'latitude' && field.mapPicker)) return null
        if (f.mapPicker) {
          return (
            <div key={f.name} className="sm:col-span-2">
              <LocationPicker
                title="Pilih titik lokasi pada peta"
                hint="Klik langsung pada peta untuk mengisi latitude dan longitude otomatis, atau isi kedua kolom secara manual."
                value={{ lat: String(values.latitude ?? ''), lng: String(values.longitude ?? '') }}
                onChange={(point) => { onChange('latitude', point.lat); onChange('longitude', point.lng) }}
                error={errors.latitude || errors.longitude}
                mapHeight="h-64"
              />
            </div>
          )
        }
        const common = { label: f.label, required: f.required, error: errors[f.name], value: values[f.name] ?? '', onChange: (e) => onChange(f.name, e.target.value) }
        return f.type === 'select'
          ? <Select key={f.name} {...common} options={f.options ?? optionsMap[f.name] ?? []} />
          : <Input key={f.name} {...common} type={f.type ?? 'text'} min={f.min} max={f.max} step={f.type === 'number' ? 'any' : undefined} />
      })}
    </div>
  )
}
