# Implementasi Tahap 9 — Label, Detail, Riwayat, Dashboard, dan Export

## Mapping canonical bersama

Formatter backend dan frontend memakai mapping yang sama:

| Canonical | Label |
| --- | --- |
| `wfo` | WFO |
| `wfh` | WFH |
| `alternative_location` | Lokasi Alternatif |
| `field_location` | Lokasi Lapangan |

Nilai legacy seperti `Dinas Luar` dan `Remote` tidak dipaksa menjadi WFO.
Nilai tersebut tetap ditampilkan sebagai label legacy agar laporan lama tidak
berubah makna. Nilai `TipeKerja` mentah juga tetap dipertahankan di API.

## Konsumen yang diperbarui

- Riwayat pribadi menampilkan label tipe kerja canonical, nama lokasi, alamat,
  koordinat, serta snapshot histori lokasi pada detail.
- Statistik karyawan dan magang memisahkan WFO, WFH, Lokasi Alternatif, dan
  Lokasi Lapangan. Counter legacy tetap tersedia untuk data lama.
- Rekap admin menampilkan tipe, nama lokasi, alamat, dan koordinat pada tabel,
  detail, CSV, Excel, PDF, print, dan JSON.
- Absensi tim manager mengirim dan menampilkan tipe/lokasi sesuai scope tim,
  termasuk pada seluruh export.
- Detail laporan keterlambatan menggunakan formatter yang sama.

## Kontrak backend dan batas akses

`AttendanceRecord` mendapat field presentasi read-only:

- `tipe_kerja_label`;
- `location_name`, `location_address`, `location_latitude`,
  `location_longitude`.

Field tersebut didekorasi dari `TipeKerjaCanonical` dan snapshot lokasi yang
tersimpan pada attendance. Jika snapshot belum ada pada histori lama, koordinat
check-in lama menjadi fallback. Tidak ada query daftar lokasi alternatif pada
endpoint histori; karyawan, MAGANG, dan MANAJER hanya menerima record dalam
scope masing-masing. Admin menerima record yang memang sudah berada dalam scope
laporan admin.

Lokasi master yang sudah inactive/deleted tetap dapat ditampilkan pada histori
karena nama, alamat, koordinat, dan radius dicatat sebagai snapshot saat
check-in.

## File utama

- `backend/internal/handlers/attendance_presentation.go`
- `backend/internal/handlers/attendance.go`
- `backend/internal/handlers/report.go`
- `backend/internal/handlers/manager.go`
- `backend/internal/handlers/internship.go`
- `frontend/src/app/core/utils/attendance-display.ts`
- `frontend/src/app/features/employee/history/history.component.*`
- `frontend/src/app/features/admin/admin-reports/admin-reports.component.*`
- `frontend/src/app/features/manager/team-attendance/team-attendance.component.*`

## Verifikasi

- `go test ./... -count=1` — berhasil.
- Test frontend terkait formatter, statistik, riwayat, rekap admin, laporan
  keterlambatan, dan absensi tim — **17 SUCCESS**.
- `npm run build` — berhasil; warning yang tersisa adalah warning budget/style
  dan dependency CommonJS existing.
- Full frontend suite: **218 SUCCESS, 1 failure existing** pada kontrak
  `WorkReportComponent` yang tidak berkaitan dengan perubahan Tahap 9; fixture
  tersebut menguji revisi rejected tanpa `rejected_at`, sedangkan implementasi
  memang memerlukan timestamp batas revisi.
