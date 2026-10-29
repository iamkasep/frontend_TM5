import { drivers, vehicles, vendors } from './people'

const now = Date.now()
const hoursAgo = (h) => new Date(now - h * 3600 * 1000).toISOString()
const hoursAhead = (h) => new Date(now + h * 3600 * 1000).toISOString()

export const trips = [
  {
    id: 'TRP-001',
    tripNumber: 'TRIP-20261029-001',
    tripCode: 'TRIP-20261029-001',
    vendorId: 'VND-001',
    driverId: 'DRV-001',
    driverName: 'Budi Santoso',
    vehicleId: 'VHC-001',
    vehiclePlate: 'D 1234 HIL',
    originLocationId: 'LOC-001',
    destinationLocationId: 'LOC-003',
    origin: 'Gudang Bandung',
    destination: 'Lokasi Customer Jakarta',
    originLat: -6.9147,
    originLng: 107.6098,
    destinationLat: -6.2088,
    destinationLng: 106.8456,
    plannedDeparture: hoursAgo(4),
    actualDeparture: hoursAgo(3.8),
    plannedArrival: hoursAhead(2),
    actualArrival: null,
    status: 'in_progress',
    notes: 'Perjalanan reguler rute Bandung – Jakarta membawa 2 AWB untuk PT Maju Sejahtera.',
    shipmentIds: ['SHP-001', 'SHP-002'],
    tripShipments: [
      {
        id: 'TRP-001-TS-001',
        tripId: 'TRP-001',
        awbId: 'SHP-001',
        deliveryStatus: 'IN_TRANSIT',
        loadedAt: hoursAgo(4),
        deliveredAt: null,
      },
      {
        id: 'TRP-001-TS-002',
        tripId: 'TRP-001',
        awbId: 'SHP-002',
        deliveryStatus: 'IN_TRANSIT',
        loadedAt: hoursAgo(4),
        deliveredAt: null,
      },
    ],
  },
]

export { drivers, vehicles, vendors }
