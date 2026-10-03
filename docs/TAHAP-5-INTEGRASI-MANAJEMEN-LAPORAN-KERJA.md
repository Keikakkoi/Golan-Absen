# Tahap 5 — Integrasi Manajemen Laporan Kerja Admin

## Hasil implementasi

`/admin/work-reports` tetap menjadi satu inbox untuk laporan dari:

- `Karyawan`;
- `MANAJER`;
- `MAGANG`.

Tidak dibuat halaman verifikasi baru. Komponen `work-report-admin` memakai endpoint dan service laporan kerja canonical yang sama untuk ketiga role.

Panel lama pada `role-operations` kini diposisikan sebagai arsip compatibility untuk record legacy dan menautkan admin ke `/admin/work-reports` untuk seluruh proses verifikasi aktif.

## Kemampuan admin/HRD

Inbox sekarang menyediakan:

- filter kata kunci, periode, user pelapor, role pelapor, tim, divisi, jabatan, project, status, dan urutan;
- kolom role pelapor dan tim untuk membedakan sumber laporan;
- pagination dan export dari dataset yang sama sehingga tidak menggandakan laporan;
- detail laporan dalam modal bersama, termasuk catatan Manager/Admin, alasan penolakan, dan lampiran;
- aksi validasi `Sesuai` atau `Tidak Sesuai` melalui endpoint laporan kerja canonical;
- refresh realtime saat laporan baru masuk atau status laporan berubah.

Draft tetap dikeluarkan dari inbox admin. Status canonical membaca `status_laporan` dan `status_sesuai`; row lama memakai adapter `status_logbook`/`report_kind` sehingga tetap terbaca.

## Pending badge dan kompatibilitas

Nama aktif yang digunakan frontend adalah `work_reports_pending`. Backend masih mengirim `logbook_pending` sebagai alias kompatibilitas untuk client lama. Kedua nilai berasal dari kondisi pending yang sama: laporan submitted yang belum disetujui/ditolak, termasuk mapping data legacy, tanpa menghitung draft.

Rencana deprecation: setelah seluruh client lama menggunakan `work_reports_pending`, alias `logbook_pending` dapat dihapus dalam migration API mayor berikutnya. Endpoint `/admin/internship/logbooks` tetap dipertahankan hanya untuk membaca data historis legacy dan bukan sumber inbox Manajemen Laporan Kerja.

## Notifikasi dan realtime

- Status HRD dikirim ke role penerima sebenarnya, termasuk `MAGANG`, bukan selalu `Karyawan`.
- Event `work_report_status_updated` dipancarkan saat HRD mengubah validasi.
- Inbox admin mendengarkan `new_work_report` dan `work_report_status_updated`, lalu memuat ulang data dengan debounce singkat.

## Verifikasi

- `go test -count=1 ./...` — lulus.
- `npm run build` — lulus; tersisa warning budget stylesheet/dependency CommonJS yang sudah ada.
- Test targeted admin/employee work-report dan contract utility — 11 test lulus.
