# Prompt Bertahap — Perbaikan Laporan Kerja

Gunakan dokumen ini sebagai prompt kerja lanjutan untuk memperbaiki sistem **Laporan Kerja**. Kerjakan satu tahap dalam satu waktu. Setelah setiap tahap selesai, tampilkan file yang berubah, alasan perubahan, hasil test, risiko, dan sisa pekerjaan sebelum melanjutkan tahap berikutnya.

## Tujuan akhir

Sistem harus memenuhi seluruh kondisi berikut:

- Form tambah dan edit memakai satu field canonical **Judul Tugas**.
- Nilai lama dari `judul`, `tugas`, dan `Judul Golan Nusantara/Education` tetap dapat dibaca tanpa kehilangan data.
- Draft laporan milik `MAGANG` dapat diedit dan dihapus oleh pemiliknya seperti `work_report` biasa. Data historis yang benar-benar legacy tetap aman dan read-only jika tidak memenuhi kriteria pemulihan.
- `no_report` menjadi status canonical dan marker `status_sesuai = "tidak membuat laporan kerja"` dipetakan konsisten.
- Label state no-report selalu **Belum Membuat Laporan Kerja**.
- Laporan tanpa isi tidak dihitung sebagai Pending, Submitted, Draft, Disetujui, Ditolak, atau Menunggu Review.
- Chart, kartu statistik, tabel, detail, notifikasi, dan export menggunakan sumber status yang sama.
- Tabel **Daftar Laporan Masuk** admin rapi pada semua ukuran layar. Kolom **Alasan Penolakan** dan **Aksi & Validasi** tidak boleh menyatu.
- Route, migration, endpoint, kolom, event, dan data historis lama tidak dihapus sebelum strategi kompatibilitas terbukti aman.
- UAT role Karyawan, MAGANG, MANAJER, dan HRD/Admin dilakukan dengan akun valid atau dicatat resmi sebagai blocked karena kredensial.

## Temuan awal yang wajib diverifikasi

Audit kode aktual terlebih dahulu. Jangan menganggap nomor baris tetap sama.

1. Form tambah/edit masih memisahkan `Judul Golan Nusantara/Education` dan `tugas`, padahal UI harus menggunakan **Judul Tugas**.
2. Backend canonical di `work_report_contract.go` baru mengenal `draft`, `submitted`, `approved`, dan `rejected`; `no_report` belum menjadi status canonical.
3. Mapping bersama belum memetakan marker `status_sesuai = "tidak membuat laporan kerja"` menjadi `no_report`.
4. Employee dan manager masih dapat menerjemahkan laporan kosong menjadi Submitted, Menunggu Review, Menunggu, atau Diajukan.
5. Label admin belum seragam: `Belum membuat laporan kerja`, `Belum mengisi`, dan `Belum Isi Laporan`.
6. Query pending di `work_report.go` belum mengecualikan marker tidak membuat laporan kerja.
7. Chart masih memakai kategori Selesai, Pending, Terlambat, dan Ditolak tanpa kategori **Belum Membuat Laporan Kerja**.
8. Kartu admin masih memakai label `Belum Isi Laporan`.
9. Export employee/manager belum tentu memakai normalizer `no_report`.
10. Tabel Daftar Laporan Masuk admin memiliki masalah ukuran header, background, wrapping, dan jarak antara kolom Alasan Penolakan dengan Aksi & Validasi.
11. `role-operations` boleh memiliki arsip legacy, tetapi kode yang tidak aktif harus jelas ditandai dan tidak boleh menjadi jalur UI aktif.
12. Perubahan sebelumnya berada dalam satu working tree besar tanpa commit per tahap. Jejak perubahan harus dibuat terukur mulai dari pekerjaan ini.

## Area yang wajib diaudit

- Form dan halaman employee: `frontend/src/app/features/employee/work-report/`.
- Halaman admin: `frontend/src/app/features/admin/work-report-admin/` dan `admin-dashboard/`.
- Halaman manager: `frontend/src/app/features/manager/team-reports/`.
- Halaman dan redirect Magang: `frontend/src/app/features/intern/` dan `frontend/src/app/app.routes.ts`.
- Normalizer/status: `frontend/src/app/core/utils/`, terutama `work-report-contract.ts` dan `report-completeness.ts`.
- Service dan export: seluruh service laporan serta pemanggil CSV, Excel, PDF, JSON, dan print.
- Backend laporan: `backend/internal/handlers/work_report.go`, `rules.go`, `manager.go`, `dashboard_charts.go`, dan handler statistik/admin.
- Model dan kontrak: `backend/internal/models/models.go` serta `work_report_contract.go`.
- Migration/kompatibilitas: `backend/migrations/` dan `backend/config/database.go`.
- Style/template tabel: HTML, SCSS, dan komponen admin Daftar Laporan Masuk.

---

## Prompt Tahap 1 — Audit baseline dan kontrak canonical

> Audit kode aktual sebelum mengubah implementasi. Petakan alur create, edit, draft, submit, delete, detail, review, chart, kartu, export, notifikasi, permission, dan UAT.
>
> Catat untuk setiap temuan: file, fungsi/selector, endpoint, field database, payload, response, status sumber, label UI, test yang sudah ada, dan risiko kompatibilitas.
>
> Tetapkan kontrak berikut berdasarkan kode aktual:
>
> - field UI dan response canonical: **Judul Tugas**;
> - status workflow: `draft`, `submitted`, `approved`, `rejected`;
> - state kelengkapan canonical: `no_report` dengan label **Belum Membuat Laporan Kerja**;
> - marker legacy yang dipetakan: `status_sesuai = "tidak membuat laporan kerja"`;
> - aturan bahwa no-report bukan pending dan tidak memiliki aksi edit, hapus, submit, approve, atau reject;
> - kriteria pemulihan Draft MAGANG bila masih terdeteksi sebagai `legacy_logbook`.
>
> Jangan mengubah kode pada tahap ini kecuali dokumentasi audit. Jika struktur aktual berbeda dari asumsi, hentikan bagian yang terdampak dan sesuaikan rencana.

**Kriteria selesai:** kontrak, daftar file terdampak, strategi kompatibilitas, dan baseline test terdokumentasi.

## Prompt Tahap 2 — Satukan field menjadi Judul Tugas

> Ubah form tambah dan edit agar hanya menampilkan satu field canonical bernama **Judul Tugas**. Hapus pemisahan visual antara `Judul Golan Nusantara/Education` dan `Tugas` pada alur aktif.
>
> Buat adapter backward-compatible untuk data lama:
>
> - jika `judul` dan `tugas` terisi, gabungkan secara deterministik dan dokumentasikan separatornya;
> - jika hanya salah satu terisi, gunakan nilai yang terisi;
> - jangan menimpa atau menghapus nilai mentah lama;
> - response/detail/filter/export canonical menggunakan **Judul Tugas**;
> - migration atau field baru harus additive, idempotent, dan memiliki backfill aman bila memang diperlukan.
>
> Perbarui validasi, placeholder, accessibility text, payload create/update, response mapper, detail modal, pencarian, sorting, export, dan test. Pastikan laporan Draft dan Submitted sama-sama terbaca.

**Kriteria selesai:** semua form aktif menggunakan satu **Judul Tugas**, data lama tetap tampil benar, dan create/update/detail/filter/export lulus.

## Prompt Tahap 3 — Pulihkan Draft MAGANG yang salah diklasifikasikan

> Perbaiki kasus laporan MAGANG berstatus Draft yang terdeteksi sebagai `legacy_logbook` dan menjadi view-only.
>
> Setelah audit, pilih strategi paling aman: migration additive idempotent, repair saat read/write yang tercatat, atau adapter canonical. Jangan mengubah semua data legacy secara massal.
>
> Aturan minimum:
>
> - Draft `legacy_logbook` milik user `MAGANG` yang memenuhi kriteria dapat dipulihkan menjadi `work_report`;
> - ID, pemilik, tanggal, isi, attachment, metadata, dan audit history tetap dipertahankan;
> - pemilik yang sah dapat Edit dan Hapus melalui endpoint canonical;
> - laporan user lain tetap ditolak oleh backend;
> - legacy yang sudah submitted/approved/rejected tetap read-only kecuali ada aturan migrasi teruji;
> - laporan baru MAGANG selalu tersimpan sebagai `work_report`;
> - frontend tidak boleh menentukan permission hanya dari tombol yang terlihat.
>
> Tambahkan test backend untuk ownership, status, report kind, update, delete, dan regresi data historis. Tambahkan test frontend untuk tombol Edit/Hapus dan state Draft.

**Kriteria selesai:** Draft MAGANG yang valid tidak lagi view-only, authorization backend lulus, dan histori legacy tidak berubah secara destruktif.

## Prompt Tahap 4 — Jadikan no_report status canonical

> Tambahkan `no_report` ke kontrak status canonical backend dan frontend dengan mapping bersama.
>
> Mapping wajib mengenali:
>
> - `status_sesuai = "tidak membuat laporan kerja"`;
> - response `missing_work_reports` atau completion state sejenis;
> - record kosong/tanpa isi berdasarkan aturan bisnis yang sudah disepakati.
>
> Semua sumber tersebut harus menghasilkan:
>
> - kode canonical `no_report`;
> - label tepat **Belum Membuat Laporan Kerja**;
> - bukan `draft`, `submitted`, `approved`, `rejected`, `pending`, atau `review`;
> - tanpa aksi edit, hapus, submit, approve, atau reject.
>
> Gunakan satu fungsi mapping backend dan satu normalizer frontend. Jangan membuat mapping berbeda per halaman.

**Kriteria selesai:** unit/contract test membuktikan marker dan laporan kosong selalu menghasilkan `no_report` di seluruh role.

## Prompt Tahap 5 — Perbaiki query pending, chart, dan kartu statistik

> Perbaiki query backend agar `no_report` dan marker tidak membuat laporan kerja tidak masuk ke Pending, Submitted, Approved, Rejected, atau Menunggu Review.
>
> Perbarui chart agar kategori status memiliki makna yang jelas, minimal:
>
> - **Belum Membuat Laporan Kerja**;
> - Menunggu Review;
> - Disetujui;
> - Ditolak.
>
> Pertahankan Draft hanya pada dashboard yang memang menampilkan Draft. Pastikan agregasi tidak menggandakan record karena adapter legacy.
>
> Ganti seluruh label `Belum Isi Laporan`, `Belum mengisi`, dan variasinya menjadi **Belum Membuat Laporan Kerja**. Bedakan unit hitung laporan dan user/karyawan agar angka kartu tidak menyesatkan.
>
> Tambahkan test untuk kombinasi: user tanpa laporan, Draft, Submitted, Approved, Rejected, dan legacy marker.

**Kriteria selesai:** no-report tidak masuk pending/chart workflow, chart dan kartu menampilkan jumlah yang benar, serta label tunggal digunakan.

## Prompt Tahap 6 — Perbaiki tabel Daftar Laporan Masuk admin

> Rapikan tabel Manajemen Laporan Kerja/Daftar Laporan Masuk tanpa mengubah data atau behavior yang tidak terkait.
>
> Periksa dan perbaiki:
>
> - ukuran dan background header;
> - padding, line-height, vertical alignment, dan wrapping;
> - lebar minimum kolom;
> - overflow horizontal pada layar kecil;
> - jarak dan batas visual kolom **Alasan Penolakan**;
> - jarak dan lebar kolom **Aksi & Validasi**;
> - tombol yang tidak boleh tertutup atau menyatu dengan kolom lain;
> - label panjang **Belum Membuat Laporan Kerja**.
>
> Gunakan style scoped pada komponen terkait. Jangan mengubah CSS global secara luas. Uji minimal viewport 1920px, 1366px, 1024px, 768px, dan 390px.

**Kriteria selesai:** header dan isi tabel terbaca, kolom Alasan Penolakan terpisah jelas dari Aksi & Validasi, dan layout responsif.

## Prompt Tahap 7 — Samakan employee, manager, admin, detail, dan notifikasi

> Perbarui semua penerjemahan status agar menggunakan normalizer canonical.
>
> Pastikan:
>
> - employee tidak menampilkan no-report sebagai Submitted atau Menunggu Review;
> - manager tidak menampilkan no-report sebagai Menunggu atau Diajukan;
> - admin memakai label **Belum Membuat Laporan Kerja**;
> - detail, badge, filter, sorting, notifikasi, dan empty state konsisten;
> - no-report tidak menampilkan aksi workflow;
> - route `/intern/logbooks` tetap redirect ke Laporan Kerja;
> - endpoint, migration, event, dan data historis legacy tetap tersedia sesuai strategi kompatibilitas.

**Kriteria selesai:** tidak ada label lama pada UI aktif dan seluruh role memakai kontrak status yang sama.

## Prompt Tahap 8 — Perbaiki export CSV, Excel, PDF, JSON, dan print

> Audit seluruh pemanggil export laporan kerja pada employee, MAGANG, manager, dan admin.
>
> Semua export wajib:
>
> - memakai normalizer status yang sama dengan tabel;
> - menampilkan status no-report sebagai **Belum Membuat Laporan Kerja**;
> - memakai kolom **Judul Tugas**;
> - tidak menampilkan no-report sebagai Submitted atau Menunggu Review;
> - menghormati filter, role scope, ownership, pagination/export dataset, dan tanpa duplikasi;
> - mempertahankan informasi legacy hanya bila memang diperlukan untuk histori dan diberi nama yang jelas.
>
> Tambahkan test snapshot/fixture atau contract test untuk setiap format, minimal mencakup no-report, Draft, Submitted, Approved, Rejected, Judul Tugas baru, dan data legacy.

**Kriteria selesai:** hasil export sama dengan tabel pada status, judul, jumlah, filter, dan hak akses.

## Prompt Tahap 9 — UAT akun nyata dan permission

> Jalankan UAT interaktif menggunakan akun resmi valid untuk Karyawan, MAGANG, MANAJER, dan HRD/Admin. Jangan membuat atau mengubah password production tanpa prosedur resmi.
>
> Skenario wajib:
>
> 1. tambah laporan dengan satu field **Judul Tugas**;
> 2. edit laporan Draft dan verifikasi nilai tersimpan;
> 3. user MAGANG mengedit dan menghapus Draft yang menjadi miliknya;
> 4. user tidak dapat mengedit/menghapus laporan milik user lain;
> 5. user tanpa laporan melihat **Belum Membuat Laporan Kerja**;
> 6. no-report tidak masuk kartu Pending, chart workflow, atau Menunggu Review;
> 7. admin melihat tabel tanpa benturan kolom;
> 8. export CSV, Excel, PDF, JSON, dan print konsisten;
> 9. legacy history tetap dapat dibaca;
> 10. endpoint tanpa token dan akses lintas ownership tetap ditolak.
>
> Jika akun nyata belum tersedia, tandai UAT sebagai **blocked**, catat endpoint/skenario yang belum dapat diuji, dan jangan menyatakan UAT lulus hanya berdasarkan build atau unit test.

**Kriteria selesai:** UAT empat role lulus atau blocker kredensial dilaporkan secara resmi dan dapat ditindaklanjuti.

## Prompt Tahap 10 — Jejak perubahan dan gate final

> Mulai pekerjaan ini, pisahkan perubahan per tahap dengan commit atau patch terukur. Jika repository belum siap commit, buat minimal laporan file sebelum/sesudah untuk setiap tahap.
>
> Pada akhir setiap tahap, laporkan:
>
> - file yang diubah dan alasan setiap perubahan;
> - endpoint, migration, kolom, event, dan data yang dipertahankan;
> - test yang dijalankan dan hasilnya;
> - risiko, rollback, dan sisa pekerjaan.
>
> Jalankan gate final:
>
> - `go test -count=1 ./...`;
> - `go vet ./...`;
> - seluruh test frontend;
> - type-check aplikasi dan spec;
> - `npm run build`;
> - `git diff --check`;
> - pencarian istilah UI aktif dan status lama;
> - UAT atau laporan blocked yang lengkap.
>
> Jangan menyatakan selesai apabila masih terjadi salah satu kondisi berikut:
>
> - form masih meminta dua field Judul dan Tugas;
> - Draft MAGANG masih read-only karena `legacy_logbook`;
> - `no_report` belum canonical;
> - no-report masih dihitung Pending atau tampil sebagai Menunggu Review;
> - label belum persis **Belum Membuat Laporan Kerja**;
> - chart, kartu, tabel, detail, atau export tidak konsisten;
> - kolom admin masih bertabrakan;
> - test gagal;
> - UAT belum selesai dan belum dicatat sebagai blocked.

## Aturan wajib

- Jangan menghapus kolom `judul`, `tugas`, `status_logbook`, migration, endpoint, event, atau data legacy tanpa strategi kompatibilitas, backup, dan uji dampak.
- Jangan mengubah seluruh `legacy_logbook` menjadi `work_report`; hanya record Draft MAGANG yang memenuhi kriteria pemulihan.
- Authorization harus ditegakkan backend berdasarkan user, ownership, role, scope, status, dan `report_kind`.
- Jangan menganggap penyembunyian tombol frontend sebagai authorization.
- Gunakan **Judul Tugas** dan **Belum Membuat Laporan Kerja** sebagai istilah UI canonical.
- Jangan mengubah fitur yang tidak berkaitan dengan migrasi laporan kerja, status, dashboard terkait, export, tabel admin, kompatibilitas legacy, atau UAT.
- Jika kode aktual berbeda dari prompt, hentikan bagian terdampak, jelaskan perbedaannya, lalu sesuaikan tahap berdasarkan audit.

---

## Hasil Audit Tahap 1 — Baseline 2026-10-03

### Status pelaksanaan

Audit dilakukan terhadap working tree aktual pada 2026-10-03. Working tree sudah
memiliki perubahan backend, frontend, migration, test, dan dokumen dari pekerjaan
sebelumnya. Perubahan tersebut tidak di-reset atau ditimpa. Tahap ini hanya
menambahkan dokumentasi audit; tidak ada kode aplikasi, migration, endpoint, event,
kolom, atau data yang diubah oleh audit ini.

Kesimpulan tahap: **audit selesai, implementasi ditahan pada gap yang ditemukan**.

### Baseline test

| Suite | Perintah | Hasil | Catatan |
|---|---|---|---|
| Backend | `go test -count=1 ./...` dari `backend/` | Lulus | Seluruh package yang memiliki test lulus. |
| Frontend | `npm test -- --watch=false --browsers=ChromeHeadless` dari `frontend/` | Lulus, `111 SUCCESS` | Ada log error HTTP simulasi dari beberapa component test, tetapi tidak ada assertion yang gagal. |
| UAT akun nyata | Belum dijalankan | **Blocked/belum dapat dinyatakan lulus** | Kredensial dan bukti interaktif empat role tidak tersedia di baseline. Dokumen UAT yang ada masih memiliki placeholder lingkungan, akun, tanggal, dan baseline build. |

Baseline ini hanya membuktikan test otomatis saat ini. Baseline tidak membuktikan
kontrak `no_report`, pemulihan Draft MAGANG, authorization lintas ownership melalui
HTTP, konsistensi export, atau UAT akun nyata.

## Kontrak canonical: target dan kondisi aktual

| Kontrak | Target tahap | Kondisi aktual yang ditemukan | Risiko/gap |
|---|---|---|---|
| Field UI dan response | Label canonical **Judul Tugas** | Model `WorkReport`, payload `workReportInput`, service, form employee, form compatibility MAGANG, tabel, detail, dan export masih memakai dua field `tugas` dan `judul`. Response Go masih mengirim field mentah tersebut; belum ada field/adapter `judul_tugas`. | Perubahan field tanpa adapter dapat memutus data historis, filter, detail, export, dan client lama. Tahap 2 harus additive dan mempertahankan `judul` serta `tugas`. |
| Workflow | `draft`, `submitted`, `approved`, `rejected` | Konstanta backend dan type frontend sudah memuat empat status. `pending` hanya dipakai sebagai `review_status`, bukan workflow status. | Mapping legacy dan status kosong harus tetap backward-compatible. |
| Kelengkapan | `no_report` dengan label **Belum Membuat Laporan Kerja** | `report-completeness.ts` memiliki `no_report`, dan admin memakai hasilnya. Namun `WorkReportWorkflowStatus`/`WorkReportStatus` tidak memiliki `no_report`; `normalizeWorkReportContract` tidak memetakan marker atau row kosong; employee dan manager dapat membaca row tersebut sebagai submitted/pending. Label aktif masih bervariasi: `Belum membuat laporan kerja`, `Belum mengisi`, `Belum ada laporan kerja`, dan `Belum lapor!`. | Sumber status berbeda antar halaman. Row no-report dapat masuk Pending atau memperoleh aksi workflow. |
| Marker legacy | `status_sesuai = "tidak membuat laporan kerja"` dipetakan ke `no_report` | Marker dibuat oleh `EnsureDailyWorkReportsAutoCreated`, dilewati oleh `workReportStatusMap`, dan dikenali oleh `workReportComplianceStatusMap` serta utilitas frontend kelengkapan. Marker belum dipetakan oleh kontrak backend/frontend bersama. | `workReportPendingCondition` dan `chartReportStatus` menganggap validasi selain daftar reviewed sebagai Pending; marker tidak termasuk daftar pengecualian sehingga masih dapat dihitung Pending. |
| Aksi no-report | Bukan pending dan tanpa edit, hapus, submit, approve, reject | Admin template sudah menonaktifkan sebagian kontrol berdasarkan `isNoReport`. Akan tetapi employee memakai `normalizeWorkReportContract` yang belum mengenali marker, sehingga `canModifyReport` dapat true. Manager juga dapat membaca row marker sebagai submitted/pending dan `canReview` dapat true. Backend hanya mengunci marker melalui `isWorkReportLocked` pada sebagian update/delete; belum ada state canonical `no_report` yang ditegakkan seragam pada semua endpoint review. | Penyembunyian/disable tombol tidak cukup sebagai authorization. Harus ada guard backend terpusat berdasarkan state canonical. |
| Pemulihan Draft MAGANG | Hanya Draft MAGANG `legacy_logbook` yang memenuhi kriteria aman | Belum ada mekanisme konversi/pemulihan. Migration mengklasifikasikan row MAGANG lama sebagai `legacy_logbook`; endpoint canonical sengaja menolak update/delete row legacy untuk MAGANG dan endpoint compatibility hanya mengizinkan Draft milik pemilik. | Draft yang valid tetap terpisah/view-only di UI canonical. Konversi massal tidak boleh dilakukan. |

### Kriteria pemulihan yang ditetapkan untuk tahap berikutnya

Kriteria ini merupakan kontrak audit, bukan perubahan data pada Tahap 1. Sebuah row
hanya boleh dipertimbangkan untuk adapter/migration pemulihan jika seluruh kondisi
berikut terpenuhi:

1. `report_kind` bernilai `legacy_logbook` atau row belum terklasifikasi tetapi dapat
   dibuktikan berasal dari workflow logbook lama.
2. Pemilik terhubung melalui `employee_id` ke user dengan role `MAGANG`; actor yang
   meminta perubahan harus user yang sama.
3. Status mentah `status_logbook` adalah `draft` setelah normalisasi whitespace/case.
4. Tidak ada tanda review terminal: `status_logbook` bukan `submitted`, `approved`,
   atau `rejected`; tidak ada `reviewed_by`/`reviewed_at`; dan tidak ada marker
   penolakan atau marker `tidak membuat laporan kerja`.
5. Tidak ada row canonical lain yang konflik untuk owner dan tanggal yang sama.
6. ID, owner, tanggal, seluruh isi mentah, attachment, metadata, dan audit history
   dapat dipertahankan; operasi harus additive, idempotent, tercatat, dan dapat
   diverifikasi sebelum commit.

Row yang gagal salah satu kondisi tetap `legacy_logbook`, dibaca sebagai histori,
dan tidak boleh diubah menjadi `work_report`.

## Pemetaan alur aktual

| Alur | File/fungsi atau selector | Endpoint dan permission backend | Field/payload utama | Response/status/label aktual | Test dan risiko kompatibilitas |
|---|---|---|---|---|---|
| Create laporan canonical | `frontend/.../employee/work-report/work-report.component.ts`: `processSave`; `work_report.component.html` form | `POST /api/v1/work-reports`; route Protected + role Karyawan/MANAJER/MAGANG/HRD. Owner employee dicari dari token. | Multipart `tanggal`, `tugas`, `judul`, isi kegiatan, `custom_fields`, `status_laporan`, `screenshots`. | Row baru `report_kind=work_report`, `status_laporan=draft/submitted`, `status_logbook=submitted`; response juga memiliki derived `status`, `filling_status`, `review_status`, `submission_timing`. UI masih memakai dua input dan label lama. | Backend validation/status tests dan component tests ada. Risiko terbesar adalah dua field aktif dan response belum canonical `Judul Tugas`. |
| Draft dan submit | `saveDraft`, `submitReport`, `CreateWorkReport` | Endpoint yang sama; backend menormalisasi status kosong/invalid menjadi submitted. | `status_laporan=draft` atau `submitted`; submit mewajibkan `tugas`, deskripsi, dan judul untuk divisi tertentu serta persentase realisasi. | Draft tidak masuk inbox HRD berdasarkan query; submitted mengirim WebSocket `new_work_report` dan notification HRD/manager. | Ada test status/validation, belum ada contract test end-to-end payload-response per role. |
| Edit canonical | `editReport`, `UpdateWorkReport` | `PUT /api/v1/work-reports/:id`; non-HRD diverifikasi dengan `employee_id` milik token; HRD dapat memakai endpoint. | Multipart/JSON memakai field mentah yang sama; update dapat membawa status, attachment delete, status validation, atau admin notes. | UI mengizinkan semua status selain `approved` dan menolak `legacy_logbook`; backend non-HRD terutama mengunci `Sesuai` dan marker, bukan secara eksplisit membatasi seluruh edit pada Draft. | `work_report.component.spec.ts` menguji label/permission frontend, bukan HTTP ownership/status matrix. Risiko owner dapat mengubah status selain Draft jika guard lain tidak aktif. |
| Delete canonical | `deleteReport`, `DeleteWorkReport`, `deleteWorkReportData` | `DELETE /api/v1/work-reports/:id`; owner diverifikasi backend, HRD bypass owner check sesuai route role. | ID path; attachment dihapus lebih dulu, row deletion dicatat ke `work_report_deletions`. | Response message sukses; WebSocket khusus canonical tidak terlihat pada fungsi delete. | Ada SQL mock test child-first deletion. Risiko operasi bersifat destruktif dan backup operasional tidak menjadi bagian endpoint. |
| Detail | `viewReportDetail` dan modal detail pada employee/admin; tidak ada `GET /:id` khusus | Detail dibaca dari row hasil `GET /api/v1/work-reports`; scope query menentukan data. | Field mentah `tugas`, `judul`, isi, status, review note, rejection, attachment. | Detail tidak melalui mapper khusus; label employee/admin berbeda. | Component test hanya sebagian. Risiko detail dapat menampilkan istilah lama dan mapping status berbeda dari tabel. |
| Logbook legacy create/edit/delete | `intern-logbook.component.ts`; `Get/Create/Update/DeleteInternshipLogbook` | `GET/POST/PUT/DELETE /api/v1/internship/logbooks...`; route Protected + role MAGANG, compatibility header `Deprecation: true` dan successor link. | `status_logbook`, `tugas`, `judul`, isi, attachment. Query membatasi `report_kind=legacy_logbook`; update/delete membatasi `employee_id` owner dan Draft. | Raw `status_logbook` draft/submitted/approved/rejected; UI legacy masih memakai judul lama dan label `logbook`. | Ada component test Draft-only. Risiko route/event/endpoint lama tetap wajib dipertahankan dan belum memiliki adapter `no_report` bersama. |
| Review manager | `ReviewManagerWorkReport`, `team-reports.component.ts` | `PUT /api/v1/manager/team/reports/:id/review`; role MANAJER, employee harus berada di `managerTeamIDs`, employee harus role MAGANG. Menerima canonical MAGANG dan legacy logbook. | JSON `status=approved/rejected`, `notes/review_notes`, `rejection_reason`. | Legacy menulis `status_logbook`; canonical menulis `status_sesuai` `Sesuai/Tidak Sesuai`; notification employee dan WebSocket status event. | Manager component tests menguji status dan duplicate request. Belum ada test HTTP untuk manager scope + `no_report`. |
| Review/admin validation | `updateValidation`, `UpdateWorkReport`, admin table action | `PUT /api/v1/work-reports/:id`; role HRD di route; status validation dan admin notes diproses backend. | JSON `status_sesuai`, `rejection_reason`, `admin_notes`. | UI memakai `Validasi laporan`, `Tolak laporan`, `Menunggu validasi`, dan `Tidak perlu validasi`; response raw fields. | Admin component tests badge/filter/detail. Risiko filter/label belum canonical dan row no-report masih harus ditegakkan backend. |
| Compliance | `loadCompliance`, `GetWorkReportCompliance`, `workReportStatusMap`, `workReportComplianceStatusMap` | `GET /api/v1/work-reports/compliance`; non-HRD scope ke employee token, HRD dapat `employee_id`; HRD mengecualikan draft. | Query tanggal/employee; response `employee_id`, `tanggal`, `has_report`, `status`. | Backend membedakan `missing`, `draft`, `submitted`, `validated`, `needs_improvement`; marker menjadi `missing`, tetapi belum `no_report` canonical. | Compliance/status tests ada. Risiko response status belum sama dengan contract status baru. |
| Dashboard cards/missing | `GetEmployeeDashboardStats`, `GetAdminDashboardStats`, `missingWorkReportRows`, intern dashboard | Employee `GET /api/v1/dashboard/employee/stats`; HRD `GET /api/v1/admin/reports/stats` dan `/missing-work-reports`; MAGANG `GET /api/v1/internship/dashboard`. | Derived `missing_work_reports`, `work_reports_pending`, compatibility alias `logbook_pending`, counts submitted/approved. | Missing row hanya berisi employee/date/deadline; belum memiliki `state=no_report` dan label canonical. Admin pending memakai `workReportPendingCondition`; intern masih mengembalikan alias logbook. | Tidak ada contract test untuk kombinasi marker/card/count. Marker dapat masuk pending admin karena kondisi SQL belum mengecualikannya. |
| Chart | `GetDashboardCharts`, `chartReportStatus`, `dashboard-charts.component.ts/html` | `GET /api/v1/dashboard/charts`; backend scope berdasarkan role/token, bukan employee id dari client. | tanggal; response `attendance_trend`, `today_status`, `comparison`, `report_status`, legacy alias `logbook_status`. | Report labels aktif `Selesai`, `Pending`, `Terlambat`, `Ditolak`; belum ada **Belum Membuat Laporan Kerja**. Query Pending belum mengecualikan marker. | Tidak ada test chart status work-report. Risiko chart tidak sejalan dengan compliance/table/card. |
| Export/print | `employee/work-report`, `admin/work-report-admin`, `manager/team-reports`, `report-export.service.ts` | Export utama dibuat client-side dari data list; manager melakukan request list ulang tanpa pagination untuk export. | CSV/XLS/JSON/PDF/print membaca `tugas`, `judul`, status helper lokal, review/rejection, custom fields, attachment. | Header masih `Tugas`, `Judul`, atau `Judul Golan Nusantara/Golan Education`; helper status berbeda antar komponen. Legacy screen juga masih export `Status Logbook`. | Belum ada fixture/snapshot/contract test export untuk no-report, legacy, dan lima format. Risiko filter/scope/label export tidak identik dengan tabel. |
| Notifikasi/event | `notifyWorkReportManagers`, `CreateNotification`, `NotificationService`, component realtime callbacks | Notification read milik user; event dikirim dari create/submit/review; route notification Protected. | recipient role/user, title/message, `new_work_report`, `work_report_status_updated`; event legacy tetap diterima. | UI refresh pada event tertentu; istilah pesan masih mencampur Laporan Kerja/Logbook. No-report tidak memiliki aksi/event workflow canonical. | Tidak ada test integrasi notification laporan kerja. Risiko perubahan nama event dapat memutus refresh legacy client. |
| Route dan redirect MAGANG | `frontend/src/app/app.routes.ts`, `intern-logbook` compatibility screen | Browser `/intern/logbooks` redirect ke `/employee/work-report`; API legacy tetap aktif. | Tidak ada payload pada redirect; token tetap dibutuhkan endpoint. | Entry point aktif canonical, tetapi component legacy dan endpoint masih ada untuk histori/bookmark. | Route redirect belum membuktikan API legacy aman untuk semua data. Jangan menghapus endpoint/event. |

## Authorization dan scope baseline

Authorization backend memang menggunakan middleware token dan role pada route, lalu
menambahkan pemeriksaan ownership atau team scope pada handler. Temuan pentingnya:

- `UpdateWorkReport` dan `DeleteWorkReport` memeriksa owner untuk non-HRD, sedangkan
  manager review memakai `managerTeamIDs` dan role MAGANG.
- `GetWorkReports` membatasi non-HRD ke employee dari `user_id`; HRD mendapat read
  model seluruh laporan dengan filter employee/project/user/role.
- `GetManagerTeamReports` mengambil team dari relasi manager dan menolak
  `employee_id` di luar team.
- Frontend `canModifyReport`, `canReview`, dan `isNoReport` hanya UX guard. Guard
  tersebut tidak boleh dijadikan dasar authorization.
- Backend belum memakai satu fungsi authorization yang sekaligus memeriksa user,
  ownership, role, scope, status, dan `report_kind` untuk semua create/edit/delete/
  review. Ini harus menjadi syarat acceptance tahap implementasi.

## Migration, kolom, endpoint, event, dan data legacy

| Artefak | Kondisi aktual | Keputusan kompatibilitas baseline |
|---|---|---|
| Kolom `judul`, `tugas`, `status_logbook` | Masih ada di model, migration, payload, response, dan UI. | Pertahankan. Tidak boleh dihapus atau ditimpa; buat adapter canonical additive. |
| `report_kind` | Ditambahkan melalui `20261002_work_report_compatibility.sql` dan startup `ConnectDB`; nilai `work_report`/`legacy_logbook`. | Additive dan idempotent, tetapi klasifikasi awal mencakup seluruh row MAGANG dengan status logbook yang dikenal. Verifikasi dampak dan backup diperlukan sebelum perubahan lanjutan. |
| Legacy endpoint | `/api/v1/internship/logbooks` masih aktif dengan header deprecation/successor. | Pertahankan sampai client/histori dan UAT kompatibilitas terbukti aman. |
| Legacy event | `new_logbook`, `logbook_updated`, `logbook_deleted`, `logbook_status_updated` masih diterima realtime. | Jangan menghapus; event canonical boleh ditambah dengan mapping yang terdokumentasi. |
| Data/attachment/audit | `WorkReport`, `WorkReportAttachment`, `work_report_deletions`, review fields, raw status, dan log action tetap dipakai. | Tidak ada migrasi destruktif pada Tahap 1. Backup/export database harus menjadi gate sebelum repair data. |

## Daftar file terdampak dan owner area

Daftar berikut adalah file area laporan kerja yang ditemukan oleh audit; status dirty
di bawah ini adalah kondisi baseline sebelum dokumentasi audit, bukan perubahan yang
dilakukan Tahap 1.

- Backend route/logic: `backend/internal/handlers/work_report.go`,
  `internship.go`, `manager.go`, `report.go`, `dashboard_charts.go`, dan `rules.go`.
- Backend contract/schema/migration: `backend/internal/models/models.go`,
  `backend/internal/models/work_report_contract.go`, `backend/config/database.go`,
  dan `backend/migrations/20261002_work_report_compatibility.sql`.
- Backend test: `work_report_status_test.go`, `work_report_compliance_test.go`,
  `work_report_delete_test.go`, `work_report_validation_test.go`, dan
  `internal/models/work_report_contract_test.go`.
- Frontend contract/service: `core/services/work-report.service.ts`,
  `core/utils/work-report-contract.ts`, `core/utils/report-completeness.ts`,
  `core/services/report-export.service.ts`, dan `core/services/notification.service.ts`.
- Frontend employee/MAGANG: `features/employee/work-report/`,
  `features/intern/intern-logbook/`, `features/intern/intern-dashboard/`, dan
  `app.routes.ts`.
- Frontend manager/admin/dashboard: `features/manager/team-reports/`,
  `features/admin/work-report-admin/`, `features/admin/admin-dashboard/`, dan
  `features/shared/dashboard-charts/`.
- Frontend test: contract utility, employee work-report, legacy intern-logbook,
  manager team-reports, admin work-report, dan dashboard-related specs yang sudah
  terdaftar pada baseline.
- UAT/reference: `docs/Dokumen Pengujian UAT Sistem Absensi Golan Digital Kreatif.md`.

## Keputusan gate tahap berikutnya

Tahap yang terdampak dan harus menunggu desain/implementasi terarah:

1. **Tahap 2**: satukan field aktif ke **Judul Tugas** dengan adapter baca/tulis
   backward-compatible; jangan menghapus `judul`/`tugas`.
2. **Tahap 3**: rancang repair Draft MAGANG berdasarkan kriteria pemulihan di atas;
   wajib backup, dry-run, audit log, idempotensi, ownership test, dan conflict test.
3. **Tahap 4–5**: buat satu normalizer backend dan satu normalizer frontend yang
   memetakan marker/row kosong ke `no_report`, mengecualikan no-report dari Pending,
   chart workflow, dan review.
4. **Tahap 6–8**: setelah contract status stabil, samakan tabel, detail, label,
   export, chart, kartu, dan notifikasi tanpa mengubah scope fitur lain.
5. **Tahap 9**: UAT empat role masih blocked sampai akun resmi valid, dataset uji,
   lingkungan, dan bukti endpoint/layar tersedia.

Tidak ada implementasi lanjutan yang dianggap aman hanya berdasarkan tombol frontend,
unit test yang ada, atau dokumen UAT tanpa bukti eksekusi aktual.

## Hasil Implementasi Tahap 2 — Satukan field menjadi Judul Tugas

Implementasi dilanjutkan setelah audit baseline dan tetap mempertahankan kolom,
endpoint, event, migration, serta data legacy. Field canonical baru yang additive
adalah `work_reports.judul_tugas` dengan ukuran `VARCHAR(513)`. Nilai ini tidak
menimpa `judul` atau `tugas`.

### Kontrak adapter

- `judul_tugas` menjadi field payload, response, form, tabel, detail, pencarian, dan
  export canonical.
- Jika kedua field lama terisi, adapter menggabungkan nilai secara deterministik
  dengan separator ` — `: `judul — tugas`.
- Jika hanya satu field lama terisi, adapter menggunakan field tersebut.
- Pembacaan legacy dilakukan oleh adapter backend
  `CombineWorkReportTitleTask`/`NormalizeContract` dan adapter frontend
  `canonicalWorkReportTitle`.
- Payload canonical hanya menulis `judul_tugas`, sehingga nilai mentah `judul` dan
  `tugas` pada record lama tetap utuh. Payload client lama tetap dapat dibaca dan
  ditulis melalui compatibility mapping.

### Area yang diperbarui

- Backend model, response contract, parser input, create/update canonical, dan
  endpoint compatibility MAGANG.
- Migration `20261003_work_report_judul_tugas.sql` dan startup migration dibuat
  additive, memakai `IF NOT EXISTS`, dan backfill hanya mengisi `judul_tugas` yang
  masih kosong.
- Form aktif employee dan MAGANG, tabel/detail admin, role operations, manager,
  filter/search, CSV/XLS/JSON/PDF/print, serta response service memakai **Judul
  Tugas**.
- Test adapter backend/frontend dan test handler canonical-versus-legacy ditambahkan.

### Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `go test -count=1 ./...` dari `backend/` | Lulus |
| `npm test -- --watch=false --browsers=ChromeHeadless` dari `frontend/` | Lulus, `114 SUCCESS` |
| `npm run build` dari `frontend/` | Lulus; hanya warning budget SCSS/dependensi CommonJS yang sudah ada |
| Pencarian sisa dua kolom aktif `Tugas`/`Judul Golan` pada area laporan | Tidak ditemukan; field lama hanya dipertahankan pada adapter/fixture/endpoint compatibility |

UAT akun nyata, verifikasi backup database, dan validasi migration pada database
produksi belum dijalankan. Pemulihan record `legacy_logbook` Draft MAGANG juga
belum dilakukan pada tahap ini; tidak ada konversi massal data legacy.

## Hasil Implementasi Tahap 3 — Pemulihan Draft MAGANG

### Strategi yang dipilih

Dipilih strategi **repair-on-write melalui endpoint canonical**, bukan migration
massal. Record tidak diubah ketika hanya dibaca. Pada saat owner MAGANG yang sah
melakukan Edit atau menyimpan melalui endpoint canonical, record hanya dapat
dipulihkan jika memenuhi seluruh pemeriksaan berikut:

- `report_kind = legacy_logbook` dan `status_logbook = draft`;
- actor ber-role `MAGANG` dan ownership employee cocok dengan token;
- tidak ada `reviewed_by`, `reviewed_at`, `review_notes`, status validasi,
  rejection reason, atau metadata penolakan;
- bukan marker `tidak membuat laporan kerja` dan tidak pernah divalidasi HR.

Jika lolos, handler mengubah discriminator menjadi `work_report` secara
idempotent, mempertahankan ID, owner, tanggal, isi, attachment, custom field,
snapshot, field legacy, `status_logbook`, dan audit history. Perubahan dicatat
melalui `LogAction` dengan pesan pemulihan. Record legacy submitted, approved,
rejected, atau Draft yang sudah memiliki metadata review tetap ditolak pada
endpoint canonical dan tetap tersedia melalui compatibility read path.

### Authorization dan alur UI

- `UpdateWorkReport` dan `DeleteWorkReport` memverifikasi ownership backend
  terlebih dahulu. User lain menerima penolakan meskipun dapat melihat atau
  memanipulasi tombol frontend.
- Draft legacy owner MAGANG dapat memakai endpoint canonical untuk Edit dan
  Hapus. Penghapusan tetap melalui child-first cleanup dan tabel audit deletion
  yang sudah ada.
- Laporan MAGANG baru tetap dibuat dengan `report_kind = work_report`.
- UI employee menampilkan aksi Edit/Hapus untuk Draft legacy saja; Submitted,
  Approved, dan Rejected tetap view-only. Guard ini hanya UX; keputusan final
  tetap berada di backend.

### Test yang ditambahkan atau diperbarui

- Backend menguji ownership, role, status Draft/Submitted/Approved/Rejected,
  `report_kind`, metadata review, marker missing, jalur mutation canonical,
  delete child-first, dan preservasi field historis.
- Frontend menguji state Draft legacy dapat memakai aksi Edit/Hapus, sedangkan
  histori legacy terminal tetap view-only.

Tidak ada migration repair massal dan tidak ada perubahan record database selama
implementasi atau pengujian. Backup database produksi dan UAT akun nyata tetap
menjadi gate operasional sebelum deployment.

## Hasil Implementasi Tahap 4 — Status canonical `no_report`

Status kelengkapan laporan sekarang memiliki satu kontrak bersama:

- kode `no_report` dengan label **Belum Membuat Laporan Kerja**;
- bukan `draft`, `submitted`, `approved`, `rejected`, `pending`, atau `review`;
- tidak memiliki aksi Edit, Hapus, Submit, Approve, atau Reject.

### Mapper bersama

- Backend memakai `models.CanonicalWorkReportStatus` dan
  `models.IsWorkReportNoReport`. Mapper mengenali marker
  `status_sesuai = "tidak membuat laporan kerja"`, record kosong/tanpa isi,
  serta state hasil turunan yang relevan tanpa mengubah data tersimpan.
- Frontend memakai `normalizeWorkReportContract` sebagai satu normalizer.
  Input `missing`, `no_report`, completion state, `has_report = false`, marker,
  dan record tanpa isi seluruhnya menghasilkan status serta filling/review
  state `no_report`.
- `missing_work_reports`, compliance, kartu pending, dan chart mengirim atau
  menampilkan kode/label canonical. Query pending mengecualikan marker dan
  record kosong, sehingga no-report tidak masuk inbox review.

### Authorization dan tampilan

- Backend Update, Delete, Create pada record tanggal yang sudah menjadi
  `no_report`, serta review Manager, menolak aksi workflow secara eksplisit.
  Keputusan ini tidak bergantung pada tombol frontend.
- Employee, Manager, Admin, role operations, detail, export, dan chart memakai
  label **Belum Membuat Laporan Kerja**. Aksi review/mutasi tidak tersedia untuk
  state tersebut; data historis tetap dapat dibaca.
- Tidak ada migration atau backfill massal pada tahap ini. Kolom legacy,
  endpoint compatibility, event, data historis, dan audit history tetap utuh.

### Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `go test -count=1 ./...` dari `backend/` | Lulus |
| `npm test -- --watch=false --browsers=ChromeHeadless` dari `frontend/` | Lulus, `118 SUCCESS` |
| `npm run build` dari `frontend/` | Lulus; warning hanya budget SCSS/dependensi CommonJS |
| Contract test marker, record kosong, missing response, dan laporan berisi | Lulus pada model/handler, employee, manager, admin, dan utilitas frontend |

UAT akun nyata, verifikasi backup database, dan pengujian endpoint pada dataset
produksi belum dijalankan.

## Tahap 5 — Perbaikan query pending, chart, dan kartu statistik

### Implementasi

- `workReportPendingCondition` menjadi kondisi bersama untuk badge/query
  pending. Kondisi tersebut mengecualikan marker
  `status_sesuai = "tidak membuat laporan kerja"`, record kosong, dan state
  `no_report`; `no_report` tidak dihitung sebagai Submitted, Approved,
  Rejected, atau Menunggu Review.
- Filter status admin untuk Submitted, Approved, dan Rejected juga memakai
  pengecualian `no_report`. Draft tidak dipaksa masuk chart workflow aktif.
- Chart `report_status` aktif memakai tepat empat bucket: **Belum Membuat
  Laporan Kerja**, Menunggu Review, Disetujui, dan Ditolak. Bucket Draft hanya
  dipertahankan pada payload/dashboard legacy yang memang menampilkannya.
  Adapter legacy tetap satu baris sumber dan tidak menggandakan agregasi.
- Statistik internship menghitung tanggal laporan secara distinct dan
  mengecualikan marker/record kosong. Daftar peringatan tetap dibatasi pada
  baris terbaru untuk kompatibilitas, sedangkan kartu admin memakai jumlah
  karyawan distinct melalui `missing_work_report_employee_count`; alias count
  lama tetap tersedia.
- Label aktif dan warna chart dinormalisasi ke **Belum Membuat Laporan Kerja**.
  Unit kartu dinyatakan sebagai Karyawan, bukan jumlah baris reminder.

### Verifikasi Tahap 5

| Pemeriksaan | Hasil |
|---|---|
| Kombinasi tanpa laporan, Draft, Submitted, Approved, Rejected, dan marker legacy | Dicakup contract test backend |
| Pending dan filter status admin | Marker/record kosong dikecualikan oleh kondisi bersama |
| Chart workflow aktif | Empat bucket canonical dan test warna frontend |
| Kartu missing report | Jumlah karyawan distinct dipisahkan dari daftar reminder |

Perintah test dan build terakhir dijalankan setelah perubahan tahap ini; UAT
akun nyata dan verifikasi dataset produksi tetap memerlukan lingkungan deployment.

## Tahap 6 — Perbaikan tabel Daftar Laporan Masuk admin

### Implementasi

- Perapian dilakukan hanya pada template dan SCSS scoped
  `work-report-admin-page`; query, payload, data, dan handler aksi tidak
  diubah.
- Tabel memakai lebar minimum eksplisit untuk seluruh 22 kolom, header dengan
  tinggi, padding, line-height, warna latar, dan vertical alignment yang
  konsisten, serta wrapping aman untuk **Belum Membuat Laporan Kerja** dan
  catatan panjang.
- Wrapper tabel mempertahankan overflow horizontal terisolasi pada 1920px,
  1366px, 1024px, 768px, dan 390px. Tabel tidak memaksa halaman atau card
  melebar di luar viewport.
- Kolom **Alasan Penolakan** diberi lebar minimum dan separator visual.
  Kolom **Aksi & Validasi** diberi separator yang lebih tegas, ruang internal,
  dan layout kontrol vertikal agar tombol detail serta select validasi tidak
  tertutup atau menyatu dengan kolom sebelumnya.
- Tidak ada perubahan CSS global.

### Verifikasi Tahap 6

| Pemeriksaan | Hasil |
|---|---|
| Header, wrapping, padding, line-height, dan vertical alignment | Ditetapkan pada style scoped tabel admin |
| Alasan Penolakan dan Aksi & Validasi | Memiliki lebar minimum, separator, dan spacing terpisah |
| Viewport 1920px, 1366px, 1024px, 768px, 390px | Layout memakai horizontal scroll terisolasi pada layar sempit |
| Behavior aksi, data, query, dan payload | Tidak diubah |

## Tahap 7 — Penyamaan employee, manager, admin, detail, dan notifikasi

### Implementasi

- Employee, Manager, Admin, layar detail, badge, filter, sorting, dan export
  membaca status melalui kontrak `normalizeWorkReportContract`. State
  `no_report` selalu memakai label **Belum Membuat Laporan Kerja** dan tidak
  diperlakukan sebagai Submitted, Menunggu Review, Menunggu, atau Diajukan.
- Guard aksi tetap berada di jalur backend dan frontend hanya menjadi
  representasi UI: no-report tidak memiliki aksi edit, hapus, submit,
  approve, reject, atau review. Draft legacy yang memenuhi aturan tetap
  mengikuti jalur pemulihan yang sudah ada.
- Export PDF/print memberi warna netral untuk no-report, sehingga tidak
  tampak sebagai status pending. Export historis logbook tetap tersedia sebagai
  adapter kompatibilitas.
- Layar `InternLogbookComponent` dipertahankan untuk kompatibilitas internal,
  tetapi label dan validasinya juga memakai normalizer canonical. Route
  `/intern/logbooks` tetap redirect ke `/employee/work-report`.
- Notifikasi workflow tetap memakai event yang ada. Backend tidak membuat
  notifikasi review untuk no-report karena aksi workflow pada state tersebut
  ditolak; event legacy dan endpoint compatibility tidak dihapus.

### Verifikasi Tahap 7

| Pemeriksaan | Hasil |
|---|---|
| Employee, Manager, Admin, detail, dan role operations | Memakai status/label canonical; no-report netral dan tanpa aksi workflow |
| Export CSV/Excel/PDF/print | Label **Belum Membuat Laporan Kerja** dipertahankan dan styling export netral |
| Route legacy `/intern/logbooks` | Redirect tetap menuju `/employee/work-report` |
| Endpoint, migration, event, dan histori legacy | Tetap tersedia; tidak ada penghapusan atau backfill massal |
| Frontend unit/contract test | Lulus, `122 SUCCESS` |

## Tahap 8 — Perbaikan export CSV, Excel, PDF, JSON, dan print

### Audit dan implementasi

- Pemanggil export aktif employee, MAGANG, Manager, Admin, dan role
  operations tetap memakai dataset yang dibatasi oleh scope endpoint masing-masing.
  Admin tidak menerima Draft; Manager menyaring Draft dan menghapus duplikasi ID
  pada dataset export; ownership tetap ditegakkan backend untuk employee.
- Row builder CSV, Excel, PDF, dan print memakai label dari normalizer/tabel:
  **Belum Membuat Laporan Kerja**, Draft, Submitted/Menunggu, Disetujui, dan
  Ditolak sesuai role. Kolom judul selalu bernama **Judul Tugas** dan memakai
  adapter `judul_tugas` dengan fallback `judul`/`tugas` tanpa mengubah data mentah.
- JSON kini memuat `status`, `status_canonical`, `filling_status_canonical`,
  `review_status_canonical`, `report_kind`, `submission_timing`,
  `status_pengisian`, dan `status_validasi`. Field mentah lama dipindahkan ke
  nama `legacy_*` agar `status_laporan` atau marker lama tidak disalahbaca
  sebagai status tampilan canonical.
- Adapter export terpusat berada pada
  `frontend/src/app/core/utils/work-report-export.ts`. Endpoint, pagination,
  event, dan data histori legacy tidak dihapus.

### Verifikasi Tahap 8

| Pemeriksaan | Hasil |
|---|---|
| Fixture Draft, Submitted, Approved, Rejected, no-report, Judul Tugas legacy, dan legacy_logbook | Contract test export lulus |
| CSV/Excel/PDF/print | Menggunakan row builder canonical yang sama per role |
| JSON | Status canonical tersedia; field raw legacy diberi nama `legacy_*` |
| Filter, scope, pagination, dan duplikasi | Dataset export mengikuti filter/scope; Draft dan duplikasi Manager dikeluarkan |
| Frontend unit/contract test | Lulus, `125 SUCCESS` |
| Frontend build | Lulus; warning hanya budget SCSS/dependensi CommonJS yang sudah ada |

## Tahap 9 — UAT akun nyata dan permission

### Status: **BLOCKED**

UAT interaktif empat role belum dapat dijalankan karena akun resmi valid untuk
Karyawan, MAGANG, MANAJER, dan HRD/Admin belum tersedia pada sesi ini. Tidak ada
password production yang dibuat, diubah, atau ditebak. Build dan unit test tidak
dianggap sebagai pengganti UAT akun nyata.

### Pemeriksaan tanpa login

| Endpoint | Hasil |
|---|---|
| `GET /api/v1/work-reports` tanpa token | Ditolak `HTTP 401` |
| `GET /api/v1/manager/team/reports` tanpa token | Ditolak `HTTP 401` |

### Skenario yang masih menunggu kredensial resmi

| Skenario | Status |
|---|---|
| Tambah laporan dengan satu field **Judul Tugas** | Blocked — perlu akun Karyawan/MAGANG |
| Edit Draft dan verifikasi nilai tersimpan | Blocked — perlu akun pemilik |
| MAGANG edit/hapus Draft miliknya | Blocked — perlu akun MAGANG resmi |
| Edit/hapus laporan milik user lain | Blocked — perlu dua akun dan ID laporan uji |
| Tampilan **Belum Membuat Laporan Kerja** | Blocked — perlu sesi role nyata |
| Pending, chart workflow, dan Menunggu Review | Blocked — perlu dataset UAT |
| Tabel Admin tanpa benturan kolom | Blocked — perlu sesi HRD/Admin dan viewport browser |
| Export CSV, Excel, PDF, JSON, dan print | Blocked — perlu verifikasi file hasil unduhan |
| Pembacaan legacy history | Blocked — perlu record legacy yang disetujui untuk UAT |
| Ownership lintas user dan endpoint tanpa token | Tanpa token terverifikasi; lintas ownership blocked |

### Tindak lanjut resmi

UAT dapat dilanjutkan setelah pemilik sistem menyediakan akun sementara resmi
untuk empat role, data uji Draft/no-report/legacy, serta persetujuan penggunaan
dataset UAT. Setelah itu setiap skenario harus dicatat dengan waktu, role,
endpoint, ID data uji, hasil aktual, dan bukti screenshot/file export.
