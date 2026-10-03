# Tahap 2 — Desain Target dan Kontrak Kompatibilitas

Dokumen ini menetapkan kontrak target untuk menyatukan laporan kerja user `MAGANG` dengan workflow laporan kerja karyawan/manajer. Tahap ini hanya menambahkan fondasi kontrak dan adapter data. Migrasi UI, perubahan route aktif, dan penguatan permission endpoint dilakukan pada tahap implementasi berikutnya.

## Keputusan desain

`work_reports` tetap menjadi tabel canonical. Tidak dibuat tabel atau workflow baru untuk laporan magang. Kolom lama `status_logbook` tetap dipertahankan karena diperlukan untuk membaca riwayat logbook dan endpoint kompatibilitas.

Setiap baris baru memiliki discriminator `report_kind`:

| Nilai | Makna | Pemilik workflow |
|---|---|---|
| `work_report` | laporan kerja canonical, termasuk laporan baru user `MAGANG` setelah cutover | `/work-reports` |
| `legacy_logbook` | data yang dibuat oleh workflow logbook lama | `/internship/logbooks` |

Response canonical menambahkan field turunan yang tidak menggantikan data lama:

| Field response | Nilai |
|---|---|
| `status` | `draft`, `submitted`, `approved`, `rejected` |
| `filling_status` | `draft`, `submitted` |
| `review_status` | `draft`, `pending`, `approved`, `rejected` |
| `submission_timing` | `on_time`, `late` |
| `legacy_status_logbook` | salinan read-only dari status teknis lama bila `report_kind=legacy_logbook` |

## Field laporan

Field isi yang dipertahankan pada kontrak canonical adalah `tanggal`, `tugas`, `judul`, `deskripsi_kegiatan`, `realisasi_kegiatan`, `kendala`, `rencana_minggu_depan`, `link_artikel`, `catatan_tambahan`, `custom_fields`, dan `attachments`. Identitas employee (`employee_id`, snapshot nama/kode) tetap disimpan untuk histori dan audit.

`status_logbook`, `reviewed_by`, `reviewed_at`, `review_notes`, serta `rejection_*` tidak dihapus. Pada data canonical, `status_laporan` menjadi status pengisian dan `status_sesuai` menjadi hasil validasi lama yang dipetakan ke `review_status`. `ValidasiOlehHR` tetap dibaca untuk kompatibilitas, tetapi bukan status workflow baru.

Belum ada field yang dihapus pada tahap ini. Ini disengaja agar rollback dan pembacaan histori tetap aman.

## Pemetaan status

| Data lama | Data canonical/response |
|---|---|
| `status_logbook=draft` | `status=draft`, `filling_status=draft`, `review_status=draft` |
| `status_logbook=submitted` | `status=submitted`, `filling_status=submitted`, `review_status=pending` |
| `status_logbook=approved` | `status=approved`, `filling_status=submitted`, `review_status=approved` |
| `status_logbook=rejected` | `status=rejected`, `filling_status=submitted`, `review_status=rejected` |
| `status_laporan=draft` | `status=draft`, `filling_status=draft`, `review_status=draft` |
| `status_laporan=submitted` + `status_sesuai` kosong | `status=submitted`, `review_status=pending` |
| `status_sesuai=Sesuai` | `status=approved`, `review_status=approved` |
| `status_sesuai=Tidak Sesuai` | `status=rejected`, `review_status=rejected` |
| `status_sesuai=Minta Perbaikan`/`minta_perbaikan` | dipetakan ke `Tidak Sesuai`, lalu `status=rejected` |
| `is_late_submission=true` | `submission_timing=late` |

Nilai kosong pada `status_laporan` diperlakukan sebagai `submitted`, sesuai migration sebelumnya dan perilaku data historis. Nilai mentah tidak ditimpa oleh adapter.

## Hak akses target

| Aktor | Akses target |
|---|---|
| Pemilik laporan (`Karyawan`, `MANAJER`, `MAGANG`) | membuat, menyimpan draft, melihat riwayat sendiri, mengedit/menghapus hanya saat draft; mengajukan dengan mengubah ke `submitted` |
| `MANAJER` | melihat laporan tim yang berada dalam scope manager; memverifikasi atau menolak sesuai workflow review; menulis catatan review; tidak mengubah isi atau menghapus laporan milik orang lain |
| `HRD`/admin | melihat seluruh laporan sesuai filter, detail dan lampiran, memverifikasi/menolak, menulis catatan admin, export; penghapusan mengikuti aturan audit dan kebijakan endpoint canonical |
| User lain | tidak boleh membaca, mengubah, menghapus, atau meninjau laporan di luar scope-nya |

Kepemilikan harus ditegakkan backend berdasarkan user terautentikasi dan `employee_id`, bukan hanya filter frontend. Stage 2 menetapkan kontraknya; route canonical dan guard khusus `MAGANG` akan diselaraskan pada tahap implementasi endpoint/UI.

## Route dan alur target

Route canonical yang menjadi acuan adalah:

- frontend user: `/employee/work-report`, dengan `MAGANG` ditambahkan ke role route yang saat ini hanya menerima `Karyawan` dan `MANAJER`;
- backend user: `/api/v1/work-reports` untuk list, create, update, delete, dan pengajuan;
- frontend admin: `/admin/work-reports` (komponen `work-report-admin`) sebagai halaman **Manajemen Laporan Kerja**;
- frontend manager: `/manager/team/reports`, memakai data laporan kerja canonical dan endpoint review manager.

Route lama `/intern/logbooks`, backend `/internship/logbooks`, dan admin `/admin/internship/logbooks` tidak dihapus pada Tahap 2. Route tersebut membaca data `legacy_logbook` melalui kontrak lama sampai seluruh consumer selesai dipindahkan. Tidak dilakukan redirect buta karena itu dapat mengubah semantics edit/review dan merusak bookmark atau integrasi lama.

### Alur data

```text
Pemilik laporan
  -> validasi field + attachment
  -> WorkReport(report_kind=work_report, status_laporan=draft/submitted)
  -> list/detail canonical dengan status turunan
  -> manager/HRD review sesuai scope
  -> status_sesuai/review metadata + audit/notifikasi yang sudah ada
  -> riwayat, filter, pagination, export

Data lama /intern/logbooks
  -> WorkReport(report_kind=legacy_logbook, status_logbook)
  -> adapter NormalizeContract
  -> response canonical-compatible tanpa mengubah kolom lama
```

Filter minimal yang dipertahankan adalah employee/user, rentang tanggal, project/team, status pengisian/review, dan pagination `page`, `limit`, `total`, `total_pages`. Detail tetap memuat lampiran. Upload attachment memakai `work_report_attachments`; export, websocket event, notifikasi HRD/manager, dan audit deletion tetap merupakan concern workflow canonical yang harus memakai `report_kind` saat cutover.

## Lokasi fondasi

| Lokasi | Perubahan/kontrak | Dampak |
|---|---|---|
| `backend/internal/models/models.go` | `ReportKind` tersimpan dan field status canonical response-only; `AfterFind` menjalankan adapter | Semua pembaca model mendapat bentuk response seragam tanpa menghapus kolom lama |
| `backend/internal/models/work_report_contract.go` | enum, normalisasi filling/validation, dan `NormalizeContract` | Satu sumber mapping status backend |
| `backend/internal/handlers/work_report.go` | laporan canonical baru diberi `report_kind`; normalizer lama memakai helper bersama | Data baru dapat dibedakan dari logbook dan mapping tidak bercabang sendiri |
| `backend/internal/handlers/internship.go` | logbook lama diberi `report_kind=legacy_logbook` | Riwayat dan endpoint lama tetap dapat diidentifikasi |
| `backend/internal/handlers/rules.go` | marker otomatis diberi `report_kind=work_report` | Marker kepatuhan tidak salah dianggap logbook historis |
| `backend/migrations/20261002_work_report_compatibility.sql` | tambah discriminator, backfill, default, not-null, index | Migrasi additive; tidak menghapus table/column/endpoint/migration |
| `frontend/src/app/app.routes.ts` | target role route `/employee/work-report` mencakup `MAGANG`; `/intern/logbooks` dipertahankan sementara | Cutover guard dilakukan eksplisit, bukan hanya mengganti label sidebar |
| `frontend/src/app/features/shared/shared-sidebar` | link MAGANG diarahkan ke route canonical setelah cutover | Menghindari dua entry point aktif untuk alur yang sama |
| `frontend/src/app/core/utils/work-report-contract.ts` | type dan normalisasi response frontend | Consumer baru tidak perlu memahami dua status mentah |
| `frontend/src/app/core/services/work-report.service.ts` | interface memakai contract fields sebagai optional | Komponen lama tetap compile, komponen baru dapat memakai status canonical |

## Strategi kompatibilitas dan histori

Migration mengklasifikasikan baris `MAGANG` yang belum memiliki discriminator sebagai `legacy_logbook`, lalu mengklasifikasikan sisanya sebagai `work_report`. Setelah backfill, `report_kind` memiliki default `work_report`, `NOT NULL`, dan index.

Adapter masih memiliki fallback ketika membaca row sebelum migration: relasi `Employee.User.Role=MAGANG` dan adanya `status_logbook` mengarah ke `legacy_logbook`. Fallback hanya menghitung response; tidak menulis ulang data. Status mentah, tanggal, employee, lampiran, metadata review, rejection, notifikasi, dan tombstone deletion tidak boleh dibersihkan dalam cutover.

Risiko klasifikasi utama adalah row MAGANG yang sudah pernah dibuat melalui endpoint canonical sebelum migration. Sebelum migration dijalankan, deployment harus menghentikan penulisan campuran atau memeriksa row tersebut secara manual. Setelah migration, semua create canonical dan legacy menulis discriminator eksplisit.

## Risiko dan urutan perubahan aman

Risiko utama adalah consumer yang masih membaca `status_logbook`, query admin yang menganggap semua row MAGANG sebagai logbook, perbedaan aturan edit draft, duplikasi notifikasi, serta perubahan export/pagination yang tidak menyertakan field baru.

Urutan yang aman:

1. Jalankan test contract backend/frontend.
2. Backup database dan audit row MAGANG yang akan dibackfill.
3. Jalankan migration discriminator.
4. Deploy model/adapter yang backward-compatible.
5. Pindahkan service dan komponen user MAGANG ke `/work-reports` secara bertahap.
6. Satukan halaman admin dengan Manajemen Laporan Kerja dan verifikasi filter, detail, attachment, export, notifikasi, audit log, serta pagination.
7. Tambahkan guard backend dan uji matrix permission manager/HRD/pemilik.
8. Setelah seluruh consumer pindah, jadikan route logbook compatibility read-only atau redirect terkontrol. Jangan menghapus kolom/tabel sebelum periode retensi histori selesai.

## Test kontrak

Test yang ditambahkan pada tahap ini:

- `backend/internal/models/work_report_contract_test.go`: mapping legacy approved/late, mapping `Minta Perbaikan`, default historical canonical, dan klasifikasi row internship sebelum migration.
- `backend/internal/handlers/work_report_status_test.go`: tetap memastikan empty filling status menjadi submitted dan mapping label lama tidak berubah.
- `frontend/src/app/core/utils/work-report-contract.spec.ts`: mapping response legacy, rejected canonical, dan default historical canonical.

Test lanjutan wajib sebelum cutover UI/route: ownership lintas user, manager team scope, HRD review/rejection, edit/delete draft vs submitted, attachment ownership, export filter, pagination total, websocket/notifikasi deduplikasi, audit log, marker otomatis, dan pembacaan database backup lama.

## Hal yang sengaja belum diubah

Tahap ini belum memindahkan template `intern-logbook`, belum menghapus atau me-redirect route, belum mengubah query admin logbook menjadi query Manajemen Laporan Kerja, dan belum mengubah permission handler secara luas. Perubahan tersebut membutuhkan verifikasi UI dan matrix akses terpisah agar tidak menghilangkan data historis atau membuka laporan milik user lain.
