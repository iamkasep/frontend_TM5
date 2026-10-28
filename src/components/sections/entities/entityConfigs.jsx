import { EntityStatusBadge } from '@/components/ui/Badge'
import { adminService, customerService, vendorService, companyService } from '@/services/masterService'
import { driverService } from '@/services/driverService'
import { vehicleService } from '@/services/vehicleService'
import { formatNumber } from '@/lib/formatters'
import { locationService } from '@/services/locationService'

const statusCol = {
  key: 'status',
  header: 'Status',
  sortable: true,
  render: (r) => <EntityStatusBadge status={r.status} />,
}

const opts = (list) => list.map(([value, label]) => ({ value, label }))
const vendorOptions = async () => (await vendorService.list()).map((v) => ({ value: v.id, label: v.name }))
const activeInactiveOpts = opts([['active', 'Aktif'], ['inactive', 'Nonaktif']])

export const ENTITY_CONFIGS = {
  companies: {
    title: 'Manajemen Perusahaan',
    singular: 'perusahaan',
    description: 'Kelola tenant perusahaan yang menggunakan platform TMS.',
    service: companyService,
    columns: [
      { key: 'name', header: 'Perusahaan', sortable: true },
      { key: 'code', header: 'Kode', sortable: true },
      { key: 'contactPerson', header: 'Kontak' },
      { key: 'plan', header: 'Paket' },
      statusCol,
    ],
    fields: [
      { name: 'name', label: 'Nama perusahaan', required: true },
      { name: 'code', label: 'Kode perusahaan', required: true },
      { name: 'domain', label: 'Domain', required: true },
      { name: 'contactPerson', label: 'Nama kontak', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Telepon', type: 'tel', required: true },
      { name: 'plan', label: 'Paket', type: 'select', required: true, options: opts([['Starter', 'Starter'], ['Business', 'Business'], ['Enterprise', 'Enterprise']]) },
      { name: 'status', label: 'Status', type: 'select', required: true, options: activeInactiveOpts },
    ],
    searchKeys: ['name', 'code', 'domain', 'contactPerson'],
    filters: [{ key: 'status', label: 'Status', options: activeInactiveOpts }],
    defaults: { status: 'active', plan: 'Starter' },
  },

  admins: {
    title: 'Manajemen Admin',
    singular: 'admin',
    description: 'Akun admin operasional.',
    service: adminService,
    columns: [
      { key: 'name', header: 'Nama', sortable: true },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Telepon' },
      statusCol,
    ],
    fields: [
      { name: 'name', label: 'Nama', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Telepon', type: 'tel', required: true },
      { name: 'status', label: 'Status', type: 'select', required: true, options: activeInactiveOpts },
    ],
    searchKeys: ['name', 'email'],
    filters: [{ key: 'status', label: 'Status', options: activeInactiveOpts }],
    defaults: { status: 'active' },
  },

  customers: {
    title: 'Manajemen Customer',
    singular: 'customer',
    description: 'Perusahaan pemilik pengiriman.',
    service: customerService,
    columns: [
      { key: 'name', header: 'Perusahaan', sortable: true },
      { key: 'contactPerson', header: 'Kontak' },
      { key: 'city', header: 'Kota', sortable: true },
      { key: 'phone', header: 'Telepon' },
      statusCol,
    ],
    fields: [
      { name: 'name', label: 'Nama perusahaan', required: true },
      { name: 'contactPerson', label: 'Nama kontak', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Telepon', type: 'tel', required: true },
      { name: 'city', label: 'Kota', required: true },
      { name: 'status', label: 'Status', type: 'select', required: true, options: activeInactiveOpts },
    ],
    searchKeys: ['name', 'contactPerson', 'city'],
    filters: [{ key: 'status', label: 'Status', options: activeInactiveOpts }],
    defaults: { status: 'active' },
  },

  drivers: {
    title: 'Manajemen Driver',
    singular: 'driver',
    description: 'Kelola data driver dan ketersediaannya.',
    service: driverService,
    columns: [
      { key: 'driverCode', header: 'Kode driver', sortable: true },
      { key: 'name', header: 'Nama', sortable: true },
      { key: 'phone', header: 'Telepon' },
      { key: 'vendorName', header: 'Vendor', sortable: true },
      statusCol,
    ],
    fields: [
      { name: 'driverCode', label: 'Kode driver', required: true },
      { name: 'name', label: 'Nama', required: true },
      { name: 'phone', label: 'Telepon', type: 'tel', required: true },
      { name: 'licenseNumber', label: 'Nomor SIM', required: true },
      { name: 'vendorId', label: 'Vendor', type: 'select', required: true, loadOptions: vendorOptions, labelKey: 'vendorName' },
      { name: 'status', label: 'Status', type: 'select', required: true, options: opts([['available', 'Tersedia'], ['on_duty', 'Bertugas'], ['off', 'Libur']]) },
    ],
    searchKeys: ['driverCode', 'name', 'vendorName'],
    filters: [{ key: 'status', label: 'Status', options: opts([['available', 'Tersedia'], ['on_duty', 'Bertugas'], ['off', 'Libur']]) }],
    defaults: { status: 'available' },
  },

  vendors: {
    title: 'Manajemen Vendor',
    singular: 'vendor',
    description: 'Mitra penyedia armada.',
    service: vendorService,
    columns: [
      { key: 'vendorCode', header: 'Kode vendor', sortable: true },
      { key: 'name', header: 'Vendor', sortable: true },
      { key: 'type', header: 'Jenis', render: (r) => (r.type === 'internal' ? 'Internal' : 'External') },
      { key: 'contactPerson', header: 'Kontak' },
      { key: 'phone', header: 'Telepon' },
      { key: 'city', header: 'Kota', sortable: true },
      statusCol,
    ],
    fields: [
      { name: 'vendorCode', label: 'Kode vendor', required: true },
      { name: 'name', label: 'Nama vendor', required: true },
      { name: 'type', label: 'Jenis vendor', type: 'select', required: true, options: opts([['internal', 'Internal'], ['external', 'External']]) },
      { name: 'contactPerson', label: 'Nama kontak', required: true },
      { name: 'phone', label: 'Telepon', type: 'tel', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'npwp', label: 'NPWP' },
      { name: 'address', label: 'Alamat' },
      { name: 'city', label: 'Kota', required: true },
      { name: 'province', label: 'Provinsi' },
      { name: 'postalCode', label: 'Kode pos' },
      { name: 'status', label: 'Status', type: 'select', required: true, options: activeInactiveOpts },
    ],
    searchKeys: ['vendorCode', 'name', 'contactPerson', 'city'],
    filters: [{ key: 'status', label: 'Status', options: activeInactiveOpts }],
    defaults: { status: 'active', type: 'external' },
  },

  locations: {
    title: 'Manajemen Koordinat',
    singular: 'titik koordinat',
    description: 'Kelola lokasi tetap gudang, bandara, dan lokasi tujuan. Lokasi yang tidak digunakan lagi dapat dinonaktifkan.',
    service: locationService,
    columns: [
      { key: 'code', header: 'Kode', sortable: true },
      { key: 'name', header: 'Nama lokasi', sortable: true },
      { key: 'type', header: 'Jenis lokasi' },
      { key: 'address', header: 'Alamat' },
      { key: 'latitude', header: 'Latitude' },
      { key: 'longitude', header: 'Longitude' },
      statusCol,
    ],
    fields: [
      { name: 'code', label: 'Kode lokasi', required: true },
      { name: 'name', label: 'Nama lokasi', required: true },
      {
        name: 'type',
        label: 'Jenis lokasi',
        type: 'select',
        required: true,
        options: opts([
          ['warehouse', 'Gudang'],
          ['airport', 'Bandara'],
          ['customer_site', 'Lokasi customer'],
          ['port', 'Pelabuhan'],
          ['other', 'Lainnya'],
        ]),
      },
      { name: 'address', label: 'Alamat', required: true },
      { name: 'latitude', label: 'Latitude', type: 'number', min: -90, max: 90, required: true, mapPicker: true },
      { name: 'longitude', label: 'Longitude', type: 'number', min: -180, max: 180, required: true },
      { name: 'status', label: 'Status', type: 'select', required: true, options: activeInactiveOpts },
    ],
    searchKeys: ['code', 'name', 'address', 'type'],
    filters: [{ key: 'status', label: 'Status', options: activeInactiveOpts }],
    defaults: { status: 'active', type: 'warehouse' },
    softDelete: true,
  },

  vehicles: {
    title: 'Manajemen Kendaraan',
    singular: 'kendaraan',
    description: 'Armada beserta kapasitas dan statusnya.',
    service: vehicleService,
    columns: [
      {
        key: 'plate',
        header: 'Plat nomor',
        sortable: true,
        render: (r) => <span className="font-mono text-[13px] font-medium text-ink-900">{r.plate}</span>,
      },
      { key: 'type', header: 'Jenis', sortable: true },
      {
        key: 'capacityKg',
        header: 'Kapasitas berat',
        sortable: true,
        render: (r) => `${formatNumber(r.capacityKg)} kg`,
      },
      {
        key: 'capacityM3',
        header: 'Kapasitas volume',
        render: (r) => (r.capacityM3 == null ? '—' : `${formatNumber(r.capacityM3)} m³`),
      },
      { key: 'vendorName', header: 'Vendor' },
      statusCol,
    ],
    fields: [
      { name: 'plate', label: 'Plat nomor', required: true },
      {
        name: 'type',
        label: 'Jenis',
        type: 'select',
        required: true,
        options: opts([
          ['Pickup', 'Pickup'],
          ['Truk Engkel', 'Truk Engkel'],
          ['CDD', 'CDD'],
          ['Fuso', 'Fuso'],
          ['Wingbox', 'Wingbox'],
        ]),
      },
      { name: 'capacityKg', label: 'Kapasitas berat (kg)', type: 'number', min: 1, required: true },
      { name: 'capacityM3', label: 'Kapasitas volume (m³)', type: 'number', min: 0 },
      { name: 'vendorId', label: 'Vendor', type: 'select', required: true, loadOptions: vendorOptions, labelKey: 'vendorName' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: opts([['available', 'Tersedia'], ['in_use', 'Dipakai'], ['maintenance', 'Perawatan']]),
      },
    ],
    searchKeys: ['plate', 'type', 'vendorName'],
    filters: [{ key: 'status', label: 'Status', options: opts([['available', 'Tersedia'], ['in_use', 'Dipakai'], ['maintenance', 'Perawatan']]) }],
    defaults: { status: 'available' },
  },
}
