import { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_LABEL } from '@/lib/constants'
import { mockNote } from '@/services/api'

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!name.trim()) errs.name = 'Nama wajib diisi'
    if (!phone.trim()) errs.phone = 'Nomor telepon wajib diisi'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() })
      toast.success(`Profil diperbarui${mockNote}`)
    } catch (err) {
      // 422 dari backend: tampilkan pesan per field.
      if (err?.fieldErrors) setErrors(err.fieldErrors)
      toast.error(err?.message || 'Gagal menyimpan profil')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Profil" description="Data akun Anda." />
      <Card className="max-w-2xl">
        <CardHeader title="Informasi akun" action={<Badge tone="blue">{ROLE_LABEL[user.role]}</Badge>} />
        <CardBody>
          <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
            <Input label="Nama" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
            <Input label="Telepon" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
            <Input label="Email" value={user.email} readOnly hint="Email diatur oleh administrator." wrapperClassName="sm:col-span-2" />
            {user.company && <Input label="Perusahaan" value={user.company} readOnly wrapperClassName="sm:col-span-2" />}
            <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan profil'}</Button></div>
          </form>
        </CardBody>
      </Card>
    </>
  )
}
