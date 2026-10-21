# Prompt Implementasi Fitur Penggajian dan Slip Gaji

~~~text
Tambahkan fitur Penggajian/Slip Gaji pada aplikasi Absensi Golan Digital Kreatif.

Gunakan referensi struktur slip gaji dari:
https://www.talenta.co/tool-gratis/slip-gaji-online/

Gunakan gambar referensi yang diberikan user sebagai acuan tata letak dan
field. Jangan menyalin branding, logo, teks promosi, popup marketing, kuota
slip, input email marketing, atau footer Talenta.

## Batasan fitur

Fokus hanya pada pengelolaan penggajian dan pembuatan slip gaji. Semua nominal
gaji diinput manual oleh role HRD/Admin. Karyawan, Manajer, dan Magang tidak
boleh menginput atau mengubah nominal gajinya sendiri.

Jangan membuat fitur transfer bank, PPh 21 otomatis, BPJS otomatis, perhitungan
lembur/THR/bonus/pinjaman berbasis absensi, payroll disbursement,
reimbursement, atau compensation planning.

Nominal pendapatan dan pengurangan adalah input manual HRD. Sistem hanya
menjumlahkan nominal yang diinput. Jangan menebak tarif pajak atau aturan
ketenagakerjaan.

## Hak akses dan alur

HRD/Admin dapat:
- melihat daftar slip berdasarkan periode, karyawan, divisi, dan status;
- membuat slip untuk karyawan aktif;
- memilih periode bulan/tahun;
- mengisi total hari kerja dan seluruh komponen gaji;
- menyimpan Draft;
- membuka Preview;
- menerbitkan atau Publish slip;
- mengunduh PDF;
- mengedit atau menghapus hanya slip Draft;
- melihat slip Published dan histori perubahan.

Karyawan, Manajer, dan Magang:
- hanya dapat melihat slip miliknya sendiri;
- hanya dapat melihat slip berstatus Published;
- dapat membuka Preview dan mengunduh PDF;
- tidak dapat membuat, mengedit, menghapus, atau Publish slip;
- tidak boleh mengakses slip user lain dengan mengganti ID pada URL atau API.

Terapkan pembatasan di frontend dan backend. Jangan hanya menyembunyikan
tombol pada UI.

## Field slip gaji

### Informasi perusahaan

- logo opsional JPG/PNG/SVG maksimal 1 MB;
- nama perusahaan;
- nomor telepon perusahaan.

Gunakan identitas perusahaan dari Pengaturan Umum yang sudah ada bila tersedia.
Jangan membuat sumber data perusahaan duplikat tanpa alasan.

### Periode pembayaran

- bulan dan tahun slip, format YYYY-MM atau input month;
- payroll cut-off tanggal mulai dan tanggal selesai;
- tanggal bayar.

### Rincian karyawan

Ambil data dari master karyawan berdasarkan karyawan yang dipilih, lalu simpan
snapshot pada slip agar histori tidak berubah ketika profil karyawan berubah:

- nama karyawan;
- ID atau kode karyawan;
- NIK bila tersedia;
- jabatan;
- departemen atau divisi;
- total hari kerja pada periode payroll.

PENTING:
- Jangan menampilkan atau membuat field Golongan;
- ganti sepenuhnya field Golongan pada referensi menjadi Total hari kerja;
- Total hari kerja berupa bilangan bulat minimal 0;
- Total hari kerja diinput oleh HRD/Admin pada form slip gaji;
- simpan Total hari kerja sebagai snapshot pada slip;
- jangan mengubah master karyawan hanya untuk menambahkan field ini;
- jangan menghitung otomatis dari absensi pada tahap ini, kecuali repository
  sudah memiliki mekanisme yang siap digunakan tanpa memperluas scope fitur.

### Rincian penghasilan

Buat daftar item dinamis yang berisi:

- nama pendapatan;
- nominal Rupiah;
- tombol Tambah item;
- tombol Hapus item.

Sediakan item awal seperti Gaji pokok dan Uang makan, tetapi HRD tetap dapat
mengubah, menambah, atau menghapus item.

### Rincian pengurangan

Buat daftar item dinamis yang berisi:

- nama pengurangan;
- nominal Rupiah;
- tombol Tambah item;
- tombol Hapus item.

Contoh item boleh berupa PPh 21 dan BPJS Kesehatan, tetapi nominal tetap
diinput manual dan tidak dihitung otomatis.

### Ringkasan

- Total pendapatan = jumlah seluruh item pendapatan;
- Total pengurangan = jumlah seluruh item pengurangan;
- Take Home Pay = Total pendapatan - Total pengurangan.

Hitung ulang semua total di backend. Formatkan nominal sebagai Rupiah
Indonesia. Tolak nominal negatif, item tanpa nama, nilai tidak valid, dan
Take Home Pay negatif saat Publish.

### Informasi tambahan

- catatan opsional;
- disetujui oleh: nama dan jabatan pihak HRD/penyetuju;
- diterima oleh: nama dan jabatan karyawan;
- status: Draft, Published, dan bila diperlukan Dibatalkan.

## Tampilan dan UX

Buat halaman Admin Penggajian dengan pola visual halaman admin yang sudah ada:

- route yang disarankan: /admin/payroll;
- judul Penggajian atau Slip Gaji;
- filter periode, karyawan, divisi, dan status;
- tabel periode, karyawan, divisi, total hari kerja, total pendapatan,
  total pengurangan, take home pay, status, tanggal bayar, dan aksi;
- tombol Tambah Slip Gaji;
- form dua kolom pada desktop dan satu kolom pada mobile;
- tabel pendapatan dan pengurangan menyerupai gambar referensi;
- Total hari kerja berada pada bagian Rincian karyawan;
- Take Home Pay menjadi ringkasan paling menonjol;
- tombol Simpan Draft, Preview, Publish, Edit, Hapus, dan Unduh Slip Gaji;
- loading state, empty state, error state, validasi, dan konfirmasi;
- dukungan light mode, dark mode, keyboard navigation, label form, dan
  responsive layout;
- tidak boleh ada horizontal overflow.

Tambahkan menu Penggajian hanya pada navigasi HRD/Admin. Jika diperlukan
halaman karyawan, gunakan route /employee/payroll atau /employee/payslips dan
tampilkan menu Slip Gaji hanya bagi Karyawan, Manajer, dan Magang.

Preview/PDF wajib memuat:

- logo dan identitas perusahaan;
- periode slip;
- data karyawan;
- total hari kerja;
- payroll cut-off dan tanggal bayar;
- tabel pendapatan;
- tabel pengurangan;
- total pendapatan;
- total pengurangan;
- take home pay;
- catatan;
- pihak penyetuju;
- pihak penerima.

Gunakan ukuran kertas A4 dan nama file:
slip-gaji-{employee_code}-{YYYY-MM}.pdf

## Rancangan data dan backend

Ikuti arsitektur Go/Fiber/GORM, PostgreSQL, middleware role, dan audit log
yang sudah ada.

Buat model payroll/slip gaji minimal dengan:

- ID;
- employee_id dan/atau user_id;
- periode_bulan;
- payroll_cutoff_start;
- payroll_cutoff_end;
- payment_date;
- snapshot nama, kode/ID, NIK, jabatan, divisi;
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

Jangan menambahkan kolom atau relasi Golongan pada model payroll baru.

Buat tabel anak untuk item pendapatan dan pengurangan dengan:

- ID;
- payroll_id;
- tipe income atau deduction;
- nama item;
- nominal Rupiah;
- urutan tampilan;
- timestamp.

Gunakan tipe numeric/decimal atau integer yang aman untuk uang. Jangan gunakan
float untuk perhitungan nominal uang.

Tambahkan unique constraint agar satu karyawan tidak memiliki lebih dari satu
slip pada periode yang sama, kecuali tersedia mekanisme revisi yang jelas.

Buat migration SQL baru di backend/migrations/. Sesuaikan AutoMigrate hanya
sesuai pola repository dan pastikan migration aman dijalankan ulang.

Endpoint boleh mengikuti konvensi repository, minimal mencakup:

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
- kepemilikan slip harus diverifikasi di backend;
- create, edit, publish, dan delete dicatat ke audit log;
- Published tidak boleh diedit atau dihapus melalui endpoint biasa.

Validasi backend:

- karyawan ada dan memenuhi status aktif;
- periode, cut-off, dan tanggal bayar valid;
- tanggal mulai cut-off tidak lebih besar dari tanggal selesai;
- total hari kerja berupa integer dan tidak negatif;
- minimal ada satu item pendapatan;
- nama item tidak kosong;
- nominal item tidak negatif;
- total dihitung ulang di backend;
- total dari frontend tidak boleh dipercaya;
- take home pay negatif ditolak saat Publish;
- duplikasi slip karyawan dan periode ditolak dengan pesan jelas.

## Integrasi repository

Periksa file yang benar-benar ada dan ikuti pola dari:

- frontend/src/app/app.routes.ts;
- frontend/src/app/features/shared/shared-sidebar/
  shared-sidebar.component.html;
- komponen halaman admin;
- frontend/src/app/core/services/;
- backend/cmd/api/main.go;
- backend/internal/handlers/;
- backend/internal/models/;
- backend/config/database.go;
- service export atau PDF yang sudah tersedia.

Gunakan standalone component dan import Angular yang sesuai. Reuse service
HTTP, alert, modal, tabel, pagination, token warna, dan export yang sudah ada.
Jika logo disimpan, gunakan mekanisme storage dan validasi file yang sudah ada.
Jangan menyimpan token, secret, atau data sensitif ke PDF maupun log.

## Pengujian wajib

Tambahkan atau perbarui unit test dan handler test untuk:

1. role non-HRD ditolak saat create, edit, publish, dan delete;
2. HRD dapat membuat Draft dengan total hari kerja;
3. total pendapatan, total pengurangan, dan take home pay benar;
4. total hari kerja kosong, negatif, desimal, atau tidak valid ditolak;
5. nominal negatif, item kosong, periode/cut-off/tanggal bayar invalid ditolak;
6. duplikasi slip karyawan-periode ditolak;
7. Draft dapat diedit/dihapus, Published tidak dapat diubah;
8. karyawan hanya melihat slip miliknya yang Published;
9. karyawan tidak dapat membaca Draft atau slip user lain;
10. snapshot total hari kerja tidak berubah ketika data lain berubah;
11. filter periode, karyawan, divisi, status, dan pagination bekerja;
12. Preview dan PDF memuat total hari kerja serta seluruh komponen slip;
13. route/menu admin tidak terbuka bagi role non-HRD;
14. audit log tercatat untuk create, update, publish, dan delete;
15. tidak ada error TypeScript, Go test, API, atau console browser.

Sebelum selesai:

- tampilkan ringkasan file yang diubah;
- tampilkan endpoint yang ditambahkan;
- jelaskan penyimpanan total hari kerja;
- pastikan tidak ada implementasi field Golongan;
- jalankan formatter dan test yang relevan;
- jalankan build frontend dan test backend bila lingkungan mendukung;
- verifikasi migration pada database uji;
- tampilkan hasil pengujian dan keterbatasan yang masih tersisa.
~~~
