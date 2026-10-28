// Data dummy awal untuk demo frontend. Seluruh isi folder `services/mock/` hanya dipakai saat VITE_API_BASE_URL kosong.
export const vendors = [
  {
    id: 'VND-001',
    vendorCode: 'INTERNAL-HIL',
    name: 'Internal - PT Harrasima Inventory Logistic',
    type: 'internal',
    contactPerson: 'Operasional HIL',
    phone: '022-000000',
    email: 'operasional@hil.example',
    city: 'Bandung',
    status: 'active',
  },
  {
    id: 'VND-002',
    vendorCode: 'EXT-AIR',
    name: 'Vendor Kargo Udara',
    type: 'external',
    contactPerson: 'Cargo Desk',
    phone: '021-000000',
    email: '',
    city: 'Jakarta',
    status: 'active',
  },
]

export const vehicles = [
  { id: 'VHC-001', plate: 'D 1234 HIL', type: 'CDD', capacityKg: 4000, capacityM3: 18, vendorId: 'VND-001', vendorName: vendors[0].name, status: 'available' },
  { id: 'VHC-002', plate: 'D 5678 HIL', type: 'Pickup', capacityKg: 1000, capacityM3: 6, vendorId: 'VND-001', vendorName: vendors[0].name, status: 'available' },
]

export const drivers = [
  {
    id: 'DRV-001',
    driverCode: 'DRV-001',
    name: 'Budi Santoso',
    phone: '085720003001',
    licenseNumber: 'SIM-B1-001',
    vendorId: 'VND-001',
    vendorName: vendors[0].name,
    vehicleId: 'VHC-001',
    vehiclePlate: 'D 1234 HIL',
    status: 'available',
  },
  {
    id: 'DRV-002',
    driverCode: 'DRV-002',
    name: 'Andi Saputra',
    phone: '085720003002',
    licenseNumber: 'SIM-A-002',
    vendorId: 'VND-001',
    vendorName: vendors[0].name,
    vehicleId: 'VHC-002',
    vehiclePlate: 'D 5678 HIL',
    status: 'available',
  },
]

export const customers = [
  {
    id: 'CUS-001',
    name: 'PT Maju Sejahtera',
    contactPerson: 'Dewi Lestari',
    email: 'dewi@majusejahtera.example',
    phone: '021-55501001',
    city: 'Bandung',
    status: 'active',
  },
]

export const companies = []
export const admins = []

export const users = [
  { id: 'USR-SA', role: 'superadmin', name: 'Anindya Prasetyo', email: 'anindya.prasetyo@tms.example', phone: '0811-0000-0001' },
  { id: 'USR-AD', role: 'admin', name: 'Rina Kusuma', email: 'rina.kusuma@tms.example', phone: '0811-0000-0101', adminId: 'ADM-001' },
  { id: 'USR-DR', role: 'driver', name: 'Budi Santoso', email: 'budi.santoso@tms.example', phone: '0857-2000-3001', driverId: 'DRV-001' },
  { id: 'USR-CU', role: 'customer', name: 'Dewi Lestari', email: 'dewi@majusejahtera.example', phone: '021-5550-1001', company: 'PT Maju Sejahtera', customerId: 'CUS-001' },
]
