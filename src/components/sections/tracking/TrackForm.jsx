import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useScope } from '@/hooks/useAuth'
import { shipmentService } from '@/services/shipmentService'

/** Mencari pengiriman milik pengguna berdasarkan nomor resi. */
export default function TrackForm({ basePath }) {
  const navigate = useNavigate()
  const scope = useScope()
  const [resi, setResi] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!resi.trim()) { setError('Masukkan nomor resi'); return }
    setBusy(true); setError('')
    try {
      const found = await shipmentService.findByTrackingNumber(resi, scope)
      if (found) navigate(`${basePath}/shipments/${found.id}`)
      else setError('Nomor resi tidak ditemukan di akun Anda. Periksa kembali penulisannya.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <Input
        wrapperClassName="flex-1" aria-label="Nomor resi" placeholder="Contoh: TMS-20261019-030" className="font-mono"
        value={resi} onChange={(e) => setResi(e.target.value)} error={error}
      />
      <Button type="submit" loading={busy}><Search className="size-4" /> Lacak</Button>
    </form>
  )
}
