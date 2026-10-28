# Panduan Integrasi Backend Laravel × TMS Frontend

Dokumen ini adalah panduan teknis lengkap bagi tim **Backend Laravel** untuk mengintegrasikan API dengan **TMS Frontend**. Seluruh konfigurasi komunikasi API di sisi frontend terpusat di [`src/services/api.js`](src/services/api.js).

---

## 1. Langkah Cepat Menyambungkan Frontend ke Laravel (Quick Start)

### A. Di sisi Frontend (`tms-frontend/.env`)
Salin `.env.example` menjadi `.env`, lalu isi konfigurasi berikut:

```ini
# Opsi 1 (Rekomendasi saat coding lokal): Lewat Vite Dev Proxy (Bebas masalah CORS)
VITE_API_BASE_URL=/api
VITE_DEV_PROXY_TARGET=http://127.0.0.1:8000/api

# Opsi 2 (Langsung tembak URL Laravel / Produksi):
# VITE_API_BASE_URL=http://127.0.0.1:8000/api

# Konvensi nama field JSON dari Laravel:
# - Isi 'snake' jika Laravel mengirim snake_case bawaan database (customer_id, weight_kg)
# - Isi 'camel' jika Laravel Resource sudah mengirim camelCase (customerId, weightKg)
VITE_API_CASE=snake
```
> **Catatan Penting:** Begitu `VITE_API_BASE_URL` diisi (tidak kosong), seluruh mock data (`localStorage`) di frontend **otomatis mati** (`USE_MOCK = false`) dan semua menu langsung memanggil endpoint Laravel.

### B. Di sisi Backend Laravel (`config/cors.php`)
Jika frontend mengakses URL Laravel secara langsung (bukan lewat proxy), pastikan `config/cors.php` mengizinkan origin frontend:

```php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['http://localhost:5173', 'https://tms.wmshil.com'],
    'allowed_headers' => ['*'],
    'supports_credentials' => false, // Menggunakan Bearer Token
];
```

---

## 2. Aturan Umum API (Kompatibilitas Otomatis)

Frontend sudah disiapkan agar mengikuti standar bawaan Laravel tanpa perlu mengubah kode UI:

1. **Header Otomatis:** Setiap request dari frontend sudah mengirim:
   - `Accept: application/json` (Laravel otomatis merespons JSON untuk error `401` dan `422`, tidak me-redirect ke view login).
   - `X-Requested-With: XMLHttpRequest`
   - `Authorization: Bearer <token>` (menggunakan **Laravel Sanctum Personal Access Token** `$user->createToken('tms')->plainTextToken`).
2. **Pembungkus `JsonResource` & Pagination:**
   - Bawaan `JsonResource` Laravel (`{ "data": { ... } }`) maupun `->paginate()` (`{ "data": [...], "meta": {...}, "links": {...} }`) **otomatis dibuka (unwrap)** oleh interceptor di [`src/services/api.js`](src/services/api.js).
   - Mengembalikan `response()->json($data)` secara langsung tanpa wrapper `data` juga **tetap didukung**.
3. **Penamaan Field (`snake_case` vs `camelCase`):**
   - Jika `.env` frontend diset `VITE_API_CASE=snake`, frontend **otomatis mengubah** request body & query dari `camelCase` ke `snake_case`, serta mengubah response & key error `422` dari `snake_case` kembali ke `camelCase`.
   - Artinya, di Laravel Anda bebas memakai nama kolom standar seperti `customer_id`, `driver_id`, `weight_kg`, `planned_departure`, dll.

---

## 3. Standar Error Handling HTTP

| Kode HTTP | Kapan Dikirim oleh Laravel | Contoh Respons Laravel | Perilaku Otomatis di Frontend |
|---|---|---|---|
| **401** | Token tidak valid / kedaluwarsa / salah password saat login | `{ "message": "Unauthenticated." }` | Menghapus token dari `sessionStorage` dan mengarahkan user kembali ke `/login` dengan notifikasi sesi berakhir. |
| **403** | Role user tidak berhak mengakses resource | `{ "message": "Anda tidak memiliki akses." }` | Menampilkan pesan error ke user. |
| **404** | Data / nomor AWB tidak ditemukan | `{ "message": "Data tidak ditemukan." }` | Menampilkan state tidak ditemukan. |
| **422** | Validasi `FormRequest` / `$request->validate()` gagal | `{ "message": "Data tidak valid.", "errors": { "customer_id": ["Customer wajib dipilih."] } }` | Pesan pertama tiap field otomatis dipasang ke `err.fieldErrors` dan tampil di bawah input form terkait. |
| **500** | Exception server | `{ "message": "Server Error" }` | Menampilkan toast error server. |

---

## 4. Template `routes/api.php` untuk Laravel

Berikut adalah definisi route Laravel yang 100% cocok dengan `ENDPOINTS` di [`src/services/api.js`](src/services/api.js):

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\{
    AuthController,
    CompanyController,
    AdminController,
    CustomerController,
    VendorController,
    DriverController,
    VehicleController,
    LocationController,
    ShipmentController,
    TripController,
    TrackingEventController,
    PodController,
    DriverLocationController,
    DriverReportController,
    NotificationController,
    AuditLogController
};

// 1. Endpoint Publik / Login
Route::post('/auth/login', [AuthController::class, 'login']);

// 2. Endpoint Terproteksi Token Sanctum
Route::middleware('auth:sanctum')->group(function () {
    // Auth & Profil
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::patch('/auth/profile', [AuthController::class, 'updateProfile']);

    // Data Master (CRUD Standar: index, show, store, update, destroy)
    Route::apiResource('companies', CompanyController::class);
    Route::apiResource('admins', AdminController::class);
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('vendors', VendorController::class);
    Route::apiResource('drivers', DriverController::class);
    Route::apiResource('vehicles', VehicleController::class);
    Route::apiResource('locations', LocationController::class);

    // Pengiriman / AWB (Shipments)
    Route::get('/shipments/track/{awb}', [ShipmentController::class, 'trackByAwb']);
    Route::post('/shipments/{shipment}/assign', [ShipmentController::class, 'assignDriver']);
    Route::patch('/shipments/{shipment}/status', [ShipmentController::class, 'updateStatus']);
    Route::get('/shipments/{shipment}/locations', [ShipmentController::class, 'locationHistory']);
    Route::apiResource('shipments', ShipmentController::class);

    // Manajemen Trip & Tracking Event
    Route::post('/trips/{trip}/shipments', [TripController::class, 'assignShipment']);
    Route::delete('/trips/{trip}/shipments/{shipment}', [TripController::class, 'removeShipment']);
    Route::patch('/trips/{trip}/status', [TripController::class, 'updateStatus']);
    Route::apiResource('trips', TripController::class);
    Route::apiResource('tracking-events', TrackingEventController::class)->only(['index', 'store']);

    // Proof of Delivery (POD)
    Route::apiResource('pods', PodController::class)->only(['index', 'store']);

    // GPS Driver & Laporan Offline / SMS
    Route::post('/driver-locations', [DriverLocationController::class, 'store']);
    Route::post('/driver-locations/batch', [DriverLocationController::class, 'storeBatch']);
    Route::post('/driver-reports', [DriverReportController::class, 'store']);
    Route::post('/driver-reports/sms', [DriverReportController::class, 'importSms']);

    // Notifikasi & Audit Log
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{notification}', [NotificationController::class, 'update']);
    Route::get('/audit-logs', [AuditLogController::class, 'index']);
});
```

---

## 5. Spesifikasi Payload & Struktur Data per Modul

> **Catatan Konvensi:** Contoh JSON di bawah ditulis dalam `camelCase`. Jika Anda menyetel `VITE_API_CASE=snake` di `.env`, Anda cukup mengirim dan menerima versi `snake_case`-nya (mis. `customer_id`, `tracking_number`, `weight_kg`).

### 5.1 Autentikasi (`/auth`)

- **`POST /auth/login`**
  - **Request:** `{ "username": "admin", "password": "secret" }`
  - **Response `200`:**
    ```json
    {
      "token": "1|laravel_sanctum_plain_text_token",
      "user": {
        "id": "USR-AD",
        "name": "Rina Kusuma",
        "email": "rina@tms.example",
        "phone": "081100000101",
        "role": "admin",
        "customerId": null,
        "driverId": null,
        "company": "PT Harrasima Inventory Logistic"
      }
    }
    ```
  - **Wajib:** Nilai `user.role` harus salah satu dari: `'superadmin'`, `'admin'`, `'driver'`, atau `'customer'`.
  - Jika `role === 'customer'`, sertakan `customerId`. Jika `role === 'driver'`, sertakan `driverId`.
- **`GET /auth/me`** → Mengembalikan objek `user` yang sama seperti di atas.
- **`PATCH /auth/profile`** → Menerima `{ "name": "...", "phone": "..." }`, mengembalikan objek `user` terbaru.

---

### 5.2 Data Master

| Endpoint | Field Objek yang Dipakai UI | Nilai `status` yang Valid |
|---|---|---|
| `/companies` | `id, name, code, domain, contactPerson, email, phone, plan, status` | `'active' \| 'inactive'` |
| `/admins` | `id, name, email, phone, status` | `'active' \| 'inactive'` |
| `/customers` | `id, name, contactPerson, email, phone, city, status` | `'active' \| 'inactive'` |
| `/vendors` | `id, vendorCode, name, type ('internal' \| 'external'), contactPerson, phone, email, npwp, address, city, province, postalCode, status` | `'active' \| 'inactive'` |
| `/drivers` | `id, driverCode, name, phone, licenseNumber, vendorId, vendorName, vehicleId, vehiclePlate, status` | `'available' \| 'on_duty' \| 'off'` |
| `/vehicles` | `id, plate, type ('Pickup' \| 'Truk Engkel' \| 'CDD' \| 'Fuso' \| 'Wingbox'), capacityKg, capacityM3, vendorId, vendorName, status` | `'available' \| 'in_use' \| 'maintenance'` |
| `/locations` | `id, code, name, type ('warehouse' \| 'airport' \| 'customer_site' \| 'port' \| 'other'), address, latitude, longitude, status` | `'active' \| 'inactive'` *(Saat dihapus di UI, frontend mengirim `PATCH /locations/{id}` dengan `{ "status": "inactive" }`)* |

---

### 5.3 Pengiriman / AWB (`/shipments`)

**Aturan Otorisasi di Backend:**
- `superadmin` & `admin`: melihat seluruh pengiriman.
- `customer`: hanya melihat pengiriman dengan `customer_id = $user->customer_id`.
- `driver`: hanya melihat pengiriman dengan `driver_id = $user->driver_id`.

** Struktur Objek Shipment (`GET /shipments` & `GET /shipments/{id}`):**
```json
{
  "id": "SHP-001",
  "trackingNumber": "TMS-20261028-001",
  "customerId": "CUS-001",
  "customerName": "PT Maju Sejahtera",
  "originLocationId": "LOC-001",
  "destinationLocationId": "LOC-003",
  "tripId": "TRP-001",
  "tripIds": ["TRP-001"],
  "tripCode": "TRIP-20261028-001",
  "driverId": "DRV-001",
  "driverName": "Budi Santoso",
  "vehicleId": "VHC-001",
  "vehiclePlate": "D 1234 HIL",
  "origin": { "city": "Bandung", "name": "Gudang Bandung", "lat": -6.9147, "lng": 107.6098 },
  "destination": { "city": "Jakarta", "name": "Lokasi Customer Jakarta", "lat": -6.2088, "lng": 106.8456 },
  "weightKg": 250,
  "status": "in_transit",
  "progress": 0.45,
  "notes": "Barang pecah belah",
  "createdAt": "2026-10-28T08:00:00.000Z",
  "eta": "2026-10-29T15:00:00.000Z",
  "etaSource": "trip_schedule",
  "currentPosition": { "lat": -6.55, "lng": 107.22 },
  "history": [
    {
      "status": "pending",
      "at": "2026-10-28T08:00:00.000Z",
      "location": "Bandung",
      "note": "Pesanan dibuat",
      "lat": -6.9147,
      "lng": 107.6098,
      "source": null
    }
  ]
}
```
- **Nilai `status` Shipment yang valid:** `'pending'`, `'assigned'`, `'picked_up'`, `'in_transit'`, `'delivered'`, `'delayed'`, `'cancelled'`.
- **Aksi Khusus:**
  - `POST /shipments/{id}/assign` → Body: `{ "driverId": "DRV-001" }` → Mengubah status ke `'assigned'`, mengisi `driverId`, `driverName`, `vehicleId`, `vehiclePlate`, dan menambah item `history`.
  - `PATCH /shipments/{id}/status` → Body: `{ "status": "in_transit", "note": "..." }` → Mengubah status dan menambah item `history` (serta membuat notifikasi untuk admin bila diupdate oleh driver).
  - `GET /shipments/track/{awb}` → Mengembalikan 1 objek shipment berdasarkan `trackingNumber` (atau `404` bila tidak ditemukan).
  - `GET /shipments/{id}/locations` → Mengembalikan array titik koordinat perjalanan: `[{ "lat": -6.9147, "lng": 107.6098, "at": "..." }]`.

---

### 5.4 Manajemen Trip & Tracking Event (`/trips` & `/tracking-events`)

**Struktur Objek Trip (`GET /trips` & `GET /trips/{id}`):**
```json
{
  "id": "TRP-001",
  "tripCode": "TRIP-20261028-001",
  "vendorId": "VND-001",
  "driverId": "DRV-001",
  "driverName": "Budi Santoso",
  "vehicleId": "VHC-001",
  "vehiclePlate": "D 1234 HIL",
  "originLocationId": "LOC-001",
  "destinationLocationId": "LOC-002",
  "origin": "Gudang Bandung",
  "destination": "Bandara Soekarno-Hatta",
  "originLat": -6.9147,
  "originLng": 107.6098,
  "destinationLat": -6.1256,
  "destinationLng": 106.6559,
  "plannedDeparture": "2026-10-28T09:00:00.000Z",
  "plannedArrival": "2026-10-28T16:00:00.000Z",
  "actualDeparture": null,
  "actualArrival": null,
  "status": "planned",
  "notes": "",
  "shipmentIds": ["SHP-001", "SHP-002"]
}
```
- **Nilai `status` Trip yang valid:** `'planned'`, `'loading'`, `'in_progress'`, `'completed'`, `'cancelled'`.
- **Relasi Trip ↔ AWB:**
  - `POST /trips/{id}/shipments` dengan body `{ "awbId": "SHP-001" }` menghubungkan shipment ke trip (dan bila trip punya driver sementara shipment masih `pending`, otomatis tugaskan driver tersebut ke shipment).
  - `DELETE /trips/{id}/shipments/{shipmentId}` melepas shipment dari trip.
- **Tracking Events (`GET /tracking-events?trip_id=TRP-001` & `POST /tracking-events`):**
  ```json
  {
    "id": "EVT-001",
    "tripId": "TRP-001",
    "eventType": "position_update",
    "source": "sms",
    "latitude": -6.5512,
    "longitude": 107.2198,
    "positionObtainedAt": "2026-10-28T11:30:00.000Z",
    "enteredAt": "2026-10-28T11:35:00.000Z",
    "enteredBy": "Rina Kusuma",
    "remarks": "Posisi terakhir dari SMS operator kargo",
    "podId": null
  }
  ```

---

### 5.5 Bukti Serah Terima / Proof of Delivery (`/pods`)

Saat driver menyelesaikan pengiriman (`delivered`), frontend otomatis mengompres foto menjadi JPEG, memberi watermark waktu & koordinat GPS, lalu mengirimkannya ke **`POST /pods`** sebagai `multipart/form-data`:

- **File upload:** `$request->file('photo')` (JPEG hasil kompresi + watermark).
- **Field form lainnya:** `shipmentId`, `awb`, `driverId`, `driverName`, `capturedAt`, `latitude`, `longitude`, `accuracy`, `locationObtainedAt`, `originalBytes`, `compressedBytes`, `width`, `height`, `mimeType`.
- **Response `GET /pods` & `POST /pods`:**
  ```json
  {
    "id": "POD-001",
    "shipmentId": "SHP-001",
    "awb": "TMS-20261028-001",
    "driverId": "DRV-001",
    "driverName": "Budi Santoso",
    "imageUrl": "https://api.tms.wmshil.com/storage/pods/pod-001.jpg",
    "latitude": -6.2088,
    "longitude": 106.8456,
    "accuracy": 12,
    "capturedAt": "2026-10-28T14:20:00.000Z",
    "submittedAt": "2026-10-28T14:20:05.000Z",
    "originalBytes": 1450000,
    "compressedBytes": 185000,
    "status": "submitted"
  }
  ```
  *(Frontend menerima `imageUrl`, `photoUrl`, ataupun `imageDataUrl`).*

---

### 5.6 Lokasi GPS Driver, Laporan Offline, Notifikasi, & Audit Log

1. **Lokasi GPS Driver (`/driver-locations`):**
   - `POST /driver-locations`: menerima `{ "lat": -6.91, "lng": 107.61, "accuracy": 10, "heading": 90, "speed": 12, "driverName": "Budi Santoso", "recordedAt": "..." }`. Sudah di-throttle di frontend (maksimal sekali tiap 15 detik atau perpindahan ≥ 25 meter).
   - `POST /driver-locations/batch`: menerima `{ "locations": [ ... ] }` saat driver kembali online setelah melewati area sinyal mati.
2. **Laporan Driver & Impor SMS (`/driver-reports`):**
   - `POST /driver-reports`: menerima laporan otomatis perangkat driver dengan discriminator field `type`:
     - `type = 'offline_position'` (`clientId`, `driver`, `shipment`, `position`, `capturedAt`, `startedAt`)
     - `type = 'connection_restored'` (`clientId`, `driver`, `shipment`, `startedAt`, `restoredAt`, `hadPosition`)
     - `type = 'gps_issue'` (`driver`, `shipment`, `title`, `message`, `at`)
   - `POST /driver-reports/sms`: menerima `{ "text": "TMS|TMS-20261028-001|-6.55120,107.21980|15m|2026-10-28T11:30:00Z" }`.
3. **Notifikasi (`/notifications`):**
   - Objek notifikasi: `{ "id": "NTF-001", "type": "driver_status | driver_offline | connection_restored | gps_issue | sms_report", "title": "...", "message": "...", "at": "...", "read": false, "applied": false, "shipment": { "id": "SHP-001", "trackingNumber": "..." }, "driver": { "id": "DRV-001", "name": "..." }, "position": { "lat": -6.5, "lng": 107.2, "accuracy": 12 } }`.
   - `GET /notifications/unread-count` → `{ "count": 3 }`.
   - `PATCH /notifications/{id}` → menerima `{ "read": true }` atau `{ "applied": true, "appliedAt": "..." }`.
   - `POST /notifications/read-all` → menandai seluruh notifikasi user saat ini sebagai telah dibaca.
4. **Audit Log (`GET /audit-logs`):**
   - Mengembalikan array: `[{ "id": "AUD-001", "at": "2026-10-28T08:00:00.000Z", "actor": "Rina Kusuma", "role": "admin", "action": "Membuat pengiriman TMS-20261028-001", "target": "SHP-001" }]`.

---

## 6. Checklist Pengujian Saat Backend Siap Disambungkan

1. Isi `VITE_API_BASE_URL` dan `VITE_API_CASE` di `.env`, lalu jalankan `npm run dev`.
2. **Uji Login:** Login memakai akun dari database Laravel → pastikan response berisi `token` & `user.role`, lalu diarahkan ke dashboard role terkait.
3. **Uji Refresh Halaman:** Tekan `F5` → frontend akan memanggil `GET /auth/me` dengan header `Authorization: Bearer <token>` dan sesi tetap terjaga.
4. **Uji Validasi 422:** Kirim form kosong/duplikat → pastikan pesan validasi Laravel muncul di bawah input field.
5. **Uji Sesi Berakhir (401):** Hapus token di tabel `personal_access_tokens` Laravel → klik menu apa saja → frontend otomatis logout dan kembali ke halaman `/login`.
