import PageHeader from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { API_BASE_URL } from '@/services/api'

export default function SettingsPage() {
  const connected = Boolean(API_BASE_URL)
  return (
    <>
      <PageHeader title="Pengaturan" description="Informasi sistem dan konfigurasi layanan operasional TMS." />
      <div className="grid max-w-4xl gap-5 md:grid-cols-2">
        <Card>
          <CardHeader title="Informasi Platform" action={<Badge tone="green">Aktif</Badge>} />
          <CardBody>
            <dl className="divide-y divide-ink-100 text-sm">
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-ink-500">Nama Sistem</dt>
                <dd className="text-right font-semibold text-ink-900">Tracking Management System (TMS)</dd>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-ink-500">Organisasi</dt>
                <dd className="text-right font-medium text-ink-900">PT Harrasima Inventory Logistic</dd>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-ink-500">Zona Waktu Operasional</dt>
                <dd className="text-right font-mono text-ink-900">Asia/Jakarta (WIB)</dd>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-ink-500">Versi Aplikasi</dt>
                <dd className="text-right font-mono text-ink-900">v1.0.0</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Layanan & Integrasi"
            action={<Badge tone={connected ? 'green' : 'blue'}>{connected ? 'REST API Terhubung' : 'Penyimpanan Lokal Aktif'}</Badge>}
          />
          <CardBody>
            <dl className="divide-y divide-ink-100 text-sm">
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-ink-500">Endpoint Server API</dt>
                <dd className="text-right font-mono text-ink-900">{API_BASE_URL || 'Lokal (Standar)'}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-ink-500">Peta & Navigasi</dt>
                <dd className="text-right text-ink-900">MapLibre GL · OpenFreeMap</dd>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-ink-500">Pencarian Koordinat</dt>
                <dd className="text-right text-ink-900">OpenStreetMap Nominatim</dd>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-ink-500">Saluran Pelacakan</dt>
                <dd className="text-right text-ink-900">GPS, SMS, WhatsApp, Manual, API</dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
