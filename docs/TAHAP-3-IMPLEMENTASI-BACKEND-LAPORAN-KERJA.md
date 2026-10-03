# Tahap 3 — Implementasi Backend Laporan Kerja

## Hasil implementasi

- `/api/v1/work-reports` sekarang memiliki guard eksplisit untuk `Karyawan`, `MANAJER`, `MAGANG`, dan `HRD`.
- User non-HRD selalu di-scope ke `employee_id` miliknya. Kegagalan menemukan employee tidak lagi dianggap sebagai izin.
- `MAGANG` dapat membuat draft/submitted canonical, melihat laporan miliknya, memperbarui, mengunggah/menghapus lampiran miliknya, dan menghapus laporan canonical miliknya sesuai aturan status.
- `HRD` memakai query canonical yang sama untuk karyawan, manajer, dan magang. Filter mendukung tanggal, `employee_id`, `user_id`, role, status, dan pagination.
- Draft tetap dikeluarkan dari inbox validasi admin. Filter `approved`, `rejected`, dan `submitted` memetakan status canonical serta status legacy tanpa join yang menggandakan baris.
- Manager memiliki alias review canonical `/api/v1/manager/team/reports/:id/review`. Scope tetap dibatasi anggota tim dan hanya laporan MAGANG yang boleh direview melalui endpoint ini; laporan karyawan/manajer tetap memakai alur HRD yang sudah ada.
- Submit laporan canonical MAGANG memberi notifikasi HRD dan manager aktif yang ditentukan oleh `manager_id`/`team_id`.
- Create/update/delete canonical dan compatibility logbook menulis audit `WorkReport`. Review manager juga diaudit.

## Kompatibilitas

`/api/v1/internship/logbooks` dan `/api/v1/admin/internship/logbooks` tetap tersedia untuk data lama, tetapi mengirim header `Deprecation: true` dan successor `/api/v1/work-reports`. Route lama hanya membaca/mengubah baris `legacy_logbook`; tidak lagi mencampur laporan canonical.

Kolom `status_logbook` tidak dihapus. Migration `20261002_work_report_compatibility.sql` dan backfill startup mengklasifikasikan data MAGANG lama sebagai `legacy_logbook`. Laporan baru yang masuk melalui `/work-reports` ditulis sebagai `work_report`.

## Test dan verifikasi

`go test -count=1 ./...` lulus. Contract test mencakup:

- kepemilikan laporan dan penolakan employee berbeda/identity kosong;
- canonical vs legacy draft detection;
- vocabulary filter status admin;
- mapping status dan response historis melalui test model Tahap 2;
- validasi field dan penghapusan attachment melalui test handler yang sudah ada.

Frontend belum dipindahkan pada tahap ini. Perubahan route/menu/template dilakukan setelah endpoint canonical dipakai oleh komponen MAGANG dan test UI diperbarui.
