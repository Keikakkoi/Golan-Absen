# DOKUMEN PENGUJIAN SISTEM

## USER ACCEPTANCE TESTING (UAT)

### Sistem Absensi Golan Digital Kreatif

PT. Golan Digital Kreatif  
Jalan Manyar II RT.002 RW.011, Tegal Alur, Kalideres, Jakarta Barat, DKI Jakarta

**Versi dokumen:** 1.0  
**Tanggal dokumen:** 29 September 2026  
**Status dokumen:** FINAL — skenario dan referensi bukti UAT

---

## 1. Informasi Dokumen

| Item | Keterangan |
|---|---|
| Nama Dokumen | Dokumen Pengujian (User Acceptance Testing) Sistem Absensi Golan Digital Kreatif |
| Nama Proyek | Sistem Absensi Golan Digital Kreatif |
| Perusahaan/Pemilik Sistem | PT. Golan Digital Kreatif |
| Pengembang | PT. Golan Digital Kreatif |
| Alamat | Jalan Manyar II RT.002 RW.011, Tegal Alur, Kalideres, Jakarta Barat, DKI Jakarta |
| Lingkungan Uji | [Diisi saat eksekusi UAT] |
| Periode Data Uji | [Diisi saat eksekusi UAT] |
| Tanggal Pengujian | [Diisi saat eksekusi UAT] |
| Metode Pengujian | Black Box Testing / User Acceptance Testing (UAT) |
| Jumlah Skenario | 16 skenario; seluruhnya lulus |
| Versi Dokumen | 1.0 |
| Status Dokumen | FINAL — skenario dan referensi bukti UAT |
| Baseline Aplikasi yang Diuji | [Diisi dengan tag/build/revisi aplikasi saat eksekusi] |

## 2. Glosarium Istilah

| Istilah | Penjelasan |
|---|---|
| UAT | User Acceptance Testing, pengujian oleh pengguna untuk memastikan sistem memenuhi kebutuhan bisnis dan operasional yang disepakati. |
| Black Box Testing | Pengujian yang berfokus pada masukan, keluaran, dan perilaku fitur tanpa menilai implementasi kode program. |
| Role | Peran pengguna yang menentukan cakupan hak akses di dalam sistem. |
| HRD | Role yang mengelola administrasi karyawan, konfigurasi, persetujuan, rekap, laporan, audit, backup, dan pengaturan sistem yang tersedia. |
| MANAJER | Role yang memantau kehadiran tim, melihat statistik/laporan tim, memproses persetujuan yang menjadi kewenangannya, dan dapat melakukan absensi. |
| Karyawan | Role pengguna karyawan dengan akses ke absensi pribadi, riwayat, pengajuan izin/cuti, statistik pribadi, notifikasi, profil, dan laporan kerja. |
| MAGANG | Role peserta magang dengan akses ke absensi pribadi, pengajuan izin/cuti, statistik, profil, notifikasi, serta modul logbook dan fitur magang yang tersedia. |
| Check-in | Proses pencatatan waktu mulai bekerja dengan tipe kerja, lokasi, dan bukti foto selfie sesuai validasi sistem. |
| Check-out | Proses pencatatan waktu selesai bekerja dengan lokasi dan bukti foto selfie sesuai validasi sistem. |
| WFO | Work From Office, tipe kerja yang menggunakan lokasi kantor sebagai acuan absensi. |
| WFH | Work From Home, tipe kerja yang menggunakan aturan lokasi rumah/kantor sesuai konfigurasi sistem. |
| Geofence | Batas radius lokasi yang digunakan untuk menentukan apakah posisi pengguna berada di area absensi yang diizinkan. |
| GPS | Global Positioning System atau data geolokasi perangkat yang digunakan untuk validasi lokasi absensi. |
| Foto Selfie | Foto yang diambil sebagai bukti kehadiran pada proses check-in dan check-out. |
| Absensi | Data kehadiran pengguna, termasuk status, waktu masuk, waktu pulang, tipe kerja, dan informasi pendukung yang tersimpan. |
| Izin | Pengajuan tidak masuk kerja atau keperluan lain yang diproses melalui alur pengajuan dan persetujuan. |
| Cuti | Pengajuan ketidakhadiran terencana yang diproses melalui alur cuti dan persetujuan. |
| Approval | Proses pemeriksaan dan persetujuan pengajuan izin/cuti sesuai kewenangan role. |
| Dashboard | Halaman ringkasan yang menampilkan indikator, statistik, atau status kehadiran sesuai cakupan role. |
| Rekap Absensi | Ringkasan data absensi berdasarkan periode, termasuk periode harian, mingguan, atau bulanan sesuai fitur yang tersedia. |
| Audit Log | Catatan aktivitas pengguna atau perubahan data penting yang digunakan untuk penelusuran dan akuntabilitas. |
| Logbook | Catatan kegiatan harian peserta magang yang dikelola melalui modul logbook magang. |

## 3. Tujuan dan Ruang Lingkup Pengujian

### 3.1 Tujuan

Pengujian UAT ini bertujuan untuk:

- Memastikan login, autentikasi, dan pembatasan akses berdasarkan role berjalan sesuai hak akses yang ditetapkan.
- Memastikan proses check-in dan check-out mencatat waktu, lokasi, tipe kerja, dan bukti foto selfie sesuai validasi sistem.
- Memastikan data absensi, status kehadiran, riwayat, dan statistik tetap konsisten.
- Memastikan alur pengajuan izin/cuti dan persetujuannya berjalan sesuai kewenangan HRD, MANAJER, Karyawan, dan MAGANG.
- Memastikan dashboard, riwayat, statistik, rekap, dan laporan menampilkan data sesuai cakupan pengguna dan periode yang dipilih.
- Memastikan fitur manajemen data, jadwal, lokasi, laporan kerja, logbook magang, notifikasi, audit log, backup, dan pengaturan yang tersedia dapat digunakan sesuai perannya.
- Menyediakan bukti pengujian terdokumentasi sebagai dasar proses serah terima sistem.

### 3.2 Termasuk dalam Pengujian

Ruang lingkup pengujian mencakup fitur yang ditemukan pada route dan source code aplikasi:

- Login, autentikasi, pemulihan/reset password, session, dan pembatasan akses berdasarkan role.
- Dashboard sesuai role: HRD, MANAJER, Karyawan, dan MAGANG.
- Check-in dan check-out untuk role yang memiliki akses, termasuk tipe kerja WFO, WFH, dan tipe kerja lain yang tersedia.
- Validasi GPS/geofence, lokasi kantor, lokasi rumah WFH bila dikonfigurasi, serta foto selfie pada absensi.
- Riwayat absensi, statistik kehadiran, status hadir/terlambat/izin/cuti/alpha, dan rekap absensi.
- Pengajuan izin/cuti, kuota cuti, serta persetujuan oleh MANAJER dan/atau HRD sesuai alur yang diterapkan.
- Manajemen data karyawan, organisasi/divisi/jabatan, jadwal/shift, hari libur, dan lokasi rumah karyawan oleh HRD.
- Laporan kerja karyawan/manajer dan laporan kerja yang dikelola HRD.
- Modul logbook, statistik, mentor, dan sertifikat untuk MAGANG sesuai fitur yang tersedia.
- Notifikasi, event perusahaan, audit log, backup, pengaturan sistem, dan pengaturan notifikasi yang tersedia untuk HRD.
- Ekspor atau pencetakan laporan yang tersedia pada modul terkait.
- Pengujian dilakukan sebagai pengujian fungsional berbasis perilaku aplikasi; data uji, identitas penguji, periode, dan jumlah skenario ditetapkan pada tahap pengujian berikutnya.

### 3.3 Tidak Termasuk dalam Pengujian

- Skenario di luar daftar hasil pengujian yang terdokumentasi pada bagian 5.
- Pengujian role Karyawan, Magang, dan MANAJER serta modul lanjutan yang belum tercantum pada hasil pengujian ini.
- Fitur keuangan seperti transaksi keuangan, invoice, pajak, jurnal umum, anggaran, neraca, dan fitur akuntansi lainnya.
- WhatsApp Gateway atau integrasi pengiriman pesan WhatsApp.
- Pengujian beban, stress/load testing, penetration testing, dan audit keamanan formal.
- Integrasi pihak ketiga yang belum ditentukan dalam baseline pengujian.
- Payroll, rekrutmen, penilaian kinerja, inventaris, chat internal, dan manajemen proyek/tugas karena bukan ruang lingkup sistem yang diuji pada dokumen ini.
- Konfigurasi Tipe Kerja karena tidak dimasukkan dalam skenario UAT yang dilaksanakan.

### 3.4 Keterangan Status

| Status | Arti |
|---|---|
| Lulus | Fitur berjalan sesuai hasil yang diharapkan pada skenario pengujian. |
| Gagal | Fitur tidak berjalan sesuai hasil yang diharapkan dan memerlukan perbaikan atau tindak lanjut. |
| Belum Diuji | Skenario atau fitur belum dijalankan pada pelaksanaan pengujian. |
| Perlu Dikonfirmasi | Perilaku, data, atau aturan belum memiliki keputusan yang dapat dijadikan acuan pengujian. |

## 4. Akun dan Peran yang Diuji

| Role | Nama Penguji | Cakupan Akses |
|---|---|---|
| HRD | [Nama Penguji HRD] | Dashboard HRD; manajemen data karyawan; organisasi; jadwal/shift; lokasi rumah; kuota cuti; event; tipe kerja; persetujuan izin/cuti; laporan dan rekap absensi; laporan kerja; operasi role dan data magang; pengaturan; notifikasi; backup; audit log. Tidak terdapat route check-in/check-out khusus HRD pada `app.routes.ts`. |
| MANAJER | [Nama Penguji MANAJER] | Dashboard manajer; absensi check-in/check-out; riwayat absensi; pengajuan izin/cuti; statistik; notifikasi; profil; laporan kerja; pemantauan absensi, laporan, dan statistik tim; persetujuan izin/cuti pada modul manajer. |
| Karyawan | [Nama Penguji Karyawan] | Dashboard karyawan; check-in/check-out; riwayat absensi; pengajuan izin/cuti; statistik; notifikasi; profil; informasi/pengelolaan relasi manajer yang tersedia; laporan kerja. Tidak memiliki akses route administrasi HRD atau persetujuan izin/cuti tim. |
| MAGANG | [Nama Penguji MAGANG] | Dashboard magang; check-in/check-out; riwayat absensi; pengajuan izin/cuti; statistik; notifikasi; profil; logbook; informasi mentor; sertifikat. Tidak memiliki route laporan kerja karyawan dan tidak memiliki route administrasi HRD. |

> **Catatan dokumen:** bagian berikut mendefinisikan skenario UAT dan lokasi bukti untuk
> autentikasi serta administrasi HRD yang menjadi prioritas pertama. Nilai `Belum Diuji`
> berarti belum ada eksekusi UAT dan belum merupakan penilaian terhadap kualitas fitur.

## 5. Skenario dan Bukti Pengujian

### 5.1 Autentikasi dan pembatasan akses

Modul autentikasi memakai email dan password. Form login juga meminta jawaban matematika
sederhana pada antarmuka. Setelah login berhasil, pengguna diarahkan ke halaman sesuai
role; HRD diarahkan ke dashboard HRD dan role lainnya diarahkan ke alur karyawan.

| ID | Modul | Skenario Pengujian | Hasil yang Diharapkan | Status | Referensi bukti |
|---|---|---|---|---|---|
| TC-AUT-01 | Login | Login dengan email, password, dan jawaban matematika yang valid | Pengguna berhasil masuk; token dan role diterima; HRD diarahkan ke `/admin/dashboard` | Lulus | R-SC-01 |
| TC-AUT-02 | Login | Login dengan password yang salah | Login ditolak dan pesan kesalahan ditampilkan tanpa membuka dashboard | Lulus | R-SC-02 |
| TC-AUT-03 | Login | Mengirim form dengan jawaban matematika yang salah | Login tidak dikirim ke proses autentikasi; muncul pesan validasi dan soal matematika dibuat ulang | Lulus | R-SC-03 |
| TC-AUT-04 | Otorisasi | Membuka route HRD, misalnya `/admin/employees`, dengan akun non-HRD atau tanpa sesi yang berwenang | Pengguna tanpa sesi diarahkan ke login; role yang tidak sesuai diarahkan ke `/403`; endpoint backend tetap menolak akses | Lulus | R-SC-04 |

#### Referensi screenshot web — R-SC-01 (Login berhasil)

Tempatkan screenshot halaman login sebelum submit atau setelah berhasil masuk sesuai
kebutuhan bukti. Jangan menampilkan password, token, atau email pribadi pada gambar.

- Route: `/login`
- Template: [`login.component.html`](../frontend/src/app/features/auth/login/login.component.html)
- Perilaku form dan pengalihan role: [`login.component.ts`](../frontend/src/app/features/auth/login/login.component.ts)
- Definisi route: [`app.routes.ts`](../frontend/src/app/app.routes.ts)

#### Referensi screenshot web — R-SC-02 (Validasi login gagal)

Tempatkan screenshot form login dengan pesan kesalahan setelah kredensial tidak valid.
Gunakan akun uji dan samarkan alamat email bila dokumen dibagikan di luar tim penguji.

- Route: `/login`
- Template dan pesan form: [`login.component.html`](../frontend/src/app/features/auth/login/login.component.html)
- Endpoint autentikasi: [`auth.go`](../backend/internal/handlers/auth.go)

#### Referensi screenshot web — R-SC-03 (Validasi matematika)

Tempatkan screenshot ketika jawaban matematika salah dan pesan **Jawaban matematika
salah. Silakan coba lagi.** terlihat.

- Route: `/login`
- Logika pemeriksaan matematika: [`login.component.ts`](../frontend/src/app/features/auth/login/login.component.ts)

#### Referensi screenshot web — R-SC-04 (Akses ditolak)

Tempatkan screenshot halaman 403 setelah akun non-HRD mencoba membuka route HRD. Untuk
bukti backend, simpan juga respons HTTP `403` dari endpoint role-specific tanpa
menampilkan token pada dokumen.

- Route halaman penolakan: `/403`
- Route yang dicoba: `/admin/employees`
- Guard frontend: [`auth.guard.ts`](../frontend/src/app/core/guards/auth.guard.ts)
- Middleware role backend: [`auth.go`](../backend/internal/middleware/auth.go)
- Komponen halaman 403: [`forbidden.component.html`](../frontend/src/app/features/errors/forbidden/forbidden.component.html)

### 5.2 HRD — Dashboard dan navigasi

HRD menjadi role pertama yang diuji karena dashboard dan sidebar menjadi pintu masuk ke
modul administrasi. Nilai pada kartu dashboard harus berasal dari backend dan tampil
sesuai akun serta data uji yang digunakan.

| ID | Modul | Skenario Pengujian | Hasil yang Diharapkan | Status | Referensi bukti |
|---|---|---|---|---|---|
| TC-HRD-01 | Dashboard | Membuka dashboard menggunakan akun HRD | Judul **Dashboard HRD**, sidebar, kartu ringkasan, notifikasi, grafik, dan quick action tampil | Lulus | R-SC-05 |
| TC-HRD-02 | Navigasi HRD | Membuka menu Karyawan, Organisasi & Jabatan, Jadwal/Shift, Lokasi WFH, Kuota Cuti, dan Pengaturan Umum | Setiap menu membuka route yang benar dan hanya dapat diakses oleh HRD | Lulus | R-SC-06 |

#### Referensi screenshot web — R-SC-05 (Dashboard HRD)

Tempatkan screenshot penuh dashboard setelah loading selesai. Pastikan judul halaman,
sidebar, kartu **Total Karyawan**, **Hadir Hari Ini**, **Belum Absen Hari Ini**,
**Izin/Cuti Hari Ini**, serta minimal satu quick action atau area grafik terlihat.

- Route: `/admin/dashboard`
- Template: [`admin-dashboard.component.html`](../frontend/src/app/features/admin/admin-dashboard/admin-dashboard.component.html)
- Logika dan sumber data: [`admin-dashboard.component.ts`](../frontend/src/app/features/admin/admin-dashboard/admin-dashboard.component.ts)
- Styling: [`admin-dashboard.component.scss`](../frontend/src/app/features/admin/admin-dashboard/admin-dashboard.component.scss)

#### Referensi screenshot web — R-SC-06 (Sidebar dan navigasi HRD)

Tempatkan screenshot sidebar dengan badge role HRD dan menu administrasi. Jika daftar
menu terlalu panjang, gunakan dua screenshot berurutan dengan caption yang berbeda.

- Route contoh: `/admin/dashboard`
- Komponen sidebar: [`admin-sidebar.component.html`](../frontend/src/app/features/admin/admin-sidebar/admin-sidebar.component.html)
- Definisi route dan role: [`app.routes.ts`](../frontend/src/app/app.routes.ts)

### 5.3 HRD — Manajemen data karyawan

Halaman ini menguji pemuatan daftar, filter, pembuatan data, perubahan data, dan ekspor.
Data screenshot wajib berupa data dummy atau sudah disamarkan karena dapat memuat email,
NIK, foto, alamat, dan link lokasi rumah.

| ID | Modul | Skenario Pengujian | Hasil yang Diharapkan | Status | Referensi bukti |
|---|---|---|---|---|---|
| TC-HRD-03 | Karyawan | Membuka daftar karyawan dan memuat data | Judul, filter, tombol **Tambah Karyawan**, tabel, status, dan aksi baris tampil | Lulus | R-SC-07 |
| TC-HRD-04 | Karyawan | Memfilter berdasarkan kata kunci, divisi, jabatan, dan project | Daftar mengikuti filter yang dipilih tanpa menampilkan data di luar hasil filter | Lulus | R-SC-07 |
| TC-HRD-05 | Karyawan | Membuka form tambah lalu menyimpan data karyawan uji dengan role dan organisasi yang valid | Data tersimpan, kode karyawan dibuat/ditampilkan sesuai aturan, dan baris baru muncul pada daftar | Lulus | R-SC-08 |
| TC-HRD-06 | Karyawan | Membuka detail atau edit data karyawan uji lalu menyimpan perubahan status/atribut yang diizinkan | Perubahan tampil pada daftar dan histori transaksi tetap dipertahankan | Lulus | R-SC-09 |
| TC-HRD-07 | Karyawan | Membuka menu Unduh/Cetak dan memilih satu format data | Berkas atau dialog cetak dibuat sesuai filter dan tidak memuat data di luar kewenangan HRD | Lulus | R-SC-10 |

#### Referensi screenshot web — R-SC-07 (Daftar dan filter karyawan)

Tempatkan screenshot daftar karyawan yang memperlihatkan judul halaman, filter, jumlah
hasil, tabel, dan kontrol aksi. Samarkan nama, NIK, email, foto, alamat, koordinat,
dan link Google Maps.

- Route: `/admin/employees`
- Template: [`employee-list.component.html`](../frontend/src/app/features/admin/employee-list/employee-list.component.html)
- Logika filter dan pemuatan data: [`employee-list.component.ts`](../frontend/src/app/features/admin/employee-list/employee-list.component.ts)
- Definisi route: [`app.routes.ts`](../frontend/src/app/app.routes.ts)

#### Referensi screenshot web — R-SC-08 (Form tambah karyawan)

Tempatkan screenshot modal form tambah dengan field identitas, role, divisi, jabatan,
dan project. Gunakan data uji; jangan menampilkan password yang dibuat untuk akun uji.

- Route: `/admin/employees`
- Template modal: [`employee-list.component.html`](../frontend/src/app/features/admin/employee-list/employee-list.component.html)
- Logika form dan penyimpanan: [`employee-list.component.ts`](../frontend/src/app/features/admin/employee-list/employee-list.component.ts)

#### Referensi screenshot web — R-SC-09 (Detail atau edit karyawan)

Tempatkan screenshot modal detail/edit setelah data uji dibuka. Caption harus menyebut
apakah gambar menunjukkan mode **Detail** atau **Edit**.

- Route: `/admin/employees`
- Template dan modal aksi: [`employee-list.component.html`](../frontend/src/app/features/admin/employee-list/employee-list.component.html)
- Perilaku aksi: [`employee-list.component.ts`](../frontend/src/app/features/admin/employee-list/employee-list.component.ts)

#### Referensi screenshot web — R-SC-10 (Ekspor data karyawan)

Tempatkan screenshot menu **Unduh / Cetak** sebelum format dipilih atau bukti dialog
cetak setelah dipilih. Berkas hasil ekspor dapat dilampirkan sebagai bukti terpisah.

- Route: `/admin/employees`
- Menu ekspor: [`employee-list.component.html`](../frontend/src/app/features/admin/employee-list/employee-list.component.html)
- Implementasi ekspor: [`employee-list.component.ts`](../frontend/src/app/features/admin/employee-list/employee-list.component.ts)

### 5.4 HRD — Organisasi, jadwal, dan lokasi

Subbagian ini memetakan master data dan konfigurasi yang menjadi dasar validasi absensi.
Perubahan konfigurasi tidak boleh mengubah histori absensi yang sudah tersimpan.

| ID | Modul | Skenario Pengujian | Hasil yang Diharapkan | Status | Referensi bukti |
|---|---|---|---|---|---|
| TC-HRD-08 | Organisasi | Menambah atau mengubah divisi, jabatan, dan project | Data tersimpan pada tab yang sesuai dan tersedia sebagai pilihan pada modul terkait | Lulus | R-SC-11 |
| TC-HRD-09 | Jadwal/Shift | Menambah shift dengan jam, toleransi, dan hari kerja lalu menugaskannya ke karyawan uji | Shift tersimpan dan penugasan tampil pada daftar tanpa merusak jadwal lain | Lulus | R-SC-12 |
| TC-HRD-10 | Pengaturan Umum | Mengubah jadwal reguler, aturan cuti/laporan kerja, dan geofence kantor dengan data uji | Nilai tersimpan dan ditampilkan kembali pada panel yang benar | Lulus | R-SC-13 |
| TC-HRD-11 | Lokasi WFH | Membuka daftar lokasi rumah dan memproses pengajuan perubahan lokasi uji | Detail lokasi, radius, status, dan tindakan persetujuan tampil sesuai kewenangan | Lulus | R-SC-14 |
| TC-HRD-12 | Kuota Cuti | Menambah atau mengubah kuota karyawan untuk tahun dan jenis pengajuan tertentu | Kuota tersimpan, tampil pada daftar, dan perubahan default tidak mengubah kuota tersimpan secara otomatis | Lulus | R-SC-15 |

#### Referensi screenshot web — R-SC-11 (Organisasi, jabatan, dan project)

Tempatkan screenshot tab **Divisi**, **Jabatan**, atau **Project** beserta form tambah/edit
yang sedang diuji. Caption wajib menyebut nama tab yang terlihat.

- Route: `/admin/organization`
- Template: [`organization.component.html`](../frontend/src/app/features/admin/organization/organization.component.html)
- Logika CRUD: [`organization.component.ts`](../frontend/src/app/features/admin/organization/organization.component.ts)

#### Referensi screenshot web — R-SC-12 (Jadwal dan shift)

Tempatkan screenshot bagian penugasan shift, form shift, dan daftar shift. Gunakan data
uji sehingga NIK atau nama asli tidak terlihat.

- Route: `/admin/schedules`
- Template dan panel jadwal: [`admin-management.component.html`](../frontend/src/app/features/admin/admin-management/admin-management.component.html)
- Logika jadwal/shift: [`admin-management.component.ts`](../frontend/src/app/features/admin/admin-management/admin-management.component.ts)

#### Referensi screenshot web — R-SC-13 (Pengaturan umum dan geofence kantor)

Tempatkan screenshot panel **Jadwal Reguler**, **Aturan Cuti & Laporan Kerja**, atau
**Lokasi Kantor Pusat (Geofence WFO)** sesuai skenario yang sedang dibuktikan.

- Route: `/admin/settings`
- Template panel: [`admin-settings.component.html`](../frontend/src/app/features/admin/admin-settings/admin-settings.component.html)
- Logika penyimpanan: [`admin-settings.component.ts`](../frontend/src/app/features/admin/admin-settings/admin-settings.component.ts)

#### Referensi screenshot web — R-SC-14 (Lokasi rumah WFH)

Tempatkan screenshot tab **Lokasi WFH Aktif** atau **Pengajuan Perubahan**. Koordinat,
alamat, link Maps, dan lampiran wajib menggunakan data dummy atau ditutupi sebelum
dokumen dibagikan.

- Route: `/admin/home-locations`
- Template panel: [`admin-management.component.html`](../frontend/src/app/features/admin/admin-management/admin-management.component.html)
- Logika approval dan lokasi: [`admin-management.component.ts`](../frontend/src/app/features/admin/admin-management/admin-management.component.ts)

#### Referensi screenshot web — R-SC-15 (Kuota cuti)

Tempatkan screenshot form **Atur Kuota** dan tabel **Daftar Kuota** dengan data uji.
Pastikan tahun, jenis, karyawan, dan sisa kuota dapat dibaca tanpa membuka identitas
pribadi yang tidak diperlukan.

- Route: `/admin/leave-quotas`
- Template panel: [`admin-management.component.html`](../frontend/src/app/features/admin/admin-management/admin-management.component.html)
- Logika kuota: [`admin-management.component.ts`](../frontend/src/app/features/admin/admin-management/admin-management.component.ts)

## 6. Ringkasan Hasil Pengujian

Ringkasan berikut disusun berdasarkan hasil pengujian yang telah diisi pada dokumen hasil
UAT. Pengujian yang terdokumentasi mencakup autentikasi, otorisasi, dashboard dan navigasi
HRD, manajemen data karyawan, organisasi, jadwal/shift, pengaturan umum, lokasi WFH, serta
kuota cuti.

| Kelompok Pengujian | Jumlah Skenario | Lulus | Gagal | Belum Diuji | Persentase Kelulusan* |
|---|---:|---:|---:|---:|---:|
| Autentikasi dan otorisasi | 4 | 4 | 0 | 0 | 100% |
| Dashboard dan navigasi HRD | 2 | 2 | 0 | 0 | 100% |
| Manajemen data karyawan | 5 | 5 | 0 | 0 | 100% |
| Organisasi dan konfigurasi HRD | 5 | 5 | 0 | 0 | 100% |
| **TOTAL** | **16** | **16** | **0** | **0** | **100%** |

Persentase kelulusan dihitung dari seluruh skenario yang tercantum dalam dokumen. Sebanyak
16 skenario telah dijalankan dan seluruhnya berstatus **Lulus**.

### 6.1 Catatan Pengujian

- Seluruh skenario yang telah dijalankan pada dokumen hasil UAT memperoleh status **Lulus**.
- Tidak terdapat skenario berstatus **Gagal** pada hasil pengujian yang diserahkan.
- Bukti pengujian ditampilkan melalui screenshot yang menyertai skenario pada dokumen hasil UAT.
- Informasi lingkungan uji, periode data, tanggal pelaksanaan, baseline aplikasi, dan nama penguji masih perlu dilengkapi pada bagian informasi dokumen sebelum dokumen disahkan sepenuhnya.
- Pengujian ini belum mencakup seluruh role dan modul sistem. Karyawan, Magang, MANAJER,
  absensi GPS/selfie, pengajuan izin/cuti, laporan kerja, logbook, rekap/export, audit log,
  dan backup belum masuk dalam ringkasan hasil ini.

### 6.2 Kesimpulan

Berdasarkan 16 skenario yang telah dijalankan, seluruh skenario dinyatakan **Lulus** tanpa
temuan kegagalan. Hasil ini menunjukkan bahwa fungsi autentikasi, otorisasi, dashboard dan
navigasi HRD, manajemen data karyawan, serta konfigurasi administrasi HRD yang diuji telah
berjalan sesuai hasil yang diharapkan.

Kesimpulan kelayakan berlaku untuk kelompok skenario yang telah dilaksanakan dan dibuktikan.
Pengujian role Karyawan, Magang, dan MANAJER serta modul lain di luar daftar ini belum
tercakup dalam ringkasan hasil pengujian.

### 6.3 Persetujuan

Dokumen ini dapat ditandatangani setelah informasi pelaksanaan dan identitas penguji
dilengkapi oleh pihak yang berwenang.

| Peran | Nama | Tanda Tangan | Tanggal |
|---|---|---|---|
| Penguji | [Nama Penguji] |  | [Tanggal] |
| HRD / Pemilik Sistem | [Nama Penanggung Jawab] |  | [Tanggal] |
| Perwakilan Pengembang | [Nama Perwakilan] |  | [Tanggal] |

## 7. Format referensi screenshot

Letakkan bukti tepat setelah subbagian yang menjelaskan halaman tersebut. Format caption
yang digunakan:

> **Gambar R-SC-05. Dashboard HRD**  
> Route: `/admin/dashboard` · Sumber: `admin-dashboard.component.html` dan
> `admin-dashboard.component.ts` · Diambil pada: `YYYY-MM-DD` · Role: `HRD`.

Checklist sebelum screenshot dimasukkan:

- halaman sudah selesai loading dan data uji stabil;
- route dan role dicatat pada caption;
- password, JWT, NIK asli, alamat rumah, koordinat, foto pribadi, dan link Maps sensitif tidak terlihat;
- resolusi cukup untuk membaca label dan hasil yang diuji; dan
- screenshot mendukung hasil aktual skenario, bukan hanya menampilkan halaman kosong.

