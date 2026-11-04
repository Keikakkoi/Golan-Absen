# Prompt Bertahap — Fitur Lokasi Alternatif dan Lokasi Lapangan

Gunakan bagian ini sebagai prompt implementasi bertahap untuk menambahkan fitur
**Lokasi Alternatif** dan **Lokasi Lapangan**. Kerjakan satu tahap dalam satu
waktu. Jangan melanjutkan ke tahap berikutnya sebelum kriteria selesai tahap
sebelumnya terpenuhi.

Istilah **lapanga** pada permintaan awal dinormalisasi menjadi **lapangan** di
seluruh UI, API, model, migration, dan dokumentasi.

## Tujuan akhir

Sistem harus memenuhi seluruh kondisi berikut:

- Karyawan, MAGANG, dan MANAJER dapat mengajukan lokasi alternatif dari halaman
  profil.
- Setiap user memiliki maksimal tiga titik lokasi alternatif. Batas ini harus
  ditegakkan di frontend dan backend.
- Lokasi alternatif baru berstatus menunggu sampai disetujui atau ditolak oleh
  HRD/Admin.
- User dapat melihat, mengedit, menghapus, serta mengaktifkan atau menonaktifkan
  lokasi alternatif miliknya sesuai aturan status yang disepakati.
- HRD/Admin memiliki halaman baru **Manajemen Lokasi** dengan dua bagian:
  1. tabel pengajuan lokasi alternatif dengan pagination, filter, detail, dan
     aksi setujui/tolak;
  2. tabel lokasi lapangan dengan aksi tambah, lihat, edit, aktif/nonaktif, dan
     hapus bila aman.
- Lokasi lapangan hanya dapat dibuat dan dikelola oleh HRD/Admin.
- Pengaturan Umum Tipe Kerja memiliki tipe default **WFO**, **WFH**, dan
  **Lokasi Alternatif**. Tipe **Lokasi Lapangan** hanya dapat memilih lokasi
  lapangan yang sebelumnya dibuat di Manajemen Lokasi.
- Pada check-in bagian **Peta Lokasi Real-time**, pilihan tipe kerja menampilkan
  WFO, WFH, lokasi alternatif milik user yang sudah disetujui dan aktif, serta
  lokasi lapangan aktif yang tersedia dari konfigurasi tipe kerja.
- Check-in tidak boleh memakai lokasi alternatif yang masih menunggu, ditolak,
  nonaktif, milik user lain, atau sudah dihapus.
- Semua halaman baru memakai komponen, button, tabel, badge, modal, alert,
  pagination, form control, spacing, breakpoint, dan design token yang sudah
  ada. Jangan membuat style visual baru jika style lama dapat digunakan.
- Ownership, role, status, batas tiga lokasi, dan validasi lokasi ditegakkan di
  backend; menyembunyikan tombol frontend saja tidak cukup.

## Kontrak data dan aturan bisnis yang wajib dipastikan

Sebelum implementasi, audit nama model dan enum yang sudah ada. Jika repository
sudah memiliki konsep lokasi atau tipe kerja, gunakan dan perluas secara
backward-compatible, jangan membuat sumber data paralel tanpa alasan.

Kontrak target minimal:

- tipe kerja canonical: `wfo`, `wfh`, `alternative_location`,
  `field_location`;
- status pengajuan lokasi alternatif: `pending`, `approved`, `rejected`;
- status penggunaan lokasi: `active`, `inactive`;
- lokasi alternatif memiliki owner/user, nama lokasi, alamat/deskripsi,
  latitude, longitude, radius/metode validasi bila aplikasi sudah memilikinya,
  status approval, status aktif, alasan penolakan, approved/rejected by, dan
  timestamp;
- lokasi lapangan memiliki nama, alamat/deskripsi, latitude, longitude,
  radius/metode validasi, status aktif, created/updated by, dan timestamp;
- koordinat wajib divalidasi sebagai angka dan rentang bumi yang valid;
- nama lokasi wajib diisi dan panjangnya mengikuti validasi umum aplikasi;
- pengajuan pending tidak boleh dipakai untuk check-in;
- lokasi approved yang inactive tidak boleh dipakai untuk check-in;
- penghapusan lokasi yang sudah dipakai histori absensi tidak boleh merusak
  histori. Gunakan soft delete, arsip, atau blokir penghapusan sesuai pola
  repository;
- perubahan approval, penolakan, edit, hapus, aktif/nonaktif, dan penggunaan
  lokasi pada check-in dicatat ke audit log bila mekanisme tersebut tersedia.

## Prompt Tahap 1 — Audit arsitektur lokasi, tipe kerja, dan check-in

> Audit kode aktual sebelum mengubah implementasi. Petakan model, migration,
> enum/constant tipe kerja, endpoint, service, form, halaman profil, halaman
> pengaturan umum, komponen Peta Lokasi Real-time, validasi koordinat, dan
> permission yang sudah ada.
>
> Cari juga seluruh penggunaan WFO, WFH, Dinas Luar, Remote, lokasi, latitude,
> longitude, radius, `work_type`, dan payload check-in. Catat file, fungsi,
> route, selector, endpoint, kolom database, role guard, dan test terkait.
>
> Tentukan apakah tipe kerja lapangan yang sudah ada dapat diperluas atau perlu
> adapter kompatibilitas. Jangan mengganti nilai lama secara massal dan jangan
> menghapus endpoint/kolom lama sebelum strategi kompatibilitas terbukti aman.
>
> Audit komponen UI yang harus dipakai ulang untuk tabel, pagination, modal,
> form, switch, badge status, alert, map picker, dan action menu. Catat style
> source yang menjadi referensi. Jangan membuat CSS baru pada tahap ini.
>
> Buat matriks permission untuk Karyawan, MAGANG, MANAJER, dan HRD/Admin.
> Pastikan kebutuhan menyatakan bahwa tiga role pertama hanya mengelola lokasi
> alternatif miliknya, sedangkan HRD/Admin mengelola pengajuan dan lokasi
> lapangan.

**Kriteria selesai:** audit file dan alur lengkap, kontrak data target,
strategi kompatibilitas, matriks permission, daftar endpoint/migration yang
dibutuhkan, serta baseline test terdokumentasi.

## Prompt Tahap 2 — Model, migration, dan kontrak backend

> Implementasikan model dan migration additive untuk lokasi alternatif serta
> lokasi lapangan mengikuti pola Go/Fiber/GORM dan migration repository.
>
> Pisahkan data lokasi alternatif milik user dari master lokasi lapangan admin.
> Simpan koordinat dengan tipe numerik yang aman, bukan string yang sulit
> divalidasi. Tambahkan foreign key/indeks yang sesuai untuk owner, status,
> approval, dan lokasi lapangan.
>
> Migration harus aman dijalankan ulang, tidak menghapus data lama, dan tidak
> mengubah histori absensi yang sudah ada. Jika perlu menambah tipe kerja,
> pertahankan mapping nilai lama melalui adapter.
>
> Tambahkan validasi domain terpusat untuk nama, koordinat, radius, status,
> owner, dan batas maksimal tiga lokasi alternatif. Definisikan aturan apakah
> user boleh mengedit atau menghapus pengajuan pending/approved/rejected dan
> gunakan aturan yang konsisten di seluruh endpoint.
>
> Tambahkan unit test model/validator dan migration test bila pola repository
> mendukungnya. Uji duplikasi, koordinat invalid, status invalid, batas tiga
> lokasi, dan lokasi yang sudah dipakai histori.

**Kriteria selesai:** skema additive tersedia, validator terpusat lulus, data
lama aman, dan aturan tiga lokasi dapat diuji tanpa bergantung pada frontend.

## Prompt Tahap 3 — API lokasi alternatif untuk user

> Buat endpoint lokasi alternatif untuk user yang sedang login. Gunakan user ID
> dari JWT/session, bukan ID owner bebas dari client.
>
> Sediakan operasi sesuai konvensi repository, minimal:
>
> - GET daftar lokasi alternatif milik user;
> - GET detail lokasi milik user;
> - POST pengajuan lokasi alternatif;
> - PUT edit lokasi milik user;
> - DELETE atau archive lokasi milik user dengan perlindungan histori;
> - PATCH/POST aktif-nonaktif lokasi milik user.
>
> Saat membuat lokasi, tolak pengajuan jika user sudah memiliki tiga lokasi
> alternatif yang belum dihapus. Tentukan dan dokumentasikan apakah lokasi
> rejected tetap memakan kuota; gunakan aturan yang sama pada UI dan API.
>
> Lokasi baru harus masuk status `pending`, tidak langsung `approved`. Pastikan
> update, delete, dan toggle tidak dapat mengakses lokasi user lain melalui ID
> yang ditebak. Jangan izinkan user mengubah status approval, owner, approved
> by, atau alasan penolakan.
>
> Endpoint harus mengembalikan status, label, alasan penolakan, koordinat yang
> aman, dan metadata yang diperlukan UI. Tambahkan test untuk role Karyawan,
> MAGANG, MANAJER, ownership lintas user, batas tiga lokasi, dan status
> pending/approved/rejected.

**Kriteria selesai:** user dapat mengelola resource miliknya secara aman,
pengajuan selalu pending, batas tiga lokasi ditegakkan backend, dan semua akses
lintas ownership ditolak.

## Prompt Tahap 4 — API Manajemen Lokasi Admin

> Buat halaman backend dan endpoint HRD/Admin untuk **Manajemen Lokasi**.
> Pisahkan dua resource: pengajuan lokasi alternatif dan master lokasi lapangan.
>
> Bagian pengajuan alternatif minimal mendukung daftar paginated, filter status,
> pencarian nama user/nama lokasi, detail, setujui, dan tolak. Saat menolak,
> dukung alasan penolakan yang jelas dan simpan aktor serta waktu keputusan.
> Jangan izinkan approval ulang yang tidak valid atau keputusan dari role
> non-admin.
>
> Bagian lokasi lapangan minimal mendukung list paginated, tambah, detail, edit,
> aktif/nonaktif, dan penghapusan/arsip dengan perlindungan histori. Admin
> harus dapat menentukan nama, alamat/deskripsi, koordinat, radius, dan status.
>
> Pastikan endpoint admin memvalidasi role di backend, mendukung pagination
> dengan metadata total/page/limit, memiliki sort/filter yang aman, dan tidak
> mengembalikan data sensitif yang tidak diperlukan. Catat audit log untuk
> keputusan pengajuan dan perubahan lokasi lapangan.

**Kriteria selesai:** seluruh operasi admin terproteksi backend, pagination
berfungsi, approval/rejection menyimpan histori, dan master lokasi lapangan
siap dipakai oleh pengaturan tipe kerja.

## Prompt Tahap 5 — Integrasi Pengaturan Umum Tipe Kerja

> Perbarui Pengaturan Umum Tipe Kerja dengan aturan berikut:
>
> - tipe default selalu menyediakan WFO, WFH, dan Lokasi Alternatif;
> - opsi Lokasi Lapangan hanya dapat memilih lokasi lapangan yang aktif dan
>   sudah dibuat di Manajemen Lokasi;
> - admin tidak boleh mengetik atau menyimpan lokasi lapangan bebas yang tidak
>   berasal dari master lokasi lapangan;
> - jika lokasi lapangan dinonaktifkan, tipe kerja yang menggunakannya tetap
>   aman secara histori tetapi tidak boleh menawarkan lokasi itu untuk check-in
>   baru sampai diaktifkan kembali atau dikonfigurasi ulang;
> - edit tipe kerja tidak boleh menghapus referensi histori absensi.
>
> Perbarui model, payload, response, validasi, dropdown/multi-select, detail,
> edit, filter, dan test. Tampilkan label user-friendly **Lokasi Alternatif**
> dan **Lokasi Lapangan**, tetapi simpan enum canonical yang konsisten.
>
> Pastikan konfigurasi tidak mengizinkan admin memilih lokasi alternatif milik
> user tertentu sebagai master. Lokasi alternatif dipilih saat check-in oleh
> user berdasarkan lokasi approved miliknya.

**Kriteria selesai:** konfigurasi tipe kerja hanya memakai sumber lokasi yang
  sah, nilai default tersedia, lokasi nonaktif tidak dipakai untuk check-in
  baru, dan histori tetap terbaca.

## Prompt Tahap 6 — Tambahkan bagian Lokasi Alternatif pada profil user

> Tambahkan bagian **Lokasi Alternatif** pada halaman profil Karyawan, MAGANG,
> dan MANAJER. Reuse layout section/card, form control, tombol, modal, tabel,
> badge, switch, dialog konfirmasi, loading, empty state, dan alert yang sudah
> ada.
>
> Bagian ini harus memiliki:
>
> - form pengajuan nama lokasi, alamat/deskripsi, peta/koordinat, dan radius
>   bila radius memang dipakai aplikasi;
> - informasi jumlah kuota, misalnya `2 dari 3 lokasi digunakan`;
> - tabel lokasi milik user dengan status approval dan status aktif;
> - aksi Lihat, Edit, Hapus, dan switch On/Off sesuai aturan status;
> - alasan penolakan yang terlihat bila pengajuan ditolak;
> - state loading, empty, error, validasi, dan konfirmasi aksi berbahaya;
> - refresh setelah create, edit, delete, approval, atau toggle.
>
> Jangan menganggap tombol yang disembunyikan sebagai security. Semua aksi
> harus tetap menangani error 401/403/404 dari backend. Lokasi pending atau
> rejected tidak boleh dianggap tersedia untuk check-in. Jika aturan bisnis
> melarang edit lokasi approved, tampilkan aksi yang sesuai dan jelaskan status
> tersebut tanpa mengubah aturan backend secara diam-diam.
>
> Gunakan style existing. Jangan menambahkan library UI, sistem warna, ikon,
> tabel, atau pola spacing baru hanya untuk fitur ini.

**Kriteria selesai:** ketiga role dapat mengajukan dan mengelola lokasi
alternatif miliknya, status dan kuota jelas, tabel responsive, dan tidak ada
style baru yang tidak diperlukan.

## Prompt Tahap 7 — Halaman admin Manajemen Lokasi

> Tambahkan route dan menu **Manajemen Lokasi** hanya untuk HRD/Admin sesuai
> pola route guard dan sidebar admin yang sudah ada.
>
> Halaman harus memiliki dua bagian yang jelas pada satu halaman atau tab sesuai
> pola aplikasi:
>
> 1. **Pengajuan Lokasi Alternatif** — tabel paginated berisi user, role, nama
>    lokasi, alamat ringkas, status, tanggal pengajuan, dan aksi Lihat,
>    Setujui, Tolak. Sediakan filter status, pencarian, pagination, loading,
>    empty state, dan konfirmasi keputusan.
> 2. **Daftar Lokasi Lapangan** — tabel paginated berisi nama lokasi, alamat,
>    koordinat/radius yang relevan, status, tanggal perubahan, dan aksi Tambah,
>    Lihat, Edit, On/Off, serta Hapus/Arsip sesuai histori.
>
> Reuse template tabel admin, pagination, action button, modal, badge, switch,
> form, dan notifikasi yang sudah ada. Jangan membuat visual table baru. Pastikan
> pada mobile tabel mengikuti pola responsive existing, tidak menutupi tombol,
> dan tidak menyebabkan horizontal overflow yang tidak ditangani.
>
> Setelah admin menyetujui pengajuan, user dapat melihat status approved dan
> lokasi dapat dipakai setelah aktif. Setelah admin menolak, status dan alasan
> tampil pada user. Invalidate/reload data setelah setiap aksi.

**Kriteria selesai:** dua bagian admin tersedia, pagination/filter/aksi bekerja,
approval dan penolakan terlihat konsisten di user, dan akses role non-admin
ditolak melalui route serta API.

## Prompt Tahap 8 — Integrasi Peta Lokasi Real-time dan check-in

> Perbarui bagian check-in **Peta Lokasi Real-time** saat user memilih tipe
> kerja.
>
> Tampilkan pilihan:
>
> - WFO;
> - WFH;
> - Lokasi Alternatif — hanya lokasi alternatif milik user yang berstatus
>   approved dan active;
> - Lokasi Lapangan — hanya lokasi lapangan active yang diizinkan oleh tipe
>   kerja yang dipilih admin.
>
> Setelah user memilih lokasi, tampilkan nama lokasi, alamat/koordinat yang
> relevan, peta, radius, dan state validasi sesuai komponen peta existing.
> Jangan tampilkan lokasi pending, rejected, inactive, deleted, atau milik user
> lain.
>
> Perbarui payload check-in agar menyimpan tipe kerja canonical dan referensi
> lokasi yang dipakai bila ada. Backend wajib memverifikasi ulang bahwa:
>
> - user memiliki lokasi alternatif tersebut;
> - approval dan active state masih valid;
> - lokasi lapangan masih active dan diizinkan konfigurasi tipe kerja;
> - koordinat user memenuhi aturan radius/geofence yang berlaku;
> - referensi lokasi tidak dipalsukan atau ditukar dengan ID lain.
>
> Pertahankan kompatibilitas histori check-in lama yang hanya menyimpan WFO/WFH
> atau nilai tipe kerja sebelumnya. Tambahkan test untuk setiap tipe, lokasi
> inactive, pending, rejected, ownership mismatch, lokasi lapangan yang tidak
> dikonfigurasi, dan koordinat di luar radius.

**Kriteria selesai:** pilihan peta sesuai status dan konfigurasi, payload
tersimpan benar, validasi backend mencegah manipulasi, dan histori lama tetap
terbaca.

## Prompt Tahap 9 — Integrasi label, detail, riwayat, dashboard, dan export

> Audit seluruh tampilan dan export absensi yang menampilkan tipe kerja atau
> lokasi. Gunakan mapping canonical yang sama untuk tabel, detail, dashboard,
> notifikasi, rekap, CSV, Excel, PDF, JSON, dan print.
>
> Tampilkan label yang konsisten:
>
> - `wfo` → WFO;
> - `wfh` → WFH;
> - `alternative_location` → Lokasi Alternatif;
> - `field_location` → Lokasi Lapangan.
>
> Untuk histori, tampilkan nama lokasi dan alamat/koordinat hanya sesuai scope
> permission. Jangan membocorkan daftar lokasi alternatif user lain kepada
> Karyawan, MAGANG, atau MANAJER. Admin/HRD melihat data sesuai scope
> pengelolaan dan kebutuhan audit.
>
> Pastikan laporan lama yang memiliki tipe kerja legacy tidak berubah maknanya.
> Tambahkan fixture untuk WFO, WFH, lokasi alternatif, lokasi lapangan, serta
> referensi lokasi yang sudah inactive tetapi masih dipakai histori.

**Kriteria selesai:** semua konsumen menampilkan tipe kerja dan lokasi secara
konsisten, export tidak kehilangan data, dan batas akses data tetap terjaga.

## Prompt Tahap 10 — Test, responsive check, security, dan UAT

> Tambahkan atau perbarui test backend, frontend, contract, dan integration
> sesuai pola repository.
>
> Minimal uji:
>
> 1. role Karyawan, MAGANG, dan MANAJER dapat membuat lokasi alternatif;
> 2. lokasi keempat ditolak backend;
> 3. pending tidak dapat dipakai check-in;
> 4. approved inactive tidak dapat dipakai check-in;
> 5. rejected menampilkan alasan dan tidak dapat dipakai;
> 6. user tidak dapat melihat atau mengubah lokasi user lain;
> 7. HRD/Admin dapat approve/reject dengan audit data yang benar;
> 8. role non-admin tidak dapat mengelola lokasi lapangan;
> 9. lokasi lapangan hanya dapat dipilih pada tipe kerja yang dikonfigurasi;
> 10. lokasi lapangan inactive tidak tersedia untuk check-in baru;
> 11. histori check-in lama dan histori dengan lokasi terarsip tetap terbaca;
> 12. pagination, filter, reload, empty state, error state, dan optimistic
>     update/refresh tidak menghasilkan data stale;
> 13. responsive desktop dan mobile tidak memotong form, tabel, switch, atau
>     tombol;
> 14. tidak ada error TypeScript, Go test, API, atau console browser.
>
> Jalankan formatter, test backend relevan, frontend unit/component test,
> type-check, build frontend, dan `git diff --check`. Jika tersedia, lakukan
> UAT dengan akun resmi Karyawan, MAGANG, MANAJER, dan HRD/Admin. Catat route,
> role, data uji, hasil aktual, expected result, waktu, dan bukti.
>
> Jangan menyatakan selesai apabila UAT belum berjalan. Jika kredensial atau
> environment belum tersedia, tandai UAT sebagai **blocked**, tetapi tetap
> laporkan test otomatis yang benar-benar lulus.

**Kriteria selesai:** test otomatis lulus, security/ownership terverifikasi,
responsive check selesai, UAT lulus atau blocker terdokumentasi, dan tidak ada
regresi pada WFO/WFH atau histori absensi lama.

## Format laporan setiap tahap

Setelah setiap tahap, laporkan:

- file yang diubah dan alasan perubahan;
- endpoint, migration, model, enum, dan komponen yang ditambahkan/diubah;
- keputusan kompatibilitas dengan data lama;
- test yang dijalankan dan hasilnya;
- bukti permission/ownership yang diuji;
- risiko, rollback, dan sisa pekerjaan;
- status tahap: **Lulus**, **Perlu Perbaikan**, atau **Blocked**.

## Aturan implementasi wajib

- Jangan membuat style, design token, komponen tabel, pagination, modal, atau
  switch baru jika padanan existing dapat digunakan.
- Jangan menegakkan permission hanya dengan menyembunyikan tombol frontend.
- Jangan mempercayai owner ID, status approval, tipe kerja, atau lokasi dari
  client tanpa verifikasi backend.
- Jangan menghapus data lokasi yang sudah dipakai histori tanpa strategi arsip
  atau soft delete yang aman.
- Jangan membuat lokasi lapangan dari input bebas pada Pengaturan Umum Tipe
  Kerja; gunakan master lokasi lapangan dari Manajemen Lokasi.
- Jangan menawarkan lokasi alternatif pending, rejected, inactive, atau milik
  user lain pada check-in.
- Pertahankan WFO, WFH, endpoint lama, migration lama, dan histori absensi
  selama masih diperlukan untuk kompatibilitas.
- Gunakan nama UI **Lokasi Alternatif** dan **Lokasi Lapangan** secara konsisten.

