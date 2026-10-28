import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import DataTable from '@/components/tables/DataTable'
import Button from '@/components/ui/Button'
import { shipmentColumns } from '@/components/sections/shipments/ShipmentColumns'
import { useAuth } from '@/hooks/useAuth'
import { useShipments } from '@/hooks/useShipments'
import { ACTIVE_STATUSES, HISTORY_STATUSES, STATUS_OPTIONS } from '@/lib/constants'
import { shipmentService } from '@/services/shipmentService'
import { useToast } from '@/components/ui/Toast'
import { mockNote } from '@/services/api'

const ADMIN_STATUS_OPTIONS = [
  { value: 'picked_up', label: 'Pemuatan' },
  { value: 'in_transit', label: 'In transit' },
  { value: 'delivered', label: 'Sudah dikirim' },
  { value: 'cancelled', label: 'Cancel' },
]

/** mode: 'all' | 'active' | 'history' */
export default function ShipmentsPage({ mode = 'all' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, loading, error, reload } = useShipments()
  const isStaff = user.role === 'admin' || user.role === 'superadmin'
  const base = `/${user.role}`

  const rows = (data ?? []).filter((s) => (mode === 'active' ? ACTIVE_STATUSES.includes(s.status) : mode === 'history' ? HISTORY_STATUSES.includes(s.status) : true))
  const statusOptions = mode === 'history' ? STATUS_OPTIONS.filter((o) => HISTORY_STATUSES.includes(o.value)) : STATUS_OPTIONS

  const changeStatus = async (shipment, nextStatus) => {
    if (!nextStatus || nextStatus === shipment.status) return
    try {
      await shipmentService.updateStatus(shipment.id, nextStatus)
      toast.success(`Status ${shipment.trackingNumber} diperbarui${mockNote}`)
      reload()
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui status pengiriman')
    }
  }

  const adminActionColumn = {
    key: 'adminStatusAction',
    header: 'Aksi Status',
    render: (shipment) => (
      <div onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
        <select
          aria-label={`Ubah status ${shipment.trackingNumber}`}
          value={shipment.status}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onChange={(event) => { event.stopPropagation(); changeStatus(shipment, event.target.value) }}
          className="max-w-36 rounded-lg border border-ink-200 bg-white px-2 py-2 text-xs text-ink-800 outline-none focus:border-route-500 focus:ring-2 focus:ring-route-100"
        >
          <option value={shipment.status}>{STATUS_OPTIONS.find((option) => option.value === shipment.status)?.label || shipment.status}</option>
          {ADMIN_STATUS_OPTIONS.filter((option) => option.value !== shipment.status).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
    ),
  }

  const columns = [
    ...shipmentColumns({ showCustomer: isStaff, showDriver: user.role !== 'driver' }),
    ...(user.role === 'admin' && mode !== 'history' ? [adminActionColumn] : []),
  ]

  const title = mode === 'history' ? 'Riwayat Pengiriman'
    : user.role === 'superadmin' ? 'Semua Pengiriman'
      : isStaff ? 'Manajemen Pengiriman' : 'Pengiriman Saya'
  const description = mode === 'history' ? 'Pengiriman yang sudah selesai atau dibatalkan.' : 'Cari, saring, dan buka detail pengiriman.'

  return (
    <>
      <PageHeader
        title={title} description={description}
        actions={user.role === 'admin' && <Button onClick={() => navigate(`${base}/shipments/new`)}><Plus className="size-4" /> Buat pengiriman</Button>}
      />
      <DataTable
        columns={columns} rows={rows} loading={loading} error={error} onRetry={reload}
        searchKeys={['trackingNumber', 'customerName', 'driverName', 'origin.city', 'destination.city', 'tripCode']}
        searchPlaceholder="Cari AWB/resi, customer, trip, atau kota..."
        filters={[{ key: 'status', label: 'Status', options: statusOptions }]}
        initialSort={{ key: 'eta', dir: 'desc' }}
        onRowClick={(shipment) => navigate(`${base}/shipments/${shipment.id}`)}
        emptyTitle={mode === 'history' ? 'Belum ada riwayat pengiriman' : 'Belum ada pengiriman'}
        emptyDescription={user.role === 'admin' ? 'Buat pengiriman pertama untuk mulai melacak.' : 'Pengiriman akan muncul di sini setelah ditugaskan.'}
      />
    </>
  )
}
