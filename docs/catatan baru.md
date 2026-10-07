# Rencana Prompt Bertahap

## Migrasi Logbook Magang menjadi Laporan Kerja

Dokumen ini berisi prompt yang dapat diberikan kepada agent pengembang secara berurutan. Tujuannya adalah mengubah seluruh pengalaman dan alur laporan user `MAGANG` dari **Logbook** menjadi **Laporan Kerja**, lalu menggabungkannya ke halaman admin **Manajemen Laporan Kerja** seperti laporan user `Karyawan` dan `MANAJER`.

Jalankan satu tahap sampai selesai dan terverifikasi sebelum menjalankan tahap berikutnya. Jangan mengerjakan seluruh tahap dalam satu perubahan besar.

## Konteks proyek yang wajib diperiksa

Audit awal menunjukkan beberapa bagian yang kemungkinan terlibat:

- Frontend Angular: `frontend/src/app/app.routes.ts`.
- Halaman magang saat ini: `features/intern/intern-logbook/`.
- Halaman laporan kerja karyawan/manajer: `features/employee/work-report/`.
- Halaman admin tujuan: `features/admin/work-report-admin/` dengan judul **Manajemen Laporan Kerja**.
- Operasional admin yang masih terpisah: `features/admin/role-operations/`.
- Sidebar bersama dan sidebar admin: `features/shared/shared-sidebar/` dan `features/admin/admin-sidebar/`.
- Service laporan kerja, export, notifikasi, dan guard permission di `features/core/`.
- Backend laporan kerja: `backend/internal/handlers/work_report.go`.
- Backend operasi magang: `backend/internal/handlers/admin_role_operations.go`.
- Model laporan: `backend/internal/models/models.go`.
- Route lama yang perlu diaudit: `/intern/logbooks` dan `/admin/internship/logbooks`.
- Struktur lama yang perlu diaudit, bukan langsung dihapus: `status_logbook`, event notifikasi logbook, query chart logbook, serta migration/data historis.

Daftar di atas bukan batasan pencarian. Agent tetap wajib mencari seluruh repository, termasuk variasi `logbook`, `log book`, `log-book`, `logbbok`, `Logbook Magang`, `logbook harian`, dan `Laporan Tim / Logbook`.

---

## Prompt Tahap 1 — Audit tanpa Mengubah Kode

> Lakukan audit menyeluruh terhadap semua fitur yang berkaitan dengan logbook user magang dan semua fitur laporan kerja karyawan/manajer. Jangan mengubah kode pada tahap ini.
>
> Petakan minimal: route frontend dan backend, komponen, template, style, service, model, migration, nama tabel/kolom, enum/status, query, filter, pagination, export, upload lampiran, validasi, notifikasi/realtime event, audit log, permission, guard, dashboard chart, sidebar, breadcrumb, modal, seed, fixture, dan test.
>
> Periksa secara khusus route `/intern/logbooks`, `/admin/internship/logbooks`, komponen `intern-logbook`, `work-report`, `work-report-admin`, `role-operations`, `admin-dashboard`, sidebar, `work_report.go`, `admin_role_operations.go`, serta model `WorkReport`.
>
> Bandingkan alur logbook magang dengan alur laporan kerja karyawan dan manajer. Catat perbedaan field, status, aturan edit/hapus, pengajuan, verifikasi, penolakan, notifikasi, kepemilikan data, dan hak akses.
>
> Hasilkan laporan audit yang berisi:
>
> 1. tabel file/fungsi/endpoint yang terdampak;
> 2. diagram atau uraian alur data dari pembuatan sampai verifikasi;
> 3. daftar field dan status lama beserta padanannya pada laporan kerja;
> 4. daftar data historis yang harus dipertahankan;
> 5. risiko perubahan dan potensi regresi;
> 6. urutan perubahan paling aman;
> 7. daftar test yang harus ditambahkan atau diperbarui.
>
> Jangan menyimpulkan bahwa penggantian label sudah cukup. Tunjukkan bagian yang masih menggunakan dua status atau dua alur berbeda.

**Kriteria selesai:** tidak ada perubahan kode; laporan audit lengkap; semua temuan memiliki lokasi file dan alasan dampaknya.

---

## Prompt Tahap 2 — Tetapkan Desain Target dan Kontrak Kompatibilitas

> Berdasarkan hasil audit Tahap 1, tetapkan desain target berikut: user `MAGANG` membuat, menyimpan, mengedit, mengajukan, dan melihat riwayat **Laporan Kerja** dengan pola yang sama atau setara dengan user `Karyawan` dan `MANAJER`; laporan tersebut masuk ke halaman admin **Manajemen Laporan Kerja**.
>
> Gunakan alur laporan kerja karyawan/manajer sebagai sumber acuan utama. Jangan membuat alur logbook baru dengan nama yang hanya diganti.
>
> Tentukan kontrak final untuk:
>
> - field laporan dan field yang sudah tidak dibutuhkan;
> - status draft, diajukan, disetujui, ditolak, dan status pengisian bila memang digunakan;
> - aturan user magang hanya dapat mengakses laporan miliknya;
> - kewenangan manager dan admin/HRD dalam melihat, memverifikasi, menolak, mengedit, atau menghapus;
> - bentuk filter, pagination, detail, lampiran, export, notifikasi, dan audit log;
> - route baru atau route lama yang diarahkan ke halaman baru.
>
> Rancang strategi kompatibilitas data. Data historis logbook tidak boleh hilang. Jika `status_logbook` atau nama teknis lama masih diperlukan untuk membaca data lama, gunakan mapping, adapter, alias, view, atau migration bertahap. Jangan menghapus kolom, tabel, endpoint, atau migration hanya karena namanya mengandung logbook.
>
> Implementasikan hanya fondasi yang diperlukan pada tahap ini, misalnya tipe bersama, mapping status, normalisasi response, atau migration kompatibilitas. Tambahkan test kontrak untuk memastikan data lama tetap dapat dibaca dan laporan baru dapat diproses.

**Kriteria selesai:** desain target terdokumentasi; mapping data/status jelas; keputusan permission jelas; test kompatibilitas tersedia dan lulus.

---

## Prompt Tahap 3 — Samakan Backend Laporan Kerja

> Sesuaikan backend agar laporan kerja user `MAGANG` menggunakan kontrak laporan kerja yang sama atau setara dengan karyawan dan manajer. Prioritaskan reuse handler, model, validasi, service, query, dan response yang sudah stabil.
>
> Pastikan endpoint laporan kerja mendukung role `MAGANG` tanpa melemahkan authorization. Validasi harus dilakukan di backend, bukan hanya dengan menyembunyikan menu frontend. User magang tidak boleh membaca, mengubah, menghapus, atau mengajukan laporan milik user lain.
>
> Integrasikan field magang yang memang masih diperlukan ke dalam bentuk laporan kerja. Jangan mempertahankan field khusus hanya karena UI lama menggunakannya; lakukan pemetaan yang jelas dan pertahankan data historis melalui kompatibilitas.
>
> Pastikan query admin dapat mengambil laporan kerja dari role `Karyawan`, `MANAJER`, dan `MAGANG` tanpa duplikasi, tanpa kehilangan laporan magang, dan tanpa menghitung draft sebagai laporan yang harus diverifikasi jika aturan bisnis tidak mengizinkannya.
>
> Sesuaikan notifikasi, status, audit log, lampiran, pagination, filter tanggal/user/status, serta export agar memakai istilah dan kontrak laporan kerja. Pertahankan route lama hanya jika dibutuhkan untuk kompatibilitas, dan tandai sebagai deprecated atau arahkan ke endpoint baru dengan aman.
>
> Tambahkan/update test backend untuk authorization, validasi, status transition, filter role, data historis, dan response laporan magang.

**Kriteria selesai:** API laporan kerja mendukung magang secara aman; test backend relevan lulus; laporan karyawan/manajer tidak berubah perilakunya.

---

## Prompt Tahap 4 — Ubah Dashboard dan Halaman User Magang

> Ubah dashboard user `MAGANG` dari logbook menjadi laporan kerja secara menyeluruh. Gunakan komponen dan pola halaman `features/employee/work-report/` bila memungkinkan, bukan mempertahankan implementasi logbook terpisah hanya dengan mengganti tulisan.
>
> Perbarui route, nama komponen bila aman, sidebar, judul halaman, breadcrumb, heading, tombol, placeholder, label field, empty state, status, validasi, tooltip, modal, notifikasi, accessibility text, dan pesan error.
>
> Halaman harus mendukung alur yang sama seperti laporan kerja karyawan/manajer: membuat laporan, menyimpan draft, mengedit draft atau laporan yang boleh diedit, mengajukan, melihat status, membuka detail, melihat riwayat, melihat alasan penolakan, dan mengelola lampiran bila fitur tersebut tersedia pada kontrak final.
>
> Pastikan route guard tetap membatasi halaman untuk role `MAGANG`, dan service mengirim identitas/parameter yang benar. Jangan hanya menyembunyikan tabel atau tombol dari frontend.
>
> Setelah implementasi, uji minimal: buka halaman, buat draft, validasi field wajib, simpan, edit, ajukan, lihat status, lihat detail, tangani penolakan, reload halaman, pagination/filter, upload lampiran bila ada, dan tampilan responsif.

**Kriteria selesai:** user magang tidak lagi melihat istilah logbook pada UI aktif; alurnya konsisten dengan laporan kerja; build dan test frontend terkait lulus.

---

## Prompt Tahap 5 — Gabungkan ke Manajemen Laporan Kerja Admin

> Integrasikan seluruh laporan kerja user `MAGANG` ke halaman admin **Manajemen Laporan Kerja**. Jangan membuat halaman verifikasi magang baru jika fungsi yang sama sudah tersedia di `work-report-admin`.
>
> Gunakan komponen, service, query, filter, pagination, detail, lampiran, export, status, verifikasi, penolakan, notifikasi, dan audit log yang sama atau setara dengan laporan kerja karyawan/manajer.
>
> Pastikan admin/HRD dapat:
>
> - melihat laporan dari karyawan, manajer, dan magang;
> - membedakan role/sumber pelapor jika dibutuhkan melalui kolom/filter, bukan melalui halaman logbook terpisah;
> - memfilter user, role, tim/divisi, periode, status, dan kata kunci;
> - membuka detail dan lampiran;
> - memproses aksi sesuai permission dan status;
> - melihat perubahan status dan alasan penolakan;
> - memperoleh hasil export yang tidak menggandakan atau menghilangkan laporan.
>
> Periksa juga dashboard admin, badge jumlah pending, chart, notifikasi, dan refresh realtime. Jangan lagi menggunakan nama `logbook_pending` pada UI aktif; jika nama teknis belum dapat diubah pada tahap ini, buat mapping internal dan dokumentasikan rencana deprecation.
>
> Tambahkan test integrasi/komponen untuk tiga role pelapor dan admin sebagai pemroses laporan.

**Kriteria selesai:** laporan magang muncul di **Manajemen Laporan Kerja**, dapat difilter dan diproses, serta tidak mengganggu laporan karyawan/manajer.

---

## Prompt Tahap 6 — Hapus Duplikasi Fitur Logbook dari Dashboard Admin

> Setelah Tahap 5 lulus, bersihkan dashboard admin dari fitur logbook yang sudah digantikan. Hapus atau alihkan secara aman semua UI dan alur aktif yang duplikat, termasuk:
>
> - `VERIFIKASI LOGBOOK`;
> - `Logbook Magang`;
> - `Laporan Tim / Logbook` jika isinya sudah tercakup oleh laporan kerja;
> - kartu/widget jumlah logbook;
> - shortcut, tab, filter, heading, breadcrumb, modal, tooltip, empty state, dan notifikasi logbook;
> - menu atau route admin yang hanya memiliki fungsi logbook.
>
> Periksa `role-operations`, `admin-dashboard`, sidebar admin, shared sidebar, route, service, export, chart, permission, dan seluruh template/style yang terkait.
>
> Jangan menghapus data historis atau kode yang masih diperlukan oleh adapter kompatibilitas. Untuk route lama yang masih mungkin dibuka dari bookmark, pilih salah satu strategi yang telah disetujui pada Tahap 2: redirect ke **Manajemen Laporan Kerja**, response deprecation yang aman, atau tetap read-only untuk historis. Jangan meninggalkan route yang menuju halaman kosong.

**Kriteria selesai:** dashboard admin hanya memiliki satu alur aktif untuk manajemen laporan kerja; tidak ada menu duplikat atau dead link; data historis tetap dapat ditangani sesuai strategi kompatibilitas.

---

## Prompt Tahap 7 — Bersihkan Istilah dan Kode Aktif

> Lakukan pencarian akhir pada seluruh repository terhadap `logbook`, `log book`, `log-book`, `logbbok`, `logbook harian`, `Logbook Magang`, `Laporan Tim / Logbook`, `status_logbook`, dan event logbook.
>
> Bedakan dua kategori hasil pencarian:
>
> 1. referensi UI/logika aktif yang wajib diubah menjadi laporan kerja;
> 2. referensi migration, data historis, adapter, alias, atau dokumentasi kompatibilitas yang boleh dipertahankan dan harus diberi komentar yang jelas.
>
> Perbarui nama tampilan, translation key, konstanta, label status, komentar, dokumentasi pengguna, test, seed, pesan error, dan nama CSS/class yang aktif bila perubahan nama tidak merusak selector atau import. Hindari rename massal tanpa memeriksa route, import, relasi, query, response API, dan permission.
>
> Pastikan tidak ada referensi frontend ke endpoint yang sudah dihapus, route tanpa handler, handler tanpa pemanggil, query ke kolom yang tidak tersedia, menu kosong, status yang tidak punya label, atau notifikasi yang tidak punya penerima.

**Kriteria selesai:** pencarian ulang hanya menemukan referensi historis/kompatibilitas yang sudah dijelaskan, bukan fitur logbook aktif yang seharusnya sudah diganti.

---

## Prompt Tahap 8 — Verifikasi, UAT, dan Laporan Akhir

> Jalankan verifikasi menyeluruh sesuai toolchain proyek: format/lint, static analysis, unit test, component test, integration test, migration check, build backend, dan build frontend. Jangan melewati error dengan menonaktifkan test atau menambahkan pengecualian tanpa alasan.
>
> Lakukan smoke test untuk role `MAGANG`, `Karyawan`, `MANAJER`, dan `HRD` dengan skenario minimal:
>
> 1. magang membuka halaman Laporan Kerja;
> 2. magang membuat dan menyimpan draft;
> 3. magang mengajukan laporan;
> 4. laporan tampil pada Manajemen Laporan Kerja admin;
> 5. admin memfilter berdasarkan role/status/periode dan membuka detail;
> 6. admin memproses laporan sesuai permission;
> 7. status, alasan penolakan, notifikasi, dan audit log berubah benar;
> 8. magang hanya dapat melihat laporan miliknya;
> 9. alur laporan kerja karyawan dan manajer tetap berjalan;
> 10. route lama tidak menyebabkan 404 yang tidak direncanakan atau akses tanpa authorization;
> 11. tidak ada istilah logbook pada UI aktif.
>
> Buat laporan akhir yang mencantumkan file yang berubah, migration yang dijalankan, mapping data historis, route/API yang ditambah atau dialihkan, perubahan permission, test yang dijalankan beserta hasilnya, temuan yang belum selesai, dan langkah rollback yang aman.
>
> Jangan menyatakan pekerjaan selesai apabila build gagal, ada test kritis yang gagal, laporan magang tidak muncul di Manajemen Laporan Kerja, atau masih ada akses logbook aktif yang tidak sengaja dipertahankan.

---

## Aturan Wajib untuk Semua Tahap

- Kerjakan satu tahap per perubahan terukur. Tampilkan file yang diubah dan alasan setiap perubahan.
- Jadikan laporan kerja karyawan/manajer sebagai acuan perilaku dan komponen.
- Lakukan authorization di backend; menyembunyikan menu frontend saja tidak cukup.
- Jangan menghapus data historis, kolom, migration, endpoint, atau event sebelum dampaknya diuji dan strategi kompatibilitas tersedia.
- Jangan mengganti nama teknis secara massal tanpa memeriksa seluruh pemakaiannya.
- Setelah setiap tahap, jalankan test yang relevan dan laporkan hasilnya sebelum lanjut.
- Jika kode aktual berbeda dari asumsi prompt, hentikan bagian yang terdampak, jelaskan perbedaannya, dan sesuaikan rencana berdasarkan hasil audit.
- Perubahan label harus konsisten dalam bahasa Indonesia: gunakan **Laporan Kerja**, bukan campuran `Logbook`, `Logbook Harian`, atau `Laporan Tim / Logbook`.
- Jangan mengubah fitur lain yang tidak berkaitan dengan migrasi ini.

---

# Prompt Lanjutan — Penyelesaian Status, Dashboard, Export, dan UAT

Bagian ini dijalankan setelah Tahap 8. Fokusnya hanya pada empat temuan yang masih tersisa:

- status **Belum Membuat Laporan Kerja** belum konsisten;
- chart dan kartu statistik belum sepenuhnya sesuai;
- status pada export masih perlu diperbaiki;
- UAT dengan akun nyata belum selesai.

Jangan mengulang migrasi data atau menghapus compatibility route. Kerjakan tahap lanjutan satu per satu.

## Prompt Tahap Lanjutan 1 — Audit Baseline dan Definisi Status

> Audit kondisi repository setelah Tahap 8 tanpa mengubah kode. Fokuskan audit pada status laporan yang tidak memiliki isi.
>
> Petakan seluruh penggunaan status berikut pada backend, frontend, query, chart, kartu statistik, tabel, detail, notifikasi, dan export:
>
> - `draft`;
> - `submitted`/`diajukan`;
> - `approved`/`disetujui`;
> - `rejected`/`ditolak`;
> - `tidak membuat laporan kerja`;
> - status `no_report` atau padanan lainnya.
>
> Tetapkan definisi berikut dan dokumentasikan sebelum mengubah kode:
>
> - **Draft**: laporan sedang disusun dan belum diajukan;
> - **Menunggu Review**: laporan memiliki isi dan sudah diajukan, tetapi belum diverifikasi;
> - **Disetujui**: laporan memiliki isi dan sudah disetujui;
> - **Ditolak**: laporan memiliki isi dan ditolak, beserta alasan penolakan;
> - **Belum Membuat Laporan Kerja**: user wajib membuat laporan pada tanggal tersebut, tetapi belum memiliki isi laporan.
>
> Status **Belum Membuat Laporan Kerja** tidak boleh dihitung sebagai Pending, Draft, Submitted, atau Ditolak. Tentukan apakah status ini menjadi status canonical terpisah atau completion state terpisah yang dipakai bersama. Pilih satu pendekatan dan gunakan konsisten di seluruh aplikasi.
>
> Catat file yang akan diubah, query yang terdampak, risiko duplikasi data, dan test yang harus dibuat. Jangan mengubah data atau kode pada tahap ini.

**Kriteria selesai:** definisi status disetujui; matriks mapping lama-ke-baru tersedia; baseline test dan daftar file terdampak terdokumentasi.

## Prompt Tahap Lanjutan 2 — Perbaiki Kontrak dan Mapping Status

> Implementasikan kontrak status yang telah disetujui pada tahap sebelumnya.
>
> Buat satu fungsi mapping bersama di backend dan satu fungsi normalisasi bersama di frontend. Keduanya harus mengenali marker `tidak membuat laporan kerja`, data kosong yang memang berarti belum membuat laporan, data legacy, serta status canonical.
>
> Pastikan hasil mapping untuk laporan tanpa isi adalah:
>
> - status tampilan: **Belum Membuat Laporan Kerja**;
> - kelas visual khusus, bukan kelas Pending/Draft/Ditolak;
> - tidak dapat diverifikasi atau ditolak;
> - tidak dapat diedit sebagai laporan yang sudah diajukan;
> - tetap dapat ditindaklanjuti dengan membuat laporan baru pada tanggal yang sesuai, jika aturan bisnis mengizinkan.
>
> Pertahankan nilai teknis lama untuk histori. Jangan menimpa data historis hanya untuk mengganti label.
>
> Tambahkan test unit untuk seluruh kombinasi status: draft, submitted berisi, approved, rejected, marker tanpa isi, legacy logbook, dan data kosong historis.

**Kriteria selesai:** seluruh consumer menggunakan mapping bersama; tidak ada consumer yang menerjemahkan marker belum membuat laporan sebagai Pending, Draft, Submitted, atau Ditolak.

## Prompt Tahap Lanjutan 3 — Perbaiki Backend, Query Pending, dan Endpoint

> Sesuaikan backend berdasarkan kontrak status baru.
>
> Perbaiki seluruh query pending, termasuk badge admin, dashboard statistik, inbox Manajemen Laporan Kerja, query manager, query compliance, dan query chart. Kondisi `tidak membuat laporan kerja`/`no_report` wajib dikeluarkan dari Pending.
>
> Tambahkan response yang jelas untuk data belum membuat laporan, minimal berupa status canonical/completion state, label display bila diperlukan, tanggal, employee/user, dan alasan bahwa laporan belum dibuat.
>
> Pastikan filter endpoint membedakan minimal `draft`, `submitted`, `approved`, `rejected`, dan `no_report`. Jika filter `no_report` hanya boleh berasal dari endpoint admin, tegakkan permission tersebut di backend.
>
> Pastikan:
>
> - marker belum membuat laporan tidak dapat direview;
> - marker belum membuat laporan tidak menghasilkan notifikasi verifikasi;
> - laporan tanpa isi tidak dihitung sebagai laporan selesai;
> - laporan tanpa isi tidak menggandakan laporan pada tanggal yang sama;
> - ownership dan scope manager tetap aman;
> - data legacy tetap dapat dibaca.

> Tambahkan test query/predicate untuk membuktikan bahwa data `no_report` tidak masuk Pending, Approved, Rejected, atau Draft.

**Kriteria selesai:** response dan query backend memisahkan `no_report` dari status workflow; test authorization dan status lulus.

## Prompt Tahap Lanjutan 4 — Perbaiki Halaman User, Manager, dan Admin

> Gunakan normalizer frontend bersama pada halaman:
>
> - `features/employee/work-report/`;
> - `features/manager/team-reports/`;
> - `features/admin/work-report-admin/`;
> - dashboard user dan dashboard admin yang menampilkan status laporan.
>
> Ganti seluruh label yang tidak konsisten menjadi **Belum Membuat Laporan Kerja**. Jangan gunakan variasi `Belum Isi Laporan`, `Belum mengisi`, atau label lain untuk state yang sama.
>
> Untuk state tersebut:
>
> - tampilkan badge khusus **Belum Membuat Laporan Kerja**;
> - jangan tampilkan `Menunggu Review`, `Submitted`, `Draft`, atau `Ditolak`;
> - nonaktifkan aksi review/approve/reject;
> - tampilkan tanggal dan nama user dengan jelas;
> - tampilkan empty/detail state yang informatif;
> - pertahankan perilaku laporan normal untuk Karyawan, Magang, dan Manajer.
>
> Pastikan halaman Magang memakai halaman Laporan Kerja canonical dan tidak mengaktifkan kembali halaman Logbook lama.

> Tambahkan test component untuk setiap role dan setiap state, terutama laporan tanpa isi.

**Kriteria selesai:** user, manager, dan admin melihat label yang sama dan state belum membuat laporan tidak tercampur dengan status lain.

## Prompt Tahap Lanjutan 5 — Perbaiki Chart dan Kartu Statistik

> Perbaiki semua chart dan kartu statistik yang menggunakan data laporan kerja.
>
> Chart status laporan kerja harus memiliki kategori yang jelas dan tidak tumpang tindih, minimal:
>
> - Belum Membuat Laporan Kerja;
> - Menunggu Review;
> - Disetujui;
> - Ditolak;
> - Draft, hanya jika draft memang sengaja ditampilkan pada dashboard yang bersangkutan.
>
> Jangan memasukkan `Belum Membuat Laporan Kerja` ke nilai Pending. Pastikan total chart tidak menghitung satu baris dua kali dan membedakan laporan kosong dari laporan berisi.
>
> Perbarui kartu statistik dengan label **Belum Membuat Laporan Kerja** dan unit yang tepat. Bedakan jumlah laporan dengan jumlah user apabila keduanya berbeda.
>
> Periksa dashboard Karyawan, Magang, Manajer, dan Admin, termasuk data chart kosong, refresh realtime, rentang tanggal, dan fallback response lama.
>
> Tambahkan test untuk nilai chart dan kartu ketika dataset berisi kombinasi laporan normal, draft, laporan ditolak, dan user tanpa laporan.

**Kriteria selesai:** chart dan kartu seluruh dashboard menampilkan kategori yang benar; angka `Pending` tidak mengandung user tanpa laporan.

## Prompt Tahap Lanjutan 6 — Perbaiki Export CSV, Excel, PDF, dan JSON

> Audit seluruh export pada halaman user, manager, dan admin: CSV, Excel, PDF, JSON, dan print.
>
> Pastikan setiap export memakai normalizer status yang sama dengan tampilan tabel. Untuk baris tanpa laporan, kolom status harus berisi persis **Belum Membuat Laporan Kerja**, bukan `Submitted`, `Pending`, `Draft`, atau `Ditolak`.
>
> Pastikan export:
>
> - memakai dataset dan filter yang sedang dipilih;
> - tidak memasukkan draft admin bila aturan inbox tidak mengizinkannya;
> - tidak menggandakan laporan;
> - memuat role pelapor bila export admin membutuhkannya;
> - memuat tanggal, user, status, alasan penolakan, dan lampiran sesuai kontrak;
> - tetap dapat membaca data legacy tanpa menampilkan istilah legacy kepada user aktif.

> Tambahkan test terhadap isi header dan row export untuk semua format yang dapat diuji otomatis. Untuk PDF/print, uji minimal data row yang diberikan ke service sebelum proses rendering.

**Kriteria selesai:** seluruh format export menampilkan status yang sama dengan tabel dan tidak salah mengategorikan user tanpa laporan.

## Prompt Tahap Lanjutan 7 — UAT dengan Akun Nyata

> Siapkan UAT interaktif dengan akun resmi yang valid untuk role `Karyawan`, `MAGANG`, `MANAJER`, dan `HRD/Admin`. Jangan membuat password sementara di production dan jangan memaksa perubahan data user tanpa prosedur resmi.
>
> Gunakan data uji yang aman dan catat identitas data uji, tanggal, serta hasilnya. Uji skenario berikut:
>
> 1. user belum membuat laporan setelah absensi: status terlihat sebagai **Belum Membuat Laporan Kerja**;
> 2. user membuat draft: status berubah menjadi Draft;
> 3. user mengajukan laporan berisi: status berubah menjadi Menunggu Review;
> 4. manager/admin menyetujui: status berubah menjadi Disetujui;
> 5. manager/admin menolak: status berubah menjadi Ditolak dan alasan tampil;
> 6. status pada tabel, dashboard, chart, kartu, notifikasi, dan export konsisten;
> 7. user tidak dapat melihat atau mengubah laporan user lain;
> 8. manager hanya dapat memproses laporan dalam scope-nya;
> 9. admin dapat memfilter dan mengelola laporan tiga role pelapor;
> 10. route lama tidak menjadi entry point aktif dan tidak membuka akses tanpa authorization.

> Simpan bukti UAT berupa screenshot atau log request/response yang tidak membocorkan token/password. Jika kredensial belum tersedia, tandai UAT sebagai blocked dan jangan menyatakan tahap ini lulus.

**Kriteria selesai:** keempat role telah diuji dengan akun valid atau blocker kredensial telah dilaporkan secara resmi.

## Prompt Tahap Lanjutan 8 — Verifikasi Akhir dan Gate Release

> Jalankan ulang `go test -count=1 ./...`, `go vet ./...`, seluruh test frontend, type-check, build frontend, dan `git diff --check`.
>
> Jalankan pencarian final untuk memastikan label state aktif konsisten. Referensi teknis legacy hanya boleh tersisa pada migration, adapter, compatibility route, test, atau dokumentasi yang telah diberi alasan.
>
> Buat laporan akhir yang membandingkan hasil terhadap 13 kebutuhan tambahan, mencantumkan file yang diubah per tahap, test tiap tahap, hasil UAT, blocker, risiko, dan rollback.
>
> Jangan tandai release siap apabila:
>
> - `no_report` masih masuk Pending/Draft/Ditolak;
> - chart/kartu belum menampilkan state yang benar;
> - export berbeda dari tabel;
> - test gagal;
> - UAT akun nyata belum selesai atau belum dinyatakan blocked secara resmi.

**Kriteria selesai:** seluruh status konsisten, automated test lulus, UAT tersedia, dan laporan akhir dapat diaudit.

---

# Prompt Perbaikan Tampilan Desktop 1440×900 dan 1536×864

> Perbaiki layout web agar tampil rapi, proporsional, dan konsisten pada viewport desktop **1440×900** serta **1536×864**. Fokus utama adalah sidebar yang saat ini terlihat aneh/terpotong dan jarak antara sidebar dengan konten utama yang tidak konsisten seperti pada screenshot referensi.

## Konteks masalah

> Screenshot menunjukkan dashboard HRD dengan sidebar kiri, header, kartu statistik, dan grid chart. Audit awal menemukan aturan layout yang berpotensi konflik: komponen sidebar desktop memakai lebar sekitar `238px`, sedangkan beberapa `.main-content` masih memakai `margin-left: 300px` atau `width: calc(100% - 300px)`. Aturan global, style komponen sidebar, dashboard admin, dan media query desktop harus diperiksa sebagai satu sistem.

## Instruksi audit sebelum mengubah kode

> Jangan langsung menambal CSS secara acak. Cari dan petakan semua pemakai `.sidebar`, `.admin-sidebar`, `app-shared-sidebar`, `app-admin-sidebar`, `.main-content`, `.dashboard-container`, `.admin-theme`, `.topbar-header`, serta semua media query yang memengaruhi layout desktop. Periksa juga template Angular yang menjadi parent-child komponen tersebut.
>
> Identifikasi aturan yang saling menimpa, terutama perbedaan antara lebar sidebar aktual dan ruang yang dicadangkan oleh konten utama. Pastikan dahulu apakah halaman HRD pada screenshot menggunakan `shared-sidebar` atau `admin-sidebar`, lalu terapkan solusi pada komponen dan shell yang benar tanpa merusak halaman role lain.

## Target layout desktop

> Gunakan satu sumber nilai layout bersama, misalnya CSS custom property pada shell/global style:
>
> - `--desktop-sidebar-width`: lebar sidebar desktop yang benar-benar dipakai;
> - `--desktop-content-gap`: jarak aman antara sidebar dan konten;
> - `--desktop-content-padding`: padding konten utama.
>
> Nilai tersebut harus digunakan konsisten untuk `width`, `margin-left`, `padding`, dan kalkulasi area konten. Jangan menyisakan kombinasi angka `238px` dan `300px` yang membuat ruang kosong besar, konten bergeser, atau sebagian layout terpotong.
>
> Pada lebar 1440px dan 1536px:
>
> - sidebar tetap berada di kiri, memiliki tinggi viewport, tidak menimpa konten, dan tidak terpotong secara horizontal;
> - lebar sidebar stabil dan seluruh label menu tetap terbaca;
> - konten utama dimulai tepat setelah sidebar dan padding yang ditentukan;
> - tidak ada horizontal scrollbar pada `html`, `body`, shell dashboard, atau konten utama;
> - header, kartu statistik, dan chart tidak melebar keluar viewport;
> - sisa ruang pada baris grid dimanfaatkan secara seimbang, bukan menghasilkan kolom kosong yang janggal;
> - halaman boleh melakukan scroll vertikal secara normal jika isi lebih tinggi dari viewport;
> - sidebar boleh memiliki scroll internal jika menu lebih panjang dari tinggi layar, tetapi scrollbar tidak boleh membuat lebar layout berubah-ubah;
> - gunakan `box-sizing: border-box`, `min-width: 0`, dan `overflow-wrap` pada elemen flex/grid yang diperlukan.

## Perbaikan sidebar

> Rapikan sidebar agar proporsinya sesuai dashboard pada screenshot:
>
> - tetapkan satu lebar desktop yang realistis dan gunakan nilai yang sama pada sidebar serta offset konten;
> - jangan mengandalkan `width: 100vw` pada elemen yang berada di dalam shell desktop;
> - pastikan `position: fixed`, `top`, `bottom`, `height`, `overflow-y`, `z-index`, border, dan box sizing tidak menyebabkan sidebar keluar frame;
> - atur padding, jarak antar menu, tinggi item, ukuran icon, ukuran teks, badge notifikasi, role badge, dan tombol mode gelap agar tidak bertabrakan;
> - label menu panjang harus tetap terbaca atau dipotong dengan cara yang disengaja, bukan keluar dari sidebar;
> - state aktif harus memiliki indikator yang konsisten tanpa menambah lebar elemen secara tak terduga;
> - pastikan sidebar tidak ikut memakai aturan mobile drawer pada viewport 1440×900 atau 1536×864;
> - pertahankan perilaku drawer/hamburger pada breakpoint mobile yang sudah ada.

## Perbaikan konten dashboard

> Sesuaikan shell dan dashboard tanpa mengubah fungsi, data, route, permission, atau API:
>
> - hapus aturan duplikat atau konflik pada `.main-content`, terutama `margin-left` dan `width` lama;
> - gunakan `flex: 1` dengan `min-width: 0` setelah offset sidebar ditetapkan;
> - pastikan padding konten cukup tetapi tidak menghabiskan lebar efektif pada 1440px;
> - kartu statistik menggunakan grid yang responsif terhadap lebar konten, dengan minimum width yang tidak memaksa overflow;
> - grid chart menggunakan `minmax(0, 1fr)` dan setiap card memiliki `min-width: 0`;
> - judul halaman, notifikasi, filter, legenda, tabel, dan tombol tidak saling bertumpuk;
> - komponen chart harus resize mengikuti parent dan tidak menentukan lebar berdasarkan viewport penuh;
> - jangan menggunakan `transform: scale()` sebagai solusi layout;
> - jangan menyembunyikan elemen penting hanya untuk menghilangkan overflow.

## Kriteria visual

> Hasil akhir harus mempertahankan identitas visual aplikasi, tetapi terasa lebih seimbang: sidebar tidak terlalu lebar atau menyisakan ruang kosong, konten dashboard memenuhi area yang tersedia, kartu memiliki ukuran konsisten, dan jarak antar-section seragam. Perbaiki akar masalah layout, bukan hanya menambahkan margin negatif atau `overflow: hidden`.

## Verifikasi wajib

> Setelah perubahan:
>
> 1. Jalankan build, lint/type-check, dan test frontend yang relevan.
> 2. Buka dashboard HRD pada viewport tepat **1440×900**.
> 3. Buka dashboard HRD pada viewport tepat **1536×864**.
> 4. Uji zoom browser 100% dan pastikan hasilnya tidak bergantung pada zoom tertentu.
> 5. Periksa tidak ada horizontal scrollbar dan tidak ada elemen yang terpotong.
> 6. Uji sidebar ketika menu aktif, badge notifikasi tampil, mode gelap aktif, dan daftar menu lebih tinggi dari viewport.
> 7. Uji navigasi ke halaman lain yang memakai sidebar bersama untuk memastikan offset konten tetap benar.
> 8. Uji viewport mobile yang sudah didukung agar drawer/hamburger tidak rusak.
> 9. Jika tersedia, ambil screenshot kedua viewport dan bandingkan dengan screenshot referensi.

## Output yang wajib dilaporkan

> Laporkan file yang diubah, aturan CSS yang menjadi sumber konflik, nilai akhir lebar sidebar/padding/breakpoint, hasil build/test, serta hasil pemeriksaan viewport 1440×900 dan 1536×864. Jangan menyatakan selesai jika masih ada horizontal overflow, sidebar terpotong, konten tertutup sidebar, atau perbedaan offset antarhalaman.

## Batasan

> Perubahan pada tahap ini hanya untuk layout dan visual responsif desktop. Jangan mengubah endpoint, model, database, alur absensi, permission, isi data, atau fitur bisnis lain. Jika ditemukan perbedaan antara screenshot dan implementasi aktual, jelaskan temuan tersebut sebelum mengambil keputusan yang memengaruhi struktur komponen.
