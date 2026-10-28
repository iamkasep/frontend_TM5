# TMS Frontend

Frontend Tracking Management System (React + Vite + Tailwind CSS v4). Berjalan mandiri dengan mock data; siap dihubungkan ke backend lewat `src/services/`.

## Menjalankan

```bash
npm install
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
npm run dev
npm run build            # uji build produksi
```

Login menggunakan username dan password dummy. Role ditentukan dari akun yang berhasil login (bukan dipilih dari dropdown). Kredensial demo:

| Role | Username | Password |
|---|---|---|
| Superadmin | `superadmin` | `TMSdemo123!` |
| Admin | `admin` | `TMSdemo123!` |
| Driver | `driver` | `TMSdemo123!` |
| Customer | `customer` | `TMSdemo123!` |

Ini hanya simulasi frontend; jangan gunakan kredensial ini di produksi.

## Struktur singkat

- `src/app/` — App, router, CSS global
- `src/components/` — `layout/`, `ui/`, `tables/`, `forms/`, `sections/` (per fitur)
- `src/pages/` — `auth/`, `superadmin/`, `admin/`, `driver/`, `customer/`, `shared/` (halaman dipakai bersama lintas role)
- `src/data/mock/` — data dummy
- `src/services/` — pemisah antara UI dan sumber data (mock atau API)
- `src/lib/` — konstanta (menu, status), formatter, util, statistik, geo
- `src/hooks/` — `useAuth`, `useAsync`, `useShipments`

## Mode data

Jika `VITE_API_BASE_URL` **kosong**, semua service memakai mock data yang disimpan di `localStorage`. Data master, trip, AWB, penugasan driver, dan perubahan status dipakai bersama oleh role di browser yang sama dan tetap ada setelah refresh. Perubahan di tab lain memicu pemuatan ulang data di halaman yang mendukung sinkronisasi. Isi `VITE_API_BASE_URL` untuk mengalihkan service operasional ke Axios.

## Asumsi sementara (menunggu tim backend)

Semua poin ini **bukan keputusan final**:

1. Path endpoint ada di satu tempat: `ENDPOINTS` di `src/services/api.js`.
2. Respons API diasumsikan berupa data langsung (bukan dibungkus `{ data }`), dan update memakai `PATCH`.
3. Token autentikasi diasumsikan `Bearer` dari `sessionStorage['tms_token']` (interceptor di `api.js`).
4. Aksi khusus diasumsikan: `POST /shipments/:id/assign` dan `PATCH /shipments/:id/status`.
5. Koordinat kota pada form pengiriman dari daftar kota tetap (`src/lib/geo.js`); backend dapat menggantinya dengan geocoding.
6. Posisi kendaraan di peta pada mode mock dihitung dari progres pengiriman, **bukan GPS nyata**.
7. `authService.login()` memakai akun dummy di `src/services/authService.js`; backend tetap harus menggantinya dengan autentikasi sebenarnya.

## Kebutuhan untuk tim backend

- Autentikasi dan otorisasi: role (superadmin, admin, driver, customer) wajib divalidasi di backend. Pembatasan route/menu di frontend hanya kenyamanan UI.
- Kepemilikan data: customer hanya boleh menerima pengiriman miliknya; driver hanya pengiriman yang ditugaskan kepadanya.
- Resource: pengiriman (beserta riwayat status dengan lat/lng), driver, kendaraan, customer, vendor, admin, notifikasi, audit log.
- Pelaporan lokasi driver (GPS) dan pengambilan posisi terbaru per pengiriman.
- Daftar, pencarian, filter, sorting, dan paginasi saat ini dilakukan di frontend; untuk data besar sebaiknya dipindah ke backend.
- Bentuk objek pengiriman yang dipakai UI: lihat `src/data/mock/shipments.js`.

## Modul operasional tambahan

Frontend mencakup Manajemen Trip (`/admin/trips`) dan detail trip (`/admin/trips/:id`) untuk mengelola rute, vendor, driver, kendaraan, jadwal, AWB terkait, dan status trip. Vendor tetap tersedia sebagai data master, bukan role login. Login memiliki tepat empat role: Superadmin, Admin, Driver, dan Customer.

### Mode data

- Jika `VITE_API_BASE_URL` kosong, aplikasi menggunakan data simulasi yang disimpan bersama di `localStorage`, termasuk master data, shipment/AWB, trip, dan status tracking.
- Jika `VITE_API_BASE_URL` diisi, layanan trip menggunakan endpoint API yang didefinisikan di `src/services/api.js`. Path dan bentuk payload trip/event saat ini adalah asumsi frontend dan wajib dicocokkan dengan kontrak backend sebelum dipakai di lingkungan nyata.
- Login username/password pada halaman login hanya validasi akun dummy di frontend, bukan keamanan produksi. Semua pemeriksaan tenant, kepemilikan data, dan otorisasi harus ditegakkan backend.
- Halaman Driver dapat membaca GPS perangkat saat izin diberikan, tetapi koordinat belum dikirim ke server. Posisi lintas perangkat membutuhkan API/backend. Upload POD dan integrasi SMS/WhatsApp belum diklaim aktif.

### Pemetaan model Excel

- `dm_vendors`: master vendor.
- `dm_vehicles`: master kendaraan termasuk kapasitas kg dan m³.
- `dm_drivers`: master driver dan vendor terkait.
- `dt_trips`: Manajemen Trip.
- `dt_trip_shipments`: daftar AWB di detail trip.
- `dt_tracking_events`: riwayat event trip, sumber, koordinat, waktu, catatan, dan referensi AWB/POD.

Sheet AWB, POD, dan struktur tenant/perusahaan tidak dijelaskan lengkap di workbook yang diberikan; nama endpoint dan field API perlu dikonfirmasi dengan backend.

## Peta (basemap OpenFreeMap) dan deployment cPanel

Peta memakai Leaflet + tile vektor **OpenFreeMap** (data OpenStreetMap) lewat MapLibre GL (`src/components/sections/tracking/BaseMapLayer.jsx`, konfigurasi di `src/lib/mapConfig.js`).

- Tanpa API key dan tanpa server Node.js. Menurut situs resminya, layanan publik OpenFreeMap tanpa batas request dan boleh dipakai komersial, tetapi bersifat "as-is" tanpa SLA (https://openfreemap.org/tos/).
- Gaya peta bisa diganti lewat `VITE_MAP_STYLE` (liberty, bright, positron, dark, fiord).
- Cadangan otomatis: jika WebGL tidak tersedia atau style gagal dimuat, peta memakai tile raster resmi OpenStreetMap (best-effort, wajib mengirim Referer; lihat https://operations.osmfoundation.org/policies/tiles/ ).
- Atribusi "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" wajib tetap tampil di peta.

Deployment cPanel:
1. `npm install` (ada dependency baru: `maplibre-gl`, `@maplibre/maplibre-gl-leaflet`), lalu `npm run build`.
2. Unggah **isi** folder `dist` (termasuk `.htaccess`, file tersembunyi; aktifkan Show Hidden Files) ke document root `tms.wmshil.com`. `.htaccess` membuat buka langsung/refresh di `/admin/tracking` tidak 404.
3. Buka situs, periksa peta dan tab Network (permintaan ke `tiles.openfreemap.org` harus 200).

## Catatan revisi TMS SCM (frontend demo)
- Navigasi admin dipisah menjadi Data Master dan Data Transaction.
- Manajemen Koordinat memakai data dummy persisten dan menonaktifkan lokasi tanpa menghapus riwayat.
- Vendor memiliki tipe internal/external dan contoh vendor internal HIL.
- Trip memakai lokasi master aktif, dapat menghubungkan banyak AWB, dan trip eksternal boleh tanpa driver/kendaraan.
- Detail trip menyediakan input posisi aktual manual dengan sumber, waktu posisi diperoleh, waktu input, dan nama penginput.
- Shipment boleh dibuat tanpa trip agar alur tidak melingkar; AWB dapat dihubungkan kemudian ke beberapa trip.
- Seluruh fitur ini masih simulasi frontend/localStorage. Integrasi validasi backend, database, GPS/SMS otomatis, dan audit yang aman harus diterapkan oleh backend.
