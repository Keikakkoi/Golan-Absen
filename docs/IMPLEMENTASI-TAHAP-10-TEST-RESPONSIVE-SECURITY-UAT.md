# Implementasi Tahap 10 — Test, Responsive, Security, dan UAT

Tanggal verifikasi: **2026-11-03 10:40 WIB**.

## Hasil otomatis

| Area | Perintah/bukti | Hasil aktual |
|---|---|---|
| Backend | `cd backend; go test ./... -count=1` | **Lulus** seluruh package, termasuk `handlers`, `middleware`, `models`, `services`, dan utility terkait. |
| Backend static check | `cd backend; go vet ./...` | **Lulus**. |
| Frontend fokus lokasi/check-in/riwayat | `npx ng test --no-watch --no-progress --browsers=ChromeHeadless` dengan suite attendance display, service, check-in, profile, history, statistics, location management, work type, admin reports, dan team attendance | **56 SUCCESS**. |
| Frontend build/type-check | `npm run build` | **Lulus**. Build hanya menghasilkan warning budget stylesheet dan CommonJS yang sudah ada; bukan error kompilasi. |
| Formatter backend | `gofmt` pada file backend yang disentuh | **Bersih**. Tiga file backend lain masih terdeteksi sebagai format lama dan tidak diubah karena berada di luar scope fitur. |
| Repository diff | `git diff --check` | **Lulus**; hanya warning line-ending LF/CRLF dari Git. |

Suite frontend penuh menghasilkan **218 test lulus dan 1 gagal**. Kegagalan berada
di `work-report.component.spec.ts` pada fixture laporan kerja rejected yang tidak
memiliki `rejected_at`; ini bukan alur lokasi/check-in dan tidak memengaruhi suite
fokus lokasi. Log error pada beberapa test lain adalah simulasi branch error yang
memang diharapkan oleh test, bukan kegagalan assertion.

## Matriks keamanan dan kontrak yang terverifikasi

| Skenario | Route/komponen | Expected | Aktual |
|---|---|---|---|
| Karyawan, MAGANG, MANAJER membuat lokasi | `POST /api/v1/employee/alternative-locations` | HTTP 201; owner dari session; status awal `pending` | Lulus pada middleware role matrix dan kontrak create. |
| Lokasi keempat | endpoint create lokasi alternatif | Ditolak backend karena kuota tiga | Lulus pada handler test. |
| Pending, rejected, atau approved-inactive dipakai check-in | resolver lokasi alternatif | Ditolak | Lulus pada selection test. |
| Ownership mismatch | detail/update/delete/toggle lokasi alternatif | Tidak boleh membaca atau mengubah resource user lain | Lulus; query dibatasi owner dari session. |
| Approval/rejection admin | endpoint keputusan pengajuan lokasi alternatif | Hanya HRD; actor, alasan penolakan, dan timestamp disimpan | Lulus pada handler test. |
| Keputusan ulang yang tidak valid | endpoint approval/rejection | Ditolak dengan conflict | Lulus pada handler test. |
| Non-admin mengelola lokasi lapangan | route admin Manajemen Lokasi | Ditolak backend | Lulus pada role guard test. |
| Lokasi lapangan tidak dikonfigurasi atau inactive | resolver field location | Tidak tersedia untuk check-in baru | Lulus pada selection test. |
| Lokasi di luar radius | validasi geofence | Check-in ditolak | Lulus pada selection test. |
| Histori lokasi yang inactive/terarsip | attendance presentation | Snapshot histori tetap terbaca | Lulus pada presentation test. |
| Pagination/filter admin | admin location handler dan component | Metadata total/page/limit; filter aman; reload setelah aksi | Lulus pada backend dan frontend fokus test. |

Bukti utama tersedia pada [location_api_test.go](../backend/internal/handlers/location_api_test.go),
[attendance_location_selection_test.go](../backend/internal/handlers/attendance_location_selection_test.go),
[attendance_presentation_test.go](../backend/internal/handlers/attendance_presentation_test.go),
dan [location_contract_test.go](../backend/internal/models/location_contract_test.go).

## Responsive check

Static responsive checks lulus untuk:

- tabel lokasi alternatif profil dengan horizontal scroll;
- tabel Manajemen Lokasi admin dengan horizontal scroll;
- tabel attendance manager dan histori dengan pola mobile existing;
- breakpoint mobile halaman admin lokasi, profil, dan histori.

Pemeriksaan ini tidak menggantikan browser UAT pada viewport desktop/mobile.
Tidak ada CSS system, library UI, atau pola tabel baru yang ditambahkan hanya
untuk verifikasi ini.

## UAT resmi — BLOCKED

UAT belum dapat dinyatakan lulus. Pada waktu verifikasi tidak tersedia akun
resmi Karyawan, MAGANG, MANAJER, dan HRD/Admin, serta frontend/backend tidak
sedang listen pada port aplikasi yang diperlukan. Karena itu tidak ada bukti
browser, screenshot, atau console log dari sesi UAT nyata.

Rute yang harus dijalankan saat environment tersedia:

| Role | Route | Data uji | Expected |
|---|---|---|---|
| Karyawan, MAGANG, MANAJER | `/employee/profile` | Buat/edit/toggle/hapus lokasi sendiri; uji lokasi keempat | Status pending, kuota benar, ownership aman, error backend tampil. |
| Karyawan, MAGANG, MANAJER | `/employee/checkin` | Pending, rejected, approved-inactive, approved-active; koordinat dalam/luar radius | Hanya lokasi approved-active yang valid dapat dipakai. |
| HRD/Admin | `/admin/locations` | Approve/reject dengan alasan; tambah/edit/toggle/arsip lokasi lapangan | Pagination, audit actor/waktu, dan status user ikut berubah. |
| Role non-admin | `/admin/locations` | Akses langsung URL dan request API | Route/API menolak akses. |

Blocker UAT: jalankan service aplikasi dan sediakan kredensial akun uji resmi.
Setelah itu ulangi seluruh matriks di atas pada desktop dan mobile, catat waktu,
route, role, payload/data uji, hasil aktual, expected result, serta screenshot
dan console log.

## Status kriteria

Test otomatis, validasi ownership/security backend, focused frontend test,
build/type-check, dan responsive static check telah diverifikasi. **Kriteria
Tahap 10 belum dapat ditutup penuh karena UAT resmi masih BLOCKED dan suite
frontend penuh memiliki satu kegagalan fixture work-report yang tidak terkait
fitur lokasi.**
