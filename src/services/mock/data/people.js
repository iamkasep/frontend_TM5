// Data awal untuk layanan lokal sebelum terhubung ke API backend.
export const vendors = [
  {
    id: 'VND-001',
    vendorCode: 'INTERNAL-HIL',
    vendorName: 'Internal - PT Harrasima Inventory Logistic',
    name: 'Internal - PT Harrasima Inventory Logistic',
    vendorType: 'TRANSPORTER',
    type: 'TRANSPORTER',
    npwp: '01.234.567.8-423.000',
    contactPerson: 'Operasional HIL',
    phoneNumber: '022-7300100',
    phone: '022-7300100',
    email: 'operasional@wmshil.com',
    address: 'Jl. Soekarno Hatta, Bandung',
    city: 'Bandung',
    province: 'Jawa Barat',
    postalCode: '40286',
    isActive: true,
    status: 'active',
    remarks: 'Armada operasional internal PT Harrasima Inventory Logistic',
  },
  {
    id: 'VND-002',
    vendorCode: 'EXT-AIR',
    vendorName: 'Vendor Kargo Udara',
    name: 'Vendor Kargo Udara',
    vendorType: 'THIRD_PARTY',
    type: 'THIRD_PARTY',
    npwp: '02.345.678.9-011.000',
    contactPerson: 'Cargo Desk',
    phoneNumber: '021-5501200',
    phone: '021-5501200',
    email: 'cargo@wmshil.com',
    address: 'Terminal Kargo Bandara Soekarno-Hatta',
    city: 'Jakarta',
    province: 'DKI Jakarta',
    postalCode: '19120',
    isActive: true,
    status: 'active',
    remarks: 'Mitra pengiriman jalur kargo udara',
  },
]

export const vehicles = [
  {
    id: 'VHC-001',
    plateNumber: 'D 1234 HIL',
    plate: 'D 1234 HIL',
    vehicleType: 'CDD',
    type: 'CDD',
    capacityKg: 4000,
    capacityM3: 18,
    vendorId: 'VND-001',
    vendorName: vendors[0].vendorName,
    status: 'active',
  },
  {
    id: 'VHC-002',
    plateNumber: 'D 5678 HIL',
    plate: 'D 5678 HIL',
    vehicleType: 'Pickup',
    type: 'Pickup',
    capacityKg: 1000,
    capacityM3: 6,
    vendorId: 'VND-001',
    vendorName: vendors[0].vendorName,
    status: 'active',
  },
]

export const drivers = [
  {
    id: 'DRV-001',
    driverCode: 'DRV-001',
    driverName: 'Budi Santoso',
    name: 'Budi Santoso',
    phoneNumber: '085720003001',
    phone: '085720003001',
    vendorId: 'VND-001',
    vendorName: vendors[0].vendorName,
    vehicleId: 'VHC-001',
    vehiclePlate: 'D 1234 HIL',
    status: 'active',
  },
  {
    id: 'DRV-002',
    driverCode: 'DRV-002',
    driverName: 'Andi Saputra',
    name: 'Andi Saputra',
    phoneNumber: '085720003002',
    phone: '085720003002',
    vendorId: 'VND-001',
    vendorName: vendors[0].vendorName,
    vehicleId: 'VHC-002',
    vehiclePlate: 'D 5678 HIL',
    status: 'active',
  },
]

export const customers = [
  {
    id: 'CUS-001',
    name: 'PT Maju Sejahtera',
    contactPerson: 'Dewi Lestari',
    email: 'dewi@majusejahtera.co.id',
    phone: '021-55501001',
    city: 'Bandung',
    status: 'active',
  },
]

export const companies = []
export const admins = []

export const users = [
  { id: 'USR-SA', role: 'superadmin', name: 'Anindya Prasetyo', email: 'anindya.prasetyo@wmshil.com', phone: '0811-0000-0001' },
  { id: 'USR-AD', role: 'admin', name: 'Rina Kusuma', email: 'rina.kusuma@wmshil.com', phone: '0811-0000-0101', adminId: 'ADM-001' },
  { id: 'USR-DR', role: 'driver', name: 'Budi Santoso', email: 'budi.santoso@wmshil.com', phone: '0857-2000-3001', driverId: 'DRV-001' },
  { id: 'USR-CU', role: 'customer', name: 'Dewi Lestari', email: 'dewi@majusejahtera.co.id', phone: '021-5550-1001', company: 'PT Maju Sejahtera', customerId: 'CUS-001' },
]
