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
const vendorOptions = async () => (await vendorService.list()).map((v) => ({ value: v.id, label: v.vendorName || v.name }))
const activeInactiveOpts = opts([['active', 'Aktif'], ['inactive', 'Nonaktif']])

const VENDOR_TYPE_LABEL = {
  TRANSPORTER: 'Transporter',
  COURIER: 'Courier',
  THIRD_PARTY: 'Third Party',
}

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
    description: 'Kelola data driver operasional (dm_drivers).',
    service: driverService,
    columns: [
      { key: 'driverCode', header: 'Kode driver', sortable: true },
      { key: 'driverName', header: 'Nama driver', sortable: true, render: (r) => r.driverName || r.name },
      { key: 'phoneNumber', header: 'Nomor HP (SMS)', render: (r) => r.phoneNumber || r.phone },
      { key: 'vendorName', header: 'Vendor terkait', sortable: true },
      statusCol,
    ],
    fields: [
      { name: 'driverCode', label: 'Kode driver', required: true },
      { name: 'driverName', label: 'Nama driver', required: true },
      { name: 'phoneNumber', label: 'Nomor HP untuk SMS', type: 'tel', required: true },
      { name: 'vendorId', label: 'Vendor terkait', type: 'select', required: true, loadOptions: vendorOptions, labelKey: 'vendorName' },
      { name: 'status', label: 'Status', type: 'select', required: true, options: activeInactiveOpts },
    ],
    searchKeys: ['driverCode', 'driverName', 'name', 'phoneNumber', 'vendorName'],
    filters: [{ key: 'status', label: 'Status', options: activeInactiveOpts }],
    defaults: { status: 'active' },
  },

  vendors: {
    title: 'Manajemen Vendor',
    singular: 'vendor',
    description: 'Mitra penyedia armada dan ekspedisi (dm_vendors).',
    service: vendorService,
    columns: [
      { key: 'vendorCode', header: 'Kode vendor', sortable: true },
      { key: 'vendorName', header: 'Nama vendor', sortable: true, render: (r) => r.vendorName || r.name },
      {
        key: 'vendorType',
        header: 'Jenis vendor',
        render: (r) => VENDOR_TYPE_LABEL[r.vendorType || r.type] || r.vendorType || r.type,
      },
      { key: 'contactPerson', header: 'PIC vendor' },
      { key: 'phoneNumber', header: 'Telepon', render: (r) => r.phoneNumber || r.phone },
      { key: 'city', header: 'Kota', sortable: true },
      statusCol,
    ],
    fields: [
      { name: 'vendorCode', label: 'Kode vendor', required: true },
      { name: 'vendorName', label: 'Nama resmi vendor', required: true },
      {
        name: 'vendorType',
        label: 'Jenis vendor',
        type: 'select',
        required: true,
        options: opts([
          ['TRANSPORTER', 'TRANSPORTER'],
          ['COURIER', 'COURIER'],
          ['THIRD_PARTY', 'THIRD_PARTY'],
        ]),
      },
      { name: 'npwp', label: 'NPWP' },
      { name: 'contactPerson', label: 'Nama PIC vendor', required: true },
      { name: 'phoneNumber', label: 'Nomor telepon vendor', type: 'tel', required: true },
      { name: 'email', label: 'Email kontak vendor', type: 'email' },
      { name: 'address', label: 'Alamat kantor vendor' },
      { name: 'city', label: 'Kota vendor', required: true },
      { name: 'province', label: 'Provinsi vendor' },
      { name: 'postalCode', label: 'Kode pos' },
      { name: 'status', label: 'Status aktif (is_active)', type: 'select', required: true, options: activeInactiveOpts },
      { name: 'remarks', label: 'Catatan tambahan (remarks)' },
    ],
    searchKeys: ['vendorCode', 'vendorName', 'name', 'contactPerson', 'city', 'vendorType'],
    filters: [{ key: 'status', label: 'Status', options: activeInactiveOpts }],
    defaults: { status: 'active', vendorType: 'TRANSPORTER' },
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
    description: 'Armada beserta kapasitas dan status operasionalnya (dm_vehicles).',
    service: vehicleService,
    columns: [
      {
        key: 'plateNumber',
        header: 'Nomor polisi',
        sortable: true,
        render: (r) => <span className="font-mono text-[13px] font-medium text-ink-900">{r.plateNumber || r.plate}</span>,
      },
      { key: 'vehicleType', header: 'Jenis kendaraan', sortable: true, render: (r) => r.vehicleType || r.type },
      {
        key: 'capacityKg',
        header: 'Kapasitas berat',
        sortable: true,
        render: (r) => `${formatNumber(r.capacityKg)} kg`,
      },
      {
        key: 'capacityM3',
        header: 'Kapasitas volume',
        render: (r) => (r.capacityM3 == null || r.capacityM3 === '' ? '—' : `${formatNumber(r.capacityM3)} m³`),
      },
      { key: 'vendorName', header: 'Pemilik / Vendor' },
      statusCol,
    ],
    fields: [
      { name: 'plateNumber', label: 'Nomor polisi (plate_number)', required: true },
      {
        name: 'vehicleType',
        label: 'Jenis kendaraan (vehicle_type)',
        type: 'select',
        required: true,
        options: opts([
          ['Pickup', 'Pickup'],
          ['Truk Engkel', 'Truk Engkel'],
          ['CDD', 'CDD'],
          ['Fuso', 'Fuso'],
          ['Wingbox', 'Wingbox'],
          ['Tronton', 'Tronton'],
        ]),
      },
      { name: 'capacityKg', label: 'Kapasitas berat (kg)', type: 'number', min: 1, required: true },
      { name: 'capacityM3', label: 'Kapasitas volume (m³)', type: 'number', min: 0 },
      { name: 'vendorId', label: 'Pemilik / Vendor', type: 'select', required: true, loadOptions: vendorOptions, labelKey: 'vendorName' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: opts([['active', 'Aktif'], ['maintenance', 'Perawatan'], ['inactive', 'Nonaktif']]),
      },
    ],
    searchKeys: ['plateNumber', 'plate', 'vehicleType', 'type', 'vendorName'],
    filters: [{ key: 'status', label: 'Status', options: opts([['active', 'Aktif'], ['maintenance', 'Perawatan'], ['inactive', 'Nonaktif']]) }],
    defaults: { status: 'active' },
  },
}
