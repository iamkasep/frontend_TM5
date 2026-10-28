import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Camera, MapPin, CheckCircle2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { NEXT_ACTION } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { useGps } from '@/hooks/useGps'
import { reportService } from '@/services/reportService'
import { shipmentService } from '@/services/shipmentService'
import { podService } from '@/services/podService'
import { mockNote } from '@/services/api'

const nowMs = () => Date.now()

const toDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(blob)
})

async function compressAndWatermark(file, location, capturedAt) {
  const bitmap = await createImageBitmap(file)
  const max = 1280
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

  const line1 = capturedAt.toLocaleString('id-ID')
  const line2 = location ? `GPS ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'GPS tidak tersedia'
  const line3 = location?.accuracy ? `Akurasi ±${Math.round(location.accuracy)} m` : 'Lokasi tidak tersedia'
  const font = Math.max(12, Math.round(canvas.width * 0.022))
  const pad = Math.round(font * 0.7)
  const lineH = Math.round(font * 1.5)
  const boxH = pad * 2 + lineH * 3

  ctx.fillStyle = 'rgba(0,0,0,0.68)'
  ctx.fillRect(0, canvas.height - boxH, canvas.width, boxH)
  ctx.fillStyle = '#fff'
  ctx.font = `600 ${font}px sans-serif`
  ctx.textBaseline = 'top'
  ctx.fillText(line1, pad, canvas.height - boxH + pad)
  ctx.fillText(line2, pad, canvas.height - boxH + pad + lineH)
  ctx.fillText(line3, pad, canvas.height - boxH + pad + lineH * 2)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.78))
  if (!blob) throw new Error('Foto gagal dikompres. Coba ambil foto kembali.')
  return {
    blob,
    dataUrl: await toDataUrl(blob),
    width: canvas.width,
    height: canvas.height,
    originalBytes: file.size,
    compressedBytes: blob.size,
  }
}

function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        accuracy: p.coords.accuracy,
        obtainedAt: new Date(p.timestamp || Date.now()).toISOString(),
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })
}

/** Bukti serah terima: kamera langsung, kompresi JPEG, watermark dan catatan GPS. */
export default function DriverStatusActions({ shipment, onChanged, size = 'lg', className }) {
  const toast = useToast()
  const { user } = useAuth()
  const { position } = useGps()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [proof, setProof] = useState(null)
  const [proofBlob, setProofBlob] = useState(null)
  const [proofMeta, setProofMeta] = useState(null)

  // Hook cleanup harus dipanggil sebelum return dini agar urutan hook tetap sama di setiap render.
  useEffect(() => () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop())
  }, [])

  const next = NEXT_ACTION[shipment.status]
  if (!next) return null

  const clearProof = () => {
    setProof(null)
    setProofBlob(null)
    setProofMeta(null)
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOpen(false)
  }

  const openCamera = async () => {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Browser ini tidak mendukung akses kamera langsung. Buka aplikasi melalui localhost atau HTTPS dan gunakan browser terbaru.')
      setCameraOpen(true)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      setCameraOpen(true)
      // Attach stream after the preview element has mounted.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      })
    } catch (error) {
      const message = error?.name === 'NotAllowedError'
        ? 'Izin kamera ditolak. Izinkan akses kamera melalui ikon pengaturan situs di browser.'
        : error?.name === 'NotFoundError'
          ? 'Kamera tidak ditemukan. Periksa apakah laptop memiliki kamera dan tidak sedang digunakan aplikasi lain.'
          : 'Kamera tidak dapat dibuka. Pastikan izin kamera aktif dan aplikasi dibuka melalui localhost atau HTTPS.'
      setCameraError(message)
      setCameraOpen(true)
    }
  }

  const capturePhoto = async () => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Kamera belum siap. Tunggu sampai preview terlihat, lalu coba lagi.')
      return
    }
    setBusy(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext('2d')
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('Gagal mengambil gambar dari kamera.'))), 'image/jpeg', 0.92),
      )
      const file = new File([blob], `bukti-serah-terima-${nowMs()}.jpg`, { type: 'image/jpeg', lastModified: nowMs() })
      stopCamera()
      await preparePhoto(file)
    } catch (error) {
      setCameraError(error.message || 'Gagal mengambil foto. Silakan coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  const preparePhoto = async (file) => {
    if (!file) return
    if (!file.type?.startsWith('image/')) {
      toast.error('File kamera bukan gambar yang valid.')
      return
    }
    setBusy(true)
    try {
      const capturedAt = new Date()
      const gps = await getPosition()
      const location = gps || (position
        ? {
          latitude: Number(position.lat),
          longitude: Number(position.lng),
          accuracy: position.accuracy,
          obtainedAt: new Date().toISOString(),
          source: 'gps_hook_fallback',
        }
        : null)
      const compressed = await compressAndWatermark(file, location, capturedAt)
      setProof(compressed.dataUrl)
      setProofBlob(compressed.blob)
      setProofMeta({
        capturedAt: capturedAt.toISOString(),
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        accuracy: location?.accuracy ?? null,
        locationObtainedAt: location?.obtainedAt ?? null,
        originalBytes: compressed.originalBytes,
        compressedBytes: compressed.compressedBytes,
        width: compressed.width,
        height: compressed.height,
        mimeType: 'image/jpeg',
      })
      if (!location) {
        toast.error('Foto siap, tetapi lokasi GPS tidak tersedia. Izinkan lokasi dan ambil foto ulang untuk bukti berlokasi.')
      } else {
        const ratio = Math.max(1, Math.round(compressed.originalBytes / Math.max(1, compressed.compressedBytes)))
        toast.success(`Foto dikompres (${ratio}x lebih kecil bila ukuran berkurang) dan lokasi dicatat.`)
      }
    } catch (e) {
      toast.error(e.message || 'Gagal memproses foto.')
      clearProof()
    } finally {
      setBusy(false)
    }
  }

  const run = async (to) => {
    if (to === 'delivered' && (!proof || !proofMeta)) {
      toast.error('Ambil foto bukti menggunakan kamera sebelum menyelesaikan pengiriman.')
      return
    }
    if (to === 'delivered' && (!Number.isFinite(proofMeta.latitude) || !Number.isFinite(proofMeta.longitude))) {
      toast.error('Lokasi GPS belum tersedia. Izinkan akses lokasi dan ambil foto ulang.')
      return
    }
    setBusy(true)
    try {
      if (to === 'delivered') {
        const record = {
          id: `POD-${Date.now()}`,
          shipmentId: shipment.id,
          awb: shipment.trackingNumber,
          driverId: user.driverId ?? user.id,
          driverName: user.name,
          ...proofMeta,
          imageDataUrl: proof,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
        }
        await podService.create(record, proofBlob)
      }
      await shipmentService.updateStatus(shipment.id, to)
      reportService.driverStatus({
        driver: { id: user.driverId ?? user.id, name: user.name },
        shipment: { id: shipment.id, trackingNumber: shipment.trackingNumber },
        status: to,
        position: proofMeta && to === 'delivered'
          ? { lat: proofMeta.latitude, lng: proofMeta.longitude, accuracy: proofMeta.accuracy }
          : position
            ? { lat: position.lat, lng: position.lng, accuracy: position.accuracy }
            : null,
      })
      toast.success(to === 'delivered' ? `Bukti foto dan lokasi tersimpan${mockNote}` : `Status diperbarui${mockNote}`)
      setConfirm(null)
      clearProof()
      onChanged?.()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const ask = (to, title, message) => setConfirm({ to, title, message })
  const needsProof = confirm?.to === 'delivered'

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size={size}
          className="flex-1"
          loading={busy && !confirm}
          onClick={() => (next.confirm ? ask(next.to, 'Bukti serah terima', 'Ambil foto langsung dari kamera dan catat lokasi sebelum menyelesaikan pengiriman.') : run(next.to))}
        >
          {next.label}
        </Button>
        {shipment.status === 'in_transit' && (
          <Button
            variant="secondary"
            size={size}
            onClick={() => ask('delayed', 'Laporkan keterlambatan?', 'Admin dan customer akan melihat status terlambat pada pengiriman ini.')}
          >
            <AlertTriangle className="size-4" /> Laporkan terlambat
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm && !needsProof}
        title={confirm?.title}
        message={confirm?.message}
        loading={busy}
        onConfirm={() => run(confirm.to)}
        onCancel={() => setConfirm(null)}
      />

      {needsProof && (
        <div className="mt-4 rounded-2xl border border-route-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-route-50 p-2 text-route-700"><Camera className="size-5" /></div>
            <div>
              <h3 className="font-semibold text-ink-900">Foto bukti serah terima</h3>
              <p className="mt-1 text-sm text-ink-600">
                Gunakan preview kamera langsung di halaman ini. Foto otomatis dikompres dan diberi watermark waktu serta koordinat jika GPS tersedia.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" loading={busy} onClick={openCamera}>
              <Camera className="size-4" /> {proof ? 'Ambil ulang foto' : 'Buka kamera'}
            </Button>
            <Button type="button" variant="secondary" disabled={busy || !proof} onClick={clearProof}>
              Hapus foto
            </Button>
          </div>

          {cameraOpen && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Kamera bukti serah terima"
            >
              <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b p-4">
                  <div>
                    <h3 className="font-semibold text-ink-900">Kamera bukti serah terima</h3>
                    <p className="text-sm text-ink-600">Posisikan bukti serah terima di dalam bingkai.</p>
                  </div>
                  <button type="button" className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100" onClick={stopCamera} disabled={busy}>
                    Tutup
                  </button>
                </div>
                {cameraError ? (
                  <div className="p-5">
                    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{cameraError}</p>
                    <div className="mt-4 flex justify-end">
                      <Button type="button" onClick={openCamera}>Coba lagi</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-black">
                      <video ref={videoRef} autoPlay playsInline muted className="max-h-[65vh] min-h-48 w-full object-contain" />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 p-4">
                      <Button type="button" variant="secondary" disabled={busy} onClick={stopCamera}>Batal</Button>
                      <Button type="button" loading={busy} onClick={capturePhoto}><Camera className="size-4" /> Ambil foto</Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {proof && (
            <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr]">
              <img src={proof} alt="Pratinjau foto bukti dengan watermark" className="max-h-64 w-full rounded-xl border object-contain" />
              <div className="space-y-2 text-sm text-ink-700">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" /> Foto dikompres dan siap disimpan
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="size-4" />
                  {Number.isFinite(proofMeta?.latitude)
                    ? `${proofMeta.latitude.toFixed(6)}, ${proofMeta.longitude.toFixed(6)} (akurasi ±${Math.round(proofMeta.accuracy || 0)} m)`
                    : 'GPS tidak tersedia'}
                </p>
                <p>Ukuran: {Math.round((proofMeta?.originalBytes || 0) / 1024)} KB → {Math.round((proofMeta?.compressedBytes || 0) / 1024)} KB</p>
                <p>Waktu foto: {new Date(proofMeta.capturedAt).toLocaleString('id-ID')}</p>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <Button variant="secondary" disabled={busy} onClick={() => { setConfirm(null); clearProof() }}>
              Batal
            </Button>
            <Button
              disabled={busy || !proof || !Number.isFinite(proofMeta?.latitude) || !Number.isFinite(proofMeta?.longitude)}
              loading={busy}
              onClick={() => run('delivered')}
            >
              Simpan bukti & selesaikan
            </Button>
          </div>
          <p className="mt-3 text-xs text-ink-500">
            Jika lokasi tidak tersedia, bukti tidak dapat dikirim pada mode ini. Pastikan izin lokasi aktif dan gunakan HTTPS atau localhost.
          </p>
        </div>
      )}
    </div>
  )
}
