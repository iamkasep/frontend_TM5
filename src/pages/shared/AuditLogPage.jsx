import PageHeader from '@/components/layout/PageHeader'
import DataTable from '@/components/tables/DataTable'
import { Badge } from '@/components/ui/Badge'
import { useAsync } from '@/hooks/useAsync'
import { auditService } from '@/services/systemService'
import { ROLE_LABEL } from '@/lib/constants'
import { formatDateTime } from '@/lib/formatters'

const columns = [
  { key: 'at', header: 'Waktu', sortable: true, render: (r) => formatDateTime(r.at) },
  { key: 'actor', header: 'Pelaku', sortable: true },
  { key: 'role', header: 'Role', render: (r) => <Badge tone="blue">{ROLE_LABEL[r.role]}</Badge> },
  { key: 'action', header: 'Aktivitas' },
  { key: 'target', header: 'Objek', render: (r) => <span className="font-mono text-[13px]">{r.target}</span> },
]

export default function AuditLogPage() {
  const { data, loading, error, reload } = useAsync(() => auditService.list(), [])
  return (
    <>
      <PageHeader title="Audit Log" description="Jejak aktivitas pengguna pada sistem." />
      <DataTable
        columns={columns} rows={data} loading={loading} error={error} onRetry={reload}
        searchKeys={['actor', 'action', 'target']} searchPlaceholder="Cari pelaku atau aktivitas..."
        filters={[{ key: 'role', label: 'Role', options: Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label })) }]}
        initialSort={{ key: 'at', dir: 'desc' }} emptyTitle="Belum ada aktivitas tercatat"
      />
    </>
  )
}
