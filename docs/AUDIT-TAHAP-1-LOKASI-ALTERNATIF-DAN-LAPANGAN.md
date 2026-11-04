# Audit Tahap 1 — Lokasi Alternatif dan Lokasi Lapangan

Tanggal audit: 3 November 2026 (Asia/Jakarta)

Status: **Lulus sebagai audit arsitektur; implementasi UI dan UAT belum menjadi bagian tahap ini.**

## 1. Catatan kondisi repository

Audit dilakukan terhadap working tree aktual. Working tree sedang memiliki
perubahan pengguna yang belum dikomit. Selain itu, terdapat perubahan backend
additive lokasi alternatif/lapangan yang sudah ada di working tree:

- `backend/internal/models/models.go`
- `backend/internal/handlers/location.go`
- `backend/internal/handlers/attendance.go`
- `backend/internal/handlers/worktype.go`
- `backend/migrations/20261103_alternative_and_field_locations.sql`

Dokumen ini membedakan kemampuan yang sudah ada sebelumnya dari kemampuan
additive tersebut. Audit tidak mengubah kode, template, atau CSS.

## 2. Peta model dan sumber data lokasi

| Konsep | Sumber aktual | Kolom penting | Scope/status | Catatan kompatibilitas |
|---|---|---|---|---|
| Kantor/WFO | `models.OfficeLocation` di `backend/internal/models/models.go:435` | `NamaLokasi`, `Latitude`, `Longitude`, `RadiusMeter`, `Alamat` | Master global; belum memiliki `StatusAktif` | Dipakai oleh check-in melalui `DB.First(&office)` dan endpoint `/attendance/office`. |
| Lokasi rumah/WFH aktif | `models.EmployeeHomeLocation` di `models.go:359` | `EmployeeID`, `LatitudeRumah`, `LongitudeRumah`, `RadiusMeter`, `AlamatRumah` | Satu lokasi aktif per employee | Dipertahankan karena sudah menjadi sumber geofence WFH. |
| Pengajuan perubahan WFH | `models.HomeLocationChangeRequest` di `models.go:381` | old/new address, koordinat, radius, `Status`, `ReviewedBy`, `ReviewedAt`, `RejectionReason` | Status lama: `Menunggu Persetujuan`, `Disetujui`, `Ditolak`, `Dibatalkan` | Tidak diganti dengan status lokasi alternatif. |
| Histori perubahan WFH | `models.EmployeeHomeLocationHistory` di `models.go:406` | employee, request, actor, effective date, old/new coordinates | Histori | Menjadi referensi pola audit histori lokasi WFH. |
| Lokasi alternatif | `models.AlternativeLocation` di `models.go:323` | `UserID`, nama, deskripsi, koordinat, radius, metode, approval, aktif, actor/timestamp | `pending/approved/rejected` + `active/inactive`; soft delete | Model baru terpisah karena ownership berada pada user dan kuota per user. |
| Lokasi lapangan | `models.FieldLocation` di `models.go:345` | nama, deskripsi, koordinat, radius, metode, aktif, `CreatedBy`, `UpdatedBy` | `active/inactive`; soft delete | Master HRD, bukan lokasi milik user. |
| Riwayat absensi | `models.AttendanceRecord` di `models.go:189` | legacy `TipeKerja`, koordinat masuk/pulang, `RadiusTervalidasi` | Histori immutable secara bisnis | Kolom additive menyimpan canonical type, reference ID, dan snapshot lokasi. |
| Audit | `models.AuditLog` di `models.go:425` | `UserID`, `Action`, `TableName`, `RecordID`, `ChangesDetail` | Actor dari user terautentikasi | Dicatat melalui `internal/utils/audit.go:LogAction`. |

### Kesimpulan model

Model lokasi alternatif dan lokasi lapangan memang perlu dipisahkan. `OfficeLocation`
dan `EmployeeHomeLocation` tidak cukup diperluas karena masing-masing memiliki
scope global dan per-employee, sedangkan kebutuhan baru memerlukan scope
per-user dan master HRD. `WorkType` dan `AttendanceRecord` tetap diperluas
secara additive agar data lama tidak dipindahkan atau dihapus.

## 3. Tipe kerja, enum, dan adapter kompatibilitas

### Nilai lama yang ditemukan

- `WorkType.Nama` adalah string unik; seed lama berada di
  `backend/config/database.go`.
- Tipe bawaan lama: `WFO`, `WFH`, dan `Dinas Luar`.
- Mode validasi lama: `kantor`, `rumah`, `tanpa_validasi` melalui
  `RadiusYangBerlaku`, `IsHomeBase`, dan `ButuhValidasiGeofence`.
- UI lama menyimpan/mengirim label `Nama`, bukan enum canonical.
- Frontend masih memakai fallback `WFO`, `WFH`, `Dinas Luar` di
  `frontend/src/app/features/employee/checkin/checkin.component.ts:100`.

### Canonical target

`models.WorkTypeCanonical` di `models.go:251` mendefinisikan:

| Canonical | Label UI | Mapping legacy |
|---|---|---|
| `wfo` | WFO | `Nama = WFO` atau mode `kantor` |
| `wfh` | WFH | `Nama = WFH`, `IsHomeBase`, atau mode `rumah` |
| `alternative_location` | Lokasi Alternatif | tipe baru dengan mode `alternatif` |
| `field_location` | Lokasi Lapangan | tipe baru dengan mode `lapangan` |

`canonicalWorkType` dan `workTypeValidationMode` di
`backend/internal/handlers/worktype.go:70` menjadi adapter kompatibilitas.
`Dinas Luar` tidak diubah massal: tetap memakai mode legacy
`tanpa_validasi`. Ini mencegah perubahan arti histori lama.

## 4. Migration dan startup schema

Migration lama yang relevan:

- `backend/migrations/20260810_employee_profile_fields.sql` — kolom profil dan
  lokasi rumah lama.
- `backend/migrations/20260827_home_location_change_requests.sql` — pengajuan
  dan histori perubahan lokasi WFH.
- `backend/migrations/20261028_work_type_location_validation.sql` — normalisasi
  mode validasi work type tanpa mengubah histori absensi.
- `backend/migrations/20261103_alternative_and_field_locations.sql` — migration
  additive untuk dua tabel baru, kolom canonical/reference work type, dan
  snapshot lokasi pada attendance.

`config.ConnectDB` menjalankan `AutoMigrate` untuk model baru di
`backend/config/database.go:50` dan menjalankan backfill/constraint
idempotent setelahnya. Migration SQL standalone tetap disimpan untuk deployment
yang menjalankan SQL migration di luar API.

### Skema target minimal

- `alternative_locations`: owner, nama, deskripsi, latitude, longitude,
  radius, metode validasi, status approval, status aktif, alasan penolakan,
  approved/rejected by, timestamp, `deleted_at`.
- `field_locations`: nama, deskripsi, latitude, longitude, radius, metode,
  status aktif, created/updated by, timestamp, `deleted_at`.
- `work_types`: `canonical_type`, `field_location_id` additive.
- `attendance_records`: canonical type, alternative/field reference, dan
  snapshot nama/alamat/koordinat/radius.

### Keputusan histori

- Lokasi baru menggunakan soft delete melalui `gorm.DeletedAt`.
- Attendance menyimpan snapshot sehingga histori tetap terbaca walaupun lokasi
  diarsipkan atau detail lokasi berubah.
- Nilai lama `TipeKerja`, koordinat, dan radius tetap dipertahankan.
- Catatan risiko: mekanisme backup di `backend/internal/handlers/settings.go`
  belum memasukkan tabel `alternative_locations` dan `field_locations`; ini
  harus ditambahkan sebelum fitur dianggap siap produksi.

## 5. Alur check-in aktual

### Backend

1. `SetupAttendanceRoutes` di `attendance.go:23` melindungi `/attendance`
   dengan `Protected()` dan role Karyawan, MAGANG, MANAJER.
2. `CheckIn` di `attendance.go:44` memeriksa jadwal, hari libur, duplikasi
   check-in, izin/cuti, selfie, dan tipe kerja.
3. `parseAttendanceLocation` di `location_validation.go:22` memvalidasi angka,
   NaN, rentang latitude/longitude, dan akurasi GPS.
4. `validateCoordinatesAgainstRadius` menggunakan haversine dan allowance
   akurasi maksimal 50 meter.
5. `resolveAttendanceLocation` mempertahankan jalur WFO/WFH/legacy.
6. `resolveAttendanceLocationSelection` di `attendance.go:401` memeriksa ulang
   ownership, approval, aktif, konfigurasi field location, dan geofence untuk
   lokasi baru.
7. Attendance disimpan dan audit penggunaan dibuat melalui `LogAction`.

### Frontend

- Halaman check-in adalah
  `frontend/src/app/features/employee/checkin/checkin.component.*`.
- Peta memakai Leaflet, selector tipe kerja ada di
  `checkin.component.html:44-75`, dan geofence diperbarui melalui
  `updateOfficeGeofence`, `updateMapGeofences`, dan `checkRadius`.
- Service payload berada di `frontend/src/app/core/services/attendance.service.ts:25`.
- Payload lama hanya mengirim `latitude`, `longitude`, `accuracy`, selfie,
  metadata lokasi, dan `tipe_kerja`; belum mengirim
  `alternative_location_id` atau `field_location_id`.
- Frontend belum memuat endpoint daftar lokasi alternatif/lapangan baru.
  Akibatnya backend sudah memiliki guard, tetapi UI belum dapat memilih sumber
  lokasi baru.

## 6. Endpoint aktual dan endpoint target

### Endpoint yang sudah ada sebelum fitur baru

| Route | Role guard | Fungsi |
|---|---|---|
| `POST /api/v1/attendance/checkin` | Karyawan, MAGANG, MANAJER | Check-in |
| `POST /api/v1/attendance/checkout` | Karyawan, MAGANG, MANAJER | Check-out |
| `GET /api/v1/attendance/history` | Karyawan, MAGANG, MANAJER | Histori sendiri |
| `GET /api/v1/attendance/office` | Karyawan, MAGANG, MANAJER | Master kantor |
| `GET /api/v1/worktypes` | Authenticated | Daftar tipe kerja |
| `POST/PUT/DELETE /api/v1/admin/worktypes` | HRD | CRUD tipe kerja |
| `GET/PUT /api/v1/admin/settings/office` | HRD | Master kantor |
| `GET/POST /api/v1/employee/profile/home-location...` | Karyawan, MAGANG, MANAJER | WFH aktif/pengajuan |
| `GET/POST /api/v1/admin/home-location-requests...` | HRD | Review pengajuan WFH |

### Endpoint lokasi yang saat ini sudah didefinisikan additive

| Route | Role | Fungsi |
|---|---|---|
| `GET/POST/PUT/DELETE/PATCH /api/v1/employee/alternative-locations` | Karyawan, MAGANG, MANAJER | CRUD dan toggle lokasi milik sendiri |
| `GET/POST/PUT/DELETE/PATCH /api/v1/employee/profile/alternative-locations` | Karyawan, MAGANG, MANAJER | Alias namespace profil |
| `GET /api/v1/admin/locations/alternative-requests` | HRD | List paginated/filter |
| `GET /api/v1/admin/locations/alternative-requests/:id` | HRD | Detail |
| `POST /api/v1/admin/locations/alternative-requests/:id/approve` | HRD | Approve |
| `POST /api/v1/admin/locations/alternative-requests/:id/reject` | HRD | Reject dengan alasan |
| `GET/POST/PUT/PATCH/DELETE /api/v1/admin/locations/field...` | HRD | Master lokasi lapangan |
| `GET /api/v1/locations/field/active` | Karyawan, MAGANG, MANAJER | Pilihan lokasi lapangan aktif |

Endpoint tersebut berada di `backend/internal/handlers/location.go:20` dan
terdaftar melalui `cmd/api/main.go:87`.

### Endpoint yang masih dibutuhkan untuk penyelesaian produk

- Tidak perlu membuat sumber data lokasi kedua.
- Tambahkan API/service frontend untuk memuat lokasi milik user dan konfigurasi
  field location pada tipe kerja.
- Tambahkan payload ID lokasi pada `AttendanceService.checkIn/checkOut`.
- Tambahkan route/menu UI admin untuk manajemen lokasi.

## 7. Audit permission

| Operasi | Karyawan | MAGANG | MANAJER | HRD/Admin |
|---|---:|---:|---:|---:|
| Check-in/check-out | Ya | Ya | Ya | Tidak melalui route employee |
| Melihat lokasi alternatif sendiri | Ya | Ya | Ya | Bukan scope owner; HRD melihat review |
| Membuat/edit/hapus lokasi alternatif sendiri | Ya | Ya | Ya | Tidak sebagai owner |
| Toggle lokasi alternatif sendiri | Ya, hanya approved | Ya, hanya approved | Ya, hanya approved | Tidak melalui endpoint user |
| Melihat/mengubah lokasi user lain | Tidak | Tidak | Tidak | Ya untuk kebutuhan review |
| Approve/reject lokasi alternatif | Tidak | Tidak | Tidak | Ya |
| CRUD lokasi lapangan | Tidak | Tidak | Tidak | Ya |
| Mengaktifkan/nonaktifkan lokasi lapangan | Tidak | Tidak | Tidak | Ya |
| CRUD work type | Tidak | Tidak | Tidak | Ya |
| Menggunakan lokasi alternatif user lain | Tidak | Tidak | Tidak | Tidak untuk route check-in |

Backend menegakkan matriks melalui `middleware.Protected()` dan
`middleware.RequireRoles()`. Ownership lokasi alternatif diambil dari
`c.Locals("user_id")`, bukan dari body client. Frontend mengakui `ADMIN` sebagai
alias menuju `HRD` di `frontend/src/app/core/auth/role.ts`, tetapi backend
memiliki role bisnis `RoleHRD` dan belum memiliki role `ADMIN` terpisah.

## 8. Komponen UI dan style yang harus dipakai ulang

| Kebutuhan | Referensi reuse | Temuan |
|---|---|---|
| Tabel responsive | `golan-table`, `golan-table-responsive` di profile dan admin management | Sudah memiliki wrapping dan mobile sizing untuk tabel WFH. |
| Pagination | `frontend/src/app/shared/pagination/pagination.component.*` dan pemakaian di `admin-management.component.html` | Reuse, jangan membuat pagination baru. |
| Modal/detail | Modal WFH di `admin-management.component.html:251-264` dan modal work type | Reuse pola overlay, header, body, footer, dan close action. |
| Alert/confirmation | `AlertService` di `core/services/alert.service.ts` | Sudah menyediakan confirm, textarea, success, error. |
| Form control | `.golan-input`, `.form-control`, `.form-group`, `.form-group-row` | Sudah dipakai profile, work type, admin management. |
| Badge/status | `.status-badge`, `.status-hadir`, `.status-alpha`, `home-badge` | Perlu mapping label baru tanpa membuat sistem warna baru. |
| Switch | Cari pola switch existing sebelum Tahap 6; belum ada komponen lokasi khusus | Reuse pola existing bila ditemukan; jangan menambah CSS pada Tahap 1. |
| Map picker | Leaflet di `profile.component.ts` dan map realtime di `checkin.component.ts` | Bisa dipakai untuk koordinat/radius, tetapi perlu keputusan apakah picker bersama atau hanya wrapper service. |
| Admin navigation | `AdminSidebarComponent` hanya membungkus `SharedSidebarComponent` | Menu baru harus ditambahkan pada sumber shared sidebar, bukan membuat sidebar kedua. |
| Work type form | `worktype-list.component.*` dan embedded panel di `admin-settings` | Saat ini hanya radio `kantor/rumah/tanpa_validasi`; perlu diperluas dengan canonical dan field-location selector. |

## 9. Kontrak data dan aturan bisnis yang dikunci

1. Canonical type: `wfo`, `wfh`, `alternative_location`, `field_location`.
2. Approval alternatif: `pending`, `approved`, `rejected`.
3. Usage status: `active`, `inactive`.
4. Nama lokasi wajib; batas yang dipakai mengikuti pola umum lokasi saat ini,
   maksimal 100 karakter.
5. Latitude valid pada `[-90, 90]`, longitude pada `[-180, 180]`, dan titik
   `0,0` diperlakukan sebagai sentinel tidak valid seperti aturan existing.
6. Radius valid pada 1–10.000 meter.
7. Lokasi alternatif baru selalu `pending` dan `inactive`.
8. Lokasi rejected tetap menggunakan satu slot sampai dihapus/diarsipkan; ini
   membuat alasan penolakan tetap dapat dilihat dan diaudit.
9. Kuota lokasi alternatif: maksimal 3 row yang belum soft-deleted per `UserID`.
10. Hanya `approved + active + owner cocok` yang dapat dipakai check-in.
11. Lokasi lapangan harus `active`, belum soft-deleted, dan direferensikan oleh
    work type `field_location` yang dipilih HRD.
12. Histori tidak boleh bergantung pada row lokasi yang masih aktif; snapshot
    lokasi pada attendance menjadi sumber display histori.
13. Perubahan approval, edit, delete/archive, toggle, dan penggunaan lokasi
    dicatat melalui `AuditLog`.

## 10. Risiko dan gap yang harus ditutup pada tahap berikutnya

- UI belum menampilkan lokasi alternatif pada profile.
- UI admin belum memiliki halaman/menu Manajemen Lokasi.
- UI check-in belum memuat atau mengirim lokasi alternatif/lapangan.
- Work type admin belum menyediakan selector canonical dan master field location.
- `AttendanceService` belum mempunyai parameter/reference ID lokasi baru.
- Backup/restore belum mencakup dua tabel lokasi baru.
- Belum ada integration test endpoint untuk ownership lintas user, kuota 3,
  pending/rejected/inactive, serta field-location configuration mismatch.
- Frontend masih menganggap mode validasi hanya tiga nilai legacy.
- `GET /worktypes` terbuka untuk semua authenticated role; data yang diberikan
  harus tetap bebas dari informasi ownership lokasi user.
- Status approval alternatif dan status aktif perlu dipastikan tetap atomik pada
  update bersamaan (approve/edit/toggle).

## 11. Baseline test Tahap 1

| Command | Hasil |
|---|---|
| `cd backend; go test ./...` | Lulus seluruh package |
| `cd frontend; npm test -- --watch=false --browsers=ChromeHeadless` | 201 test dijalankan: 200 lulus, 1 gagal |
| Frontend failure | `WorkReportComponent canonical contract uses canonical review status for labels and edit permission`; assertion gagal di `work-report.component.spec.ts:34` |
| Frontend environment noise | Beberapa request runtime ke `localhost:8080` menghasilkan status 0/403 selama test, tetapi sebagian besar spec tetap lulus |

Test yang relevan untuk audit lokasi:

- `backend/internal/handlers/attendance_test.go`
- `backend/internal/handlers/location_validation_test.go`
- `backend/internal/handlers/home_location_change_test.go`
- `backend/internal/models/location_contract_test.go`
- `backend/internal/middleware/auth_test.go`
- `backend/internal/utils/audit_test.go`
- `frontend/src/app/features/employee/checkin/checkin.component.spec.ts`
- `frontend/src/app/features/employee/profile/profile.component.spec.ts`
- `frontend/src/app/features/admin/worktype-list/worktype-list.component.spec.ts`

## 12. Keputusan implementasi tahap berikutnya

Strategi yang aman adalah **memperluas sumber yang sudah ada dengan adapter**:

- Jangan mengganti `TipeKerja`, `Nama`, `RadiusYangBerlaku`, atau status WFH lama
  secara massal.
- Gunakan `CanonicalType` sebagai kontrak baru dan fallback berdasarkan nama/
  flag lama untuk row legacy.
- Gunakan model terpisah untuk lokasi alternatif dan lokasi lapangan karena
  ownership, lifecycle, dan permission berbeda.
- Gunakan reference ID plus snapshot pada histori, bukan join aktif sebagai satu-
  satunya sumber display.
- Pertahankan endpoint WFH, kantor, WFO/WFH/Dinas Luar, dan data histori lama.
- Prioritas Tahap 2/3 berikutnya: finalisasi migration/backup, validator dan
  test integration, lalu API/UI owner lokasi alternatif.

**Status Tahap 1: Lulus.** Audit file/alur, kontrak target, strategi
kompatibilitas, matriks permission, daftar endpoint/migration, referensi reuse
UI, risiko, dan baseline test sudah terdokumentasi.

