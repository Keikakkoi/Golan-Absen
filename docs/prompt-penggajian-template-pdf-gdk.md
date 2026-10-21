# Prompt Implementasi Penggajian dengan Template PDF GDK

~~~text
Tambahkan fitur Penggajian/Slip Gaji pada aplikasi Absensi Golan Digital Kreatif.

Gunakan dua referensi berikut:

1. Struktur slip gaji:
   https://www.talenta.co/tool-gratis/slip-gaji-online/
2. Template cetak resmi dari user:
   Slip Gaji Format GDK.pdf
   Lokasi referensi saat ini:
   C:/Users/devan/Documents/MAGANG_PKL/Doc Absensi Golan/Slip Gaji Format GDK.pdf

Gambar dan PDF hanya digunakan sebagai referensi struktur dan layout. Jangan
menyalin branding Talenta, teks promosi, popup marketing, kuota slip, input
email marketing, atau footer yang menyebut Talenta/Mekari.

## Tujuan utama

Buat modul penggajian yang memungkinkan HRD/Admin menginput data gaji secara
manual, menyimpan slip gaji, menerbitkan slip, melihat Preview, dan mencetak
atau mengunduh slip gaji dalam bentuk PDF menggunakan template Slip Gaji Format
GDK.pdf.

Buat halaman Penggajian baru pada area Admin dan tambahkan menu Penggajian pada
navbar/sidebar Admin. Halaman harus menjadi modul tersendiri dan tidak
menumpang pada halaman Rekap Absensi atau Pengaturan Umum.

## Batasan fitur

Fokus hanya pada pengelolaan penggajian dan slip gaji.

Semua nominal gaji diinput manual oleh HRD/Admin. Karyawan, Manajer, dan Magang
tidak boleh menginput atau mengubah nominal gajinya sendiri.

Jangan membuat fitur berikut pada tahap ini:

- transfer gaji atau integrasi bank;
- perhitungan PPh 21 otomatis;
- perhitungan BPJS otomatis;
- perhitungan lembur, THR, bonus, atau pinjaman berbasis absensi;
- payroll disbursement;
- reimbursement;
- compensation planning;
- integrasi regulasi pajak otomatis.

Sistem hanya menjumlahkan nominal yang diinput HRD. Jangan menebak tarif pajak
atau aturan ketenagakerjaan.

## Hak akses

### HRD/Admin

HRD/Admin dapat:

- membuka halaman Penggajian dari navbar Admin;
- melihat daftar semua slip gaji;
- memfilter slip berdasarkan bulan, tahun, karyawan, divisi, dan status;
- membuat slip gaji untuk karyawan aktif;
- mengisi total hari kerja dan komponen gaji;
- menyimpan slip sebagai Draft;
- membuka Preview;
- menerbitkan atau Publish slip;
- mengunduh dan mencetak PDF;
- mengedit atau menghapus slip yang masih Draft;
- melihat slip Published;
- melihat histori perubahan dan audit log.

### Karyawan, Manajer, dan Magang

Role non-HRD hanya boleh:

- melihat slip miliknya sendiri;
- melihat slip yang sudah Published;
- membuka Preview;
- mengunduh PDF slip miliknya.

Role non-HRD tidak boleh:

- membuat slip;
- mengubah total hari kerja;
- mengubah nominal pendapatan atau pengurangan;
- menghapus slip;
- menerbitkan slip;
- melihat slip milik user lain;
- mengakses Draft melalui URL atau API.

Semua pembatasan harus diterapkan pada frontend dan backend. Jangan hanya
menyembunyikan tombol.

## Halaman Admin dan navbar

Buat route dan halaman baru:

- route yang disarankan: /admin/payroll;
- komponen standalone baru di area fitur admin;
- service frontend khusus payroll atau service yang mengikuti pola repository;
- endpoint backend khusus payroll;
- menu navbar/sidebar Admin dengan label Penggajian;
- ikon navbar yang konsisten dengan menu Admin lainnya;
- menu aktif ketika berada di /admin/payroll;
- akses route dibatasi hanya untuk role HRD.

Tambahkan quick action atau kartu ringkasan pada dashboard Admin yang mengarah
ke halaman Penggajian bila pola dashboard saat ini mendukungnya. Minimal,
halaman tetap harus dapat dibuka langsung dari navbar Admin.

Jangan menampilkan menu Penggajian Admin kepada Karyawan, Manajer, atau Magang.

Jika aplikasi membutuhkan halaman untuk melihat slip dari sisi user, gunakan
route terpisah seperti /employee/payroll atau /employee/payslips. Menu tersebut
hanya menampilkan slip Published milik user yang sedang login.

## Field slip gaji

### Informasi perusahaan

- logo perusahaan;
- nama perusahaan;
- nomor telepon perusahaan.

Gunakan identitas PT Golan Digital Kreatif dan logo yang sudah tersedia atau
ambil dari Pengaturan Umum jika mekanisme tersebut sudah ada. Jangan membuat
sumber data identitas perusahaan duplikat tanpa alasan.

### Periode pembayaran

- bulan dan tahun slip;
- payroll cut-off tanggal mulai;
- payroll cut-off tanggal selesai;
- tanggal bayar.

### Rincian karyawan

Ambil data dari master karyawan yang dipilih dan simpan snapshot pada slip agar
histori slip tidak berubah ketika profil karyawan berubah:

- nama karyawan;
- ID atau kode karyawan;
- NIK jika tersedia;
- jabatan;
- departemen atau divisi;
- total hari kerja pada periode payroll.

PENTING:

- Jangan gunakan field Golongan;
- ganti sepenuhnya bagian Golongan pada gambar/PDF menjadi Total hari kerja;
- label pada halaman, request API, model, tabel, Preview, dan PDF harus
  menggunakan Total hari kerja;
- Total hari kerja berupa bilangan bulat minimal 0;
- Total hari kerja diinput oleh HRD/Admin pada form slip;
- simpan Total hari kerja sebagai snapshot pada slip;
- jangan menambahkan relasi atau kolom Golongan pada model payroll;
- jangan mengubah master karyawan hanya untuk menambahkan Total hari kerja;
- jangan menghitung Total hari kerja otomatis dari absensi pada tahap ini,
  kecuali mekanisme tersebut sudah tersedia dan tidak memperluas scope.

### Rincian penghasilan

Buat daftar item dinamis:

- nama pendapatan;
- nominal Rupiah;
- tombol Tambah item;
- tombol Hapus item.

Sediakan item awal seperti Gaji pokok dan Uang makan, tetapi HRD tetap dapat
mengubah, menambah, atau menghapus item.

### Rincian pengurangan

Buat daftar item dinamis:

- nama pengurangan;
- nominal Rupiah;
- tombol Tambah item;
- tombol Hapus item.

Contoh item boleh berupa PPh 21 dan BPJS Kesehatan, tetapi nominalnya diinput
manual dan tidak dihitung otomatis.

### Ringkasan

- Total pendapatan = jumlah seluruh item pendapatan;
- Total pengurangan = jumlah seluruh item pengurangan;
- Take Home Pay = Total pendapatan - Total pengurangan.

Hitung ulang semua total di backend. Format nominal menggunakan Rupiah
Indonesia. Tolak nominal negatif, item tanpa nama, nilai tidak valid, dan
Take Home Pay negatif saat Publish.

### Informasi tambahan

- catatan opsional;
- disetujui oleh: nama dan jabatan;
- diterima oleh: nama dan jabatan karyawan;
- status Draft, Published, dan bila diperlukan Dibatalkan.

## Layout halaman admin

Gunakan pola visual halaman Admin yang sudah ada:

- judul halaman Penggajian;
- tombol Tambah Slip Gaji;
- filter bulan/tahun;
- filter karyawan;
- filter divisi;
- filter status;
- tabel daftar slip;
- pagination;
- aksi Detail/Preview, Edit, Publish, Hapus, dan Unduh PDF;
- loading state;
- empty state;
- error state;
- validasi form;
- konfirmasi sebelum Publish dan Hapus;
- dukungan light mode dan dark mode;
- responsive desktop/tablet/mobile;
- tidak boleh ada horizontal overflow.

Kolom tabel Admin minimal:

- periode;
- nama karyawan;
- kode/ID karyawan;
- divisi;
- total hari kerja;
- total pendapatan;
- total pengurangan;
- Take Home Pay;
- status;
- tanggal bayar;
- aksi.

## Ketentuan template PDF GDK

Gunakan file Slip Gaji Format GDK.pdf sebagai template utama hasil cetak slip
gaji, bukan hanya sebagai inspirasi warna.

Template yang dikirim adalah satu halaman A4 portrait. Pertahankan:

- ukuran halaman A4;
- orientasi portrait;
- margin dan ruang putih utama;
- posisi logo di kiri atas;
- identitas perusahaan di sebelah logo;
- periode slip di kanan atas;
- bagian Rincian karyawan;
- garis pemisah setelah rincian karyawan;
- tabel dua sisi Pendapatan dan Pengurangan;
- baris Total pendapatan dan Total pengurangan;
- blok Take Home Pay dengan area nominal yang menonjol;
- area Catatan;
- area Disetujui oleh;
- area Diterima oleh;
- hierarki font, alignment, warna, dan jarak yang sedekat mungkin dengan PDF.

Perubahan wajib terhadap template:

- ganti label Golongan menjadi Total hari kerja;
- ganti nilai contoh Golongan 3 dengan nilai Total hari kerja dari data slip;
- hapus seluruh teks footer yang menyebut Talenta payslip generator atau
  Mekari Talenta;
- jangan menampilkan data contoh seperti Devan, API201, Develop, atau nominal
  contoh;
- semua data pada PDF harus berasal dari slip yang sedang dicetak;
- jangan hardcode bulan, nama, jabatan, nominal, tanggal, atau tanda tangan.

Urutan visual PDF harus:

1. Logo dan identitas perusahaan di kiri atas.
2. Teks Slip gaji untuk bulan dan periode di kanan atas.
3. Rincian karyawan dua kolom:
   - sisi kiri: Nama karyawan, ID karyawan, Jabatan, Departemen;
   - sisi kanan: Total hari kerja, Payroll cut off, Tanggal bayar.
4. Rincian penghasilan.
5. Tabel dua sisi:
   - kiri: Pendapatan dan Jumlah;
   - kanan: Pengurangan dan Jumlah.
6. Total pendapatan dan Total pengurangan.
7. Take Home Pay.
8. Catatan, Disetujui oleh, dan Diterima oleh.

Jangan menampilkan bagian upload logo, input form, tombol aplikasi, atau
kontrol Admin pada PDF. PDF hanya berisi slip final untuk dibaca atau dicetak.

Implementasikan PDF dengan salah satu pendekatan yang paling sesuai dengan
repository:

- gunakan PDF template sebagai background lalu overlay data dinamis pada
  koordinat yang tepat; atau
- reproduksi layout template secara programatis pada ukuran A4 jika overlay
  tidak stabil.

Jika file PDF perlu dimasukkan ke repository, simpan pada folder asset/template
yang sesuai, jangan bergantung pada path komputer pribadi setelah deployment.
Jangan mengubah file referensi asli. Pastikan font, logo, warna, dan layout tetap
terbaca ketika dicetak.

Jika jumlah item pendapatan atau pengurangan melebihi baris normal template:

- tambahkan baris secara rapi dan dorong bagian total ke bawah selama masih
  muat dalam satu halaman A4; atau
- buat halaman lanjutan dengan header yang konsisten jika benar-benar overflow.

Untuk jumlah item normal, hasil harus tetap satu halaman A4 seperti template.

Nama file PDF:

slip-gaji-{employee_code}-{YYYY-MM}.pdf

## Rancangan data dan backend

Ikuti arsitektur Go/Fiber/GORM, PostgreSQL, middleware role, dan audit log yang
sudah ada.

Buat model payroll/slip gaji minimal dengan:

- ID;
- employee_id dan/atau user_id;
- periode_bulan;
- payroll_cutoff_start;
- payroll_cutoff_end;
- payment_date;
- snapshot nama, kode/ID, NIK, jabatan, dan divisi;
- total_hari_kerja sebagai integer;
- snapshot identitas perusahaan bila diperlukan;
- total_income;
- total_deduction;
- take_home_pay;
- notes;
- approved_by_name;
- approved_by_position;
- received_by_name;
- received_by_position;
- status;
- published_at;
- created_by;
- updated_by;
- timestamp standar.

Jangan menambahkan kolom atau relasi Golongan pada model payroll.

Buat tabel anak untuk item pendapatan dan pengurangan dengan:

- ID;
- payroll_id;
- tipe income atau deduction;
- nama item;
- nominal Rupiah;
- urutan tampilan;
- timestamp.

Gunakan numeric/decimal atau integer yang aman untuk uang. Jangan gunakan float
untuk menghitung nominal uang.

Tambahkan unique constraint agar satu karyawan tidak memiliki lebih dari satu
slip untuk periode yang sama, kecuali ada mekanisme revisi/versioning yang jelas.

Buat migration SQL baru di backend/migrations/. Sesuaikan AutoMigrate hanya
sesuai pola repository dan pastikan migration aman dijalankan ulang.

Endpoint minimal:

- GET /api/v1/admin/payroll;
- GET /api/v1/admin/payroll/:id;
- POST /api/v1/admin/payroll;
- PUT /api/v1/admin/payroll/:id untuk Draft;
- DELETE /api/v1/admin/payroll/:id untuk Draft;
- POST /api/v1/admin/payroll/:id/publish;
- GET /api/v1/admin/payroll/:id/pdf;
- GET /api/v1/employee/payroll;
- GET /api/v1/employee/payroll/:id.

Aturan endpoint:

- create, edit, publish, dan delete hanya role HRD;
- endpoint karyawan mengambil user ID dari JWT;
- jangan menerima user ID bebas dari client untuk menentukan pemilik data;
- Draft tidak boleh dikirim ke endpoint karyawan;
- kepemilikan slip wajib diverifikasi di backend;
- create, edit, publish, dan delete dicatat ke audit log;
- Published tidak boleh diedit atau dihapus melalui endpoint biasa.

Validasi backend:

- karyawan ada dan sesuai status aktif;
- periode, cut-off, dan tanggal bayar valid;
- tanggal mulai cut-off tidak lebih besar dari tanggal selesai;
- total hari kerja berupa integer dan tidak negatif;
- minimal ada satu item pendapatan;
- nama item tidak kosong;
- nominal item tidak negatif;
- total dihitung ulang di backend;
- total dari frontend tidak boleh dipercaya;
- Take Home Pay negatif ditolak saat Publish;
- duplikasi slip karyawan-periode ditolak dengan pesan jelas.

## Integrasi repository

Periksa file yang benar-benar ada dan ikuti pola dari:

- frontend/src/app/app.routes.ts;
- frontend/src/app/features/shared/shared-sidebar/
  shared-sidebar.component.html;
- frontend/src/app/features/admin/admin-dashboard/;
- frontend/src/app/core/services/;
- backend/cmd/api/main.go;
- backend/internal/handlers/;
- backend/internal/models/;
- backend/config/database.go;
- service export atau PDF yang sudah tersedia.

Gunakan standalone component dan import Angular yang sesuai. Reuse service HTTP,
alert, modal, tabel, pagination, token warna, dan export yang sudah ada. Jika
logo disimpan, gunakan mekanisme storage dan validasi file yang sudah tersedia.
Jangan menyimpan token, secret, atau data sensitif ke PDF maupun log.

## Pengujian wajib

Tambahkan atau perbarui unit test, component test, dan handler test untuk:

1. route /admin/payroll hanya dapat dibuka oleh HRD;
2. navbar Admin menampilkan menu Penggajian dan menu aktif pada route yang benar;
3. role non-HRD ditolak saat create, edit, publish, dan delete;
4. HRD dapat membuat Draft dengan total hari kerja;
5. total pendapatan, total pengurangan, dan Take Home Pay benar;
6. total hari kerja kosong, negatif, desimal, atau tidak valid ditolak;
7. nominal negatif, item kosong, periode/cut-off/tanggal bayar invalid ditolak;
8. duplikasi slip karyawan-periode ditolak;
9. Draft dapat diedit/dihapus, Published tidak dapat diubah;
10. karyawan hanya melihat slip miliknya yang Published;
11. karyawan tidak dapat membaca Draft atau slip user lain;
12. Snapshot total hari kerja tetap konsisten;
13. Preview menggunakan data slip yang sedang dipilih;
14. PDF berukuran A4 portrait dan normalnya hanya satu halaman;
15. PDF memiliki layout template GDK, termasuk logo, identitas, tabel, total,
    Take Home Pay, catatan, penyetuju, dan penerima;
16. PDF tidak menampilkan Golongan, data contoh, atau footer Talenta/Mekari;
17. PDF tidak memotong nominal, teks, tabel, atau tanda tangan;
18. item tambahan ditampilkan rapi dan overflow ditangani;
19. audit log tercatat untuk create, update, publish, dan delete;
20. tidak ada error TypeScript, Go test, API, atau console browser.

Sebelum selesai:

- tampilkan ringkasan file yang diubah;
- tampilkan route dan menu navbar yang ditambahkan;
- tampilkan endpoint yang ditambahkan;
- jelaskan cara template PDF GDK digunakan;
- pastikan tidak ada implementasi field Golongan;
- jelaskan penyimpanan nominal uang dan Total hari kerja;
- jalankan formatter dan test yang relevan;
- jalankan build frontend dan test backend bila lingkungan mendukung;
- verifikasi migration pada database uji;
- cetak atau buka hasil PDF dan bandingkan dengan template;
- tampilkan hasil pengujian dan keterbatasan yang masih tersisa.
~~~
