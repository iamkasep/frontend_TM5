import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import DataTable from '@/components/tables/DataTable'
import EntityForm, { validateFields } from '@/components/forms/EntityForm'
import Modal, { ConfirmDialog } from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAsync } from '@/hooks/useAsync'
import { mockNote } from '@/services/api'

/** Halaman CRUD generik untuk data induk (driver, customer, vendor, kendaraan, admin). */
export default function EntityManager({ config }) {
  const { title, description, singular, service, columns, fields, searchKeys, filters, defaults = {} } = config
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(() => service.list(), [service])
  const { data: optionsMap } = useAsync(async () => {
    const out = {}
    for (const f of fields) if (f.loadOptions) out[f.name] = await f.loadOptions()
    return out
  }, [config])

  const [editing, setEditing] = useState(null) // { id?, values }
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const openNew = () => { setErrors({}); setEditing({ values: { ...defaults } }) }
  const openEdit = (row) => { setErrors({}); setEditing({ id: row.id, values: { ...row } }) }

  const save = async () => {
    const errs = validateFields(fields, editing.values)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const payload = { ...editing.values }
    fields.forEach((f) => {
      if (f.labelKey && f.type === 'select') {
        payload[f.labelKey] = (optionsMap?.[f.name] ?? []).find((o) => o.value === payload[f.name])?.label ?? ''
      }
      if (f.type === 'number') payload[f.name] = Number(payload[f.name])
    })
    setSaving(true)
    try {
      if (editing.id) await service.update(editing.id, payload)
      else await service.create(payload)
      toast.success(`Data ${singular} disimpan${mockNote}`)
      setEditing(null)
      reload()
    } catch (e) {
      // 422 dari backend: tampilkan pesan per field pada form bila nama field cocok.
      if (e.fieldErrors) setErrors(e.fieldErrors)
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setSaving(true)
    try {
      await service.remove(deleting.id)
      toast.success(`Data ${singular} dihapus${mockNote}`)
      setDeleting(null)
      reload()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const cols = [
    ...columns,
    {
      key: 'actions', header: <span className="sr-only">Aksi</span>, className: 'w-24 text-right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)} aria-label={`Edit ${row.name ?? row.plate}`}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleting(row)} aria-label={`${config.softDelete ? 'Nonaktifkan' : 'Hapus'} ${row.name ?? row.plate}`}><Trash2 className="size-4 text-rose-600" /></Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader title={title} description={description} actions={<Button onClick={openNew}><Plus className="size-4" /> Tambah {singular}</Button>} />
      <DataTable
        columns={cols} rows={data} loading={loading} error={error} onRetry={reload}
        searchKeys={searchKeys} filters={filters} searchPlaceholder={`Cari ${singular}...`}
        emptyTitle={`Belum ada data ${singular}`} emptyDescription={`Tambahkan ${singular} pertama untuk mulai mengelola data.`}
      />

      <Modal
        open={!!editing} size="lg" onClose={() => !saving && setEditing(null)}
        title={editing?.id ? `Edit ${singular}` : `Tambah ${singular}`}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>Batal</Button>
            <Button onClick={save} loading={saving}>Simpan</Button>
          </>
        )}
      >
        {editing && (
          <EntityForm
            fields={fields} values={editing.values} errors={errors} optionsMap={optionsMap ?? {}}
            onChange={(k, v) => setEditing((e) => ({ ...e, values: { ...e.values, [k]: v } }))}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting} danger loading={saving} title={`${config.softDelete ? 'Nonaktifkan' : 'Hapus'} ${singular}?`} confirmLabel={config.softDelete ? 'Nonaktifkan' : 'Hapus'}
        message={config.softDelete ? `Data "${deleting?.name ?? deleting?.plate}" akan dinonaktifkan agar tidak dipilih pada transaksi baru. Riwayat lama tetap tersimpan.` : `Data "${deleting?.name ?? deleting?.plate}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={remove} onCancel={() => setDeleting(null)}
      />
    </>
  )
}
