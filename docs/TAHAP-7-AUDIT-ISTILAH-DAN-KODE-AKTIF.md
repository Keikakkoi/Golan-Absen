# Tahap 7 — Audit Istilah dan Kode Aktif

## Tujuan

Audit ini memastikan istilah dan workflow aktif peserta `MAGANG` memakai kontrak
**Laporan Kerja**. Data lama tidak dihapus: nama teknis `logbook` hanya boleh tersisa
di migration, adapter, route kompatibilitas, fixture historis, atau dokumentasi yang
menjelaskan masa transisi.

## Metode pencarian

Pencarian dilakukan pada repository dengan mengecualikan `.git`, `node_modules`, dan
artefak build:

```text
rg -n -i --hidden -g '!node_modules/**' -g '!frontend/dist/**' -g '!.git/**' \
  'logbook|log book|log-book|logbbok|logbook harian|Logbook Magang|Laporan Tim / Logbook|status_logbook|logbook\.' .
```

Hasil pencarian kemudian diperiksa berdasarkan pemanggil, route, template, response,
dan permission; perubahan label saja tidak dianggap sebagai migrasi workflow.

## Referensi aktif yang sudah dibersihkan

| Area | Lokasi | Hasil |
|---|---|---|
| Review laporan tim | `frontend/src/app/features/manager/team-reports/` | UI memakai “Laporan Kerja”, normalizer kontrak, dan endpoint `/manager/team/reports/:id/review`. |
| Alias review manager | `backend/internal/handlers/manager.go` | Endpoint `/manager/team/logbooks/:id/review` hanya alias kompatibilitas; jalur canonical memakai handler laporan kerja. |
| Operasional admin | `frontend/src/app/features/admin/role-operations/` | Panel verifikasi logbook lama tidak dirender dan tidak dimuat; inbox aktif adalah Manajemen Laporan Kerja. |
| Dashboard/sidebar/FAQ | `frontend/src/app/features/admin/`, `frontend/src/app/features/shared/help-faq/`, route dan sidebar terkait | Label aktif, heading, bantuan, dan pending counter memakai Laporan Kerja. |
| Dokumentasi pengguna/UAT | `docs/PANDUAN-PENGGUNA-HRD-ABSENSI-GOLAN.md`, `docs/Dokumen Pengujian UAT Sistem Absensi Golan Digital Kreatif.md`, `docs/WORKFLOW-SISTEM-ABSENSI-GOLAN.md` | Cakupan MAGANG dan proses review memakai Laporan Kerja. |

Tidak ada perubahan massal terhadap nama tabel, kolom, route historis, atau komponen
arsip karena perubahan tersebut dapat memutus relasi, bookmark, dan pembacaan data lama.

## Referensi yang sengaja dipertahankan

Referensi berikut bukan fitur logbook aktif. Semuanya memiliki fungsi kompatibilitas yang
terbatas dan tidak boleh dipakai sebagai entry point baru:

- `status_logbook`, `StatusLogbook`, dan `legacy_status_logbook` mempertahankan status
  mentah dari baris historis. Normalizer `work-report-contract` memetakan nilainya ke
  `draft/submitted/approved/rejected`. Endpoint canonical boleh mengisi nilai teknis
  `submitted` sebagai sentinel kompatibilitas, tetapi sumber status aktif tetap
  `status_laporan` dan `status_sesuai`; nilai draft lama tetap dibaca dari field lama.
- `report_kind=legacy_logbook` membedakan baris lama dari laporan kerja canonical.
  Halaman laporan kerja dapat membaca histori, tetapi aksi canonical tidak menulis ulang
  baris tersebut.
- `/intern/logbooks`, `/api/v1/internship/logbooks`, `/api/v1/admin/internship/logbooks`,
  dan `/api/v1/manager/team/logbooks/:id/review` tetap tersedia untuk adapter atau histori.
  Bookmark frontend `/intern/logbooks` sekarang diarahkan ke `/employee/work-report`;
  endpoint admin lama bersifat read-only untuk workflow yang sudah cutover.
- `logbook_pending` adalah alias response backend lama. UI menormalisasikannya menjadi
  `work_reports_pending`; rencana deprecation dicatat pada dokumen Tahap 5–6.
- `logbook_status` pada payload chart, event `logbook.*`, dan event notifikasi seperti
  `new_logbook` hanya diterima di boundary kompatibilitas. Chart dan event canonical
  menggunakan `report_status` serta `work_report.*`.
- `frontend/src/app/features/intern/intern-logbook/` dan test-nya dipertahankan sebagai
  source historis untuk compatibility maintenance, tetapi tidak lagi dirouting dari browser;
  entry point MAGANG aktif hanya `features/employee/work-report/`.
- Migration, `backup_golan.sql`, fixture, test kontrak, serta dokumen `TAHAP-2` sampai
  `TAHAP-6` menyebut nama lama untuk menjelaskan skema, data historis, dan keputusan
  transisi. `docs/catatan baru.md` adalah prompt perubahan dan sengaja tidak diubah.

## Pemeriksaan integritas yang wajib lulus

- Route canonical memiliki handler dan guard role yang sesuai.
- Tidak ada template aktif yang mengarah ke endpoint logbook sebagai alur baru.
- Query canonical memakai kolom laporan kerja yang tersedia; fallback nama lama hanya
  berada di adapter response.
- Status canonical memiliki label untuk draft, diajukan, disetujui, dan ditolak.
- Notifikasi canonical memiliki penerima berdasarkan scope; event legacy tidak menjadi
  satu-satunya pemicu refresh.
- Export canonical memakai kolom dan filter laporan kerja tanpa menggandakan histori.

## Kesimpulan

Pencarian akhir boleh menemukan `logbook` hanya pada daftar kompatibilitas di atas,
migration/data historis, atau dokumentasi yang secara eksplisit menjelaskan transisi.
Tidak ada menu aktif “Verifikasi Logbook”, “Logbook Magang”, atau “Laporan Tim / Logbook”;
semuanya telah diarahkan ke satu alur Manajemen Laporan Kerja.
