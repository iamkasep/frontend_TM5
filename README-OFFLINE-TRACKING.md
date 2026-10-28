# Catatan fitur offline tracking (mode frontend/dummy)

## Perubahan
- GPS menyimpan koordinat terakhir ke localStorage.
- Saat browser memicu event `offline`, aplikasi menyimpan lokasi terakhir ke antrean lokal dan membuat event notifikasi untuk role `admin` dan `superadmin` di browser ini.
- Saat event `online` terjadi, antrean lokal ditandai diproses dalam mode simulasi dan dibuat notifikasi koneksi pulih.
- Driver dapat membuat laporan kendala perjalanan dari halaman Navigasi dan Tracking.
- Halaman Notifikasi memuat ulang ketika event lokal baru dibuat.
- SMS tetap tersedia sebagai fallback manual.

## Batasan penting
Backend belum tersedia. Dengan demikian, data localStorage hanya ada pada profil browser/perangkat yang sama; admin di perangkat berbeda TIDAK akan menerima notifikasi atau koordinat. Teks "tersinkron" pada mode demo hanya simulasi lokal, bukan konfirmasi server. Browser juga tidak dapat mengirim SMS atau data internet ketika offline tanpa jalur komunikasi lain. Pengiriman otomatis lintas perangkat memerlukan backend/API, penyimpanan server, dan mekanisme push/polling. Jika harus mengirim saat internet mati, perlu kanal alternatif seperti perangkat/gateway SMS atau radio yang sesuai. GPS/browser tidak dijamin terus berjalan bila tab ditutup atau sistem menghentikan proses.

## File yang diubah
- `src/services/driverIncidentService.js` (baru): penyimpanan posisi, antrean offline, dan event kendala lokal.
- `src/hooks/useGps.jsx`: catat posisi GPS dan tangani event offline/online.
- `src/services/systemService.js`: gabungkan event driver dengan notifikasi dummy.
- `src/hooks/useAsync.js`: refresh data ketika event notifikasi lokal berubah.
- `src/pages/driver/Navigation.jsx`: formulir laporan kendala.
