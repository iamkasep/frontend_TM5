import PageHeader from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { API_BASE_URL, USE_MOCK } from '@/services/api'

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Pengaturan" description="Status integrasi aplikasi." />
      <Card className="max-w-2xl">
        <CardHeader title="Sumber data" action={<Badge tone={USE_MOCK ? 'amber' : 'green'}>{USE_MOCK ? 'Mode simulasi' : 'Mode API'}</Badge>} />
        <CardBody>
          <dl className="divide-y divide-ink-100 text-sm">
            <div className="flex justify-between gap-4 py-2"><dt className="text-ink-500">VITE_API_BASE_URL</dt><dd className="font-mono text-ink-900">{API_BASE_URL || '(kosong)'}</dd></div>
            <div className="flex justify-between gap-4 py-2"><dt className="text-ink-500">Penyimpanan data</dt><dd className="text-right text-ink-900">{USE_MOCK ? 'Memori sesi (hilang saat dimuat ulang)' : 'Backend'}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-ink-500">
            Untuk beralih ke backend, isi <span className="font-mono">VITE_API_BASE_URL</span> di file <span className="font-mono">.env</span> lalu jalankan ulang aplikasi.
            Path endpoint di <span className="font-mono">src/services/api.js</span> masih asumsi sementara sampai tim backend memberikan spesifikasi.
          </p>
        </CardBody>
      </Card>
    </>
  )
}
