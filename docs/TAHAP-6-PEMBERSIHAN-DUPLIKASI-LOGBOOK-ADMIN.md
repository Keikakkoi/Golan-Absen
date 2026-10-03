# Tahap 6 — Pembersihan Duplikasi Logbook Admin

## Keputusan alur aktif

Admin hanya memakai satu inbox untuk laporan kerja pada route frontend `/admin/work-reports`. Laporan dari `KARYAWAN`, `MANAJER`, dan `MAGANG` diproses melalui komponen dan kontrak yang sama di `work-report-admin`.

Route `/admin/role-operations` tetap dipertahankan karena masih menyediakan operasi sertifikat magang, absensi tim, statistik, persetujuan izin, dan laporan tim. Panel verifikasi logbook lama tidak lagi dirender dan halaman tersebut tidak lagi memanggil endpoint admin logbook saat dimuat. Kartu arsip di bagian Operasional Magang hanya memberi penjelasan kompatibilitas dan tautan ke Manajemen Laporan Kerja.

Perubahan label aktif:

- `VERIFIKASI LOGBOOK` dan `Logbook Magang` digantikan oleh informasi arsip kompatibilitas.
- `Laporan Tim / Logbook` menjadi `Laporan Tim`.
- Kartu pending admin dan Operasional Magang menggunakan `Laporan Kerja Pending`.
- Backup admin menggunakan label `Work Report`; key teknis tetap `work_report` sehingga isi backup tidak berubah.
- Shortcut dashboard admin tidak lagi menyebut review logbook.

## Kompatibilitas historis

Data lama tidak dihapus. Endpoint berikut tetap dipertahankan sebagai compatibility path untuk data historis dan bookmark lama:

- `/api/v1/admin/internship/logbooks` — baca data legacy; aksi review dan delete tetap ditolak.
- `/api/v1/internship/logbooks` — endpoint legacy user yang masih dibutuhkan adapter pembacaan/perubahan data historis.
- `/api/v1/manager/team/logbooks/:id/review` — alias legacy untuk workflow manager; jalur aktif memakai `/team/reports/:id/review`.

`logbook_pending`, `status_logbook`, `report_kind=legacy_logbook`, dan chart `logbook_status` dipertahankan hanya pada batas backend/adapter untuk membaca data lama. Nilai yang dipakai UI admin dinormalisasi menjadi `work_reports_pending` dan `report_status`.

## Lokasi perubahan

- `frontend/src/app/features/admin/role-operations/role-operations.component.html` — menonaktifkan panel verifikasi legacy, menambahkan arsip kompatibilitas, dan menghapus label logbook dari laporan tim.
- `frontend/src/app/features/admin/role-operations/role-operations.component.ts` — tidak lagi memuat endpoint admin logbook atau merespons event realtime legacy; pending dinormalisasi di boundary response.
- `frontend/src/app/features/admin/admin-dashboard/admin-dashboard.component.html` — shortcut dan widget memakai istilah laporan kerja.
- `frontend/src/app/features/admin/admin-backup/admin-backup.component.ts` — label modul backup disatukan menjadi Work Report tanpa mengubah key penyimpanan.
- `backend/internal/handlers/admin_role_operations.go`, `internship.go`, dan `manager.go` — route lama dipertahankan sebagai compatibility path, bukan menu/alur aktif baru.

## Verifikasi

- `go test -count=1 ./...`
- `npm run build`
- Test kontrak frontend admin/employee untuk inbox laporan kerja.

Tidak ada migration penghapusan tabel/kolom dan tidak ada penghapusan data historis pada tahap ini.
