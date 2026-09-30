# BAB VIII — RUANG LINGKUP DAN KOMPONEN SISTEM

Sistem Absensi Golan dikembangkan sebagai aplikasi absensi dan administrasi kehadiran
berbasis web untuk PT Golan Digital Kreatif. Komponen sistem dikelompokkan berdasarkan
role pengguna dan kewenangan terhadap data. Seluruh pembatasan akses wajib diterapkan pada
backend; pembatasan menu dan route pada frontend berfungsi sebagai lapisan pengalaman
pengguna tambahan.

Dokumen ini menyesuaikan referensi komponen sistem ke konteks Absensi Golan. Modul
keuangan seperti invoice, pajak, anggaran, jurnal double-entry, dan Approval Matrix
transaksi tidak termasuk dalam ruang lingkup sistem ini.

## 8.1 Role dan scope akses

| Role | Fokus utama | Scope data |
| --- | --- | --- |
| Karyawan | Absensi, riwayat, izin/cuti, laporan kerja, profil, dan notifikasi | Data pribadi dan pengajuan sendiri |
| Magang | Absensi, izin yang diizinkan, logbook, mentor, statistik, dokumen, dan sertifikat | Data pribadi dan logbook sendiri |
| Manajer | Dashboard, kehadiran tim, laporan tim, statistik, approval, dan review sesuai kewenangan | Tim yang menjadi tanggung jawabnya |
| HRD/Admin | Master data, konfigurasi, approval, rekap, laporan, audit, backup, dan operasional | Seluruh organisasi sesuai kewenangan |

Role dan scope disimpan serta diperiksa pada backend. Pengguna yang mencoba membuka URL
atau endpoint di luar kewenangannya harus menerima penolakan akses, termasuk respons `403`
untuk route yang memerlukan role tertentu.

## 8.2 Autentikasi dan dashboard

Komponen ini digunakan oleh seluruh pengguna yang berhasil masuk ke aplikasi.

### 8.2.1 Login dan sesi pengguna

1. Pengguna masuk menggunakan alamat email terdaftar dan password.
2. Form login menyediakan captcha matematika sederhana sebagai pemeriksaan tambahan pada
   antarmuka.
3. Password disimpan dalam bentuk hash bcrypt dan tidak disimpan sebagai teks biasa.
4. Backend menerbitkan token JWT setelah kredensial berhasil diverifikasi.
5. Redis digunakan untuk mengelola sesi aktif dan pencabutan token. Login pada perangkat
   lain dapat menggantikan sesi sebelumnya sesuai aturan sistem.
6. Logout mencabut token aktif dan mencatat aktivitas login atau logout ke audit log.

### 8.2.2 Pemulihan dan keamanan akun

- Pengguna dapat meminta pemulihan password melalui email.
- Sistem mengirimkan OTP pemulihan yang memiliki masa berlaku dan batas percobaan.
- Password baru wajib memenuhi aturan minimal yang ditetapkan sistem.
- Pengguna dapat memperbarui data profil yang diizinkan, foto profil, email, dan password
  melalui halaman **Profil Saya**.
- Perubahan data kepegawaian seperti role, divisi, jabatan, status, jadwal, atau penempatan
  dilakukan oleh HRD/Admin melalui modul administrasi.

### 8.2.3 Dashboard dan informasi ringkasan

Dashboard menampilkan data sesuai role dan scope pengguna, antara lain:

- status absensi hari berjalan;
- ringkasan hadir, terlambat, izin, cuti, alpha, dan belum check-out;
- statistik kehadiran pribadi atau statistik tim;
- pengajuan yang menunggu tindakan;
- laporan kerja dan kepatuhan pelaporan;
- agenda atau event perusahaan;
- notifikasi dan aktivitas operasional yang relevan.

Dashboard HRD menampilkan ringkasan organisasi dan tindak lanjut administrasi. Dashboard
Manajer menampilkan data timnya, sedangkan Karyawan dan Magang hanya melihat data pribadi
serta data proses yang menjadi haknya.

### 8.2.4 Notifikasi dan pembaruan status

Sistem menyediakan notifikasi in-app untuk aktivitas penting, seperti check-in, check-out,
pengajuan izin/cuti, perubahan status approval, laporan kerja, logbook, dan proses
administrasi. Status notifikasi dapat ditandai telah dibaca. Jika koneksi realtime
tersedia, pembaruan dikirim melalui WebSocket; halaman tetap menyediakan pemuatan ulang
data apabila koneksi realtime tidak tersedia.

## 8.3 Komponen Karyawan

Karyawan merupakan pengguna yang mengelola absensi dan pengajuan pribadinya.

### 8.3.1 Absensi pribadi

Karyawan dapat melakukan hal-hal berikut:

- memilih tipe kerja yang tersedia, seperti WFO, WFH, atau tipe custom;
- melakukan check-in dan check-out melalui browser;
- memberikan akses GPS dan kamera ketika diminta aplikasi;
- melihat posisi serta validasi jarak terhadap geofence yang berlaku;
- mengambil selfie langsung dari kamera sebagai bukti absensi;
- melihat waktu, koordinat, akurasi, tipe kerja, foto, status, dan durasi kerja;
- melihat riwayat absensi dan statistik kehadiran pribadi.

Backend memvalidasi ulang jadwal, waktu, tipe kerja, koordinat, akurasi, geofence, status
izin/cuti, dan bukti foto. Check-in atau check-out ditolak apabila lokasi tidak valid,
data wajib belum lengkap, perangkat menolak GPS/kamera, atau pengguna sedang berada dalam
periode izin/cuti aktif.

### 8.3.2 Pengajuan izin dan cuti

Karyawan dapat membuat pengajuan dengan mengisi:

- jenis pengajuan;
- tanggal mulai dan tanggal selesai;
- alasan;
- lampiran apabila diwajibkan oleh jenis pengajuan; dan
- informasi pendukung lain yang disediakan formulir.

Sistem memeriksa tanggal, hari kerja, konflik periode, masa kerja, kelengkapan lampiran,
dan kuota untuk jenis pengajuan yang menggunakan kuota. Pengajuan dapat memiliki status
`PENDING`, `APPROVED`, `REJECTED`, atau `CANCELLED`. Hasil approval dan catatan reviewer
dikirimkan melalui notifikasi.

### 8.3.3 Laporan kerja

Karyawan dapat mengisi laporan kerja harian dengan status draft atau mengirimkannya untuk
diproses sesuai alur sistem. Komponen laporan dapat memuat kegiatan, hasil atau realisasi,
kendala, rencana tindak lanjut, catatan tambahan, tautan, dan lampiran apabila tersedia.

Sistem memeriksa tanggal laporan, kelengkapan data, batas waktu pengiriman, dan duplikasi.
Laporan yang belum dibuat setelah batas waktu dapat ditandai sebagai **Tidak membuat
laporan kerja** untuk kebutuhan monitoring HRD.

### 8.3.4 Profil, notifikasi, dan informasi pembimbing

Karyawan dapat melihat profil, mengubah data yang diizinkan, mengelola preferensi tertentu,
membaca notifikasi, melihat informasi Manajer atau pembimbing, serta menggunakan halaman
bantuan aplikasi.

## 8.4 Komponen Magang

Peserta Magang memiliki alur absensi pribadi dan komponen pendukung kegiatan magang.

### 8.4.1 Absensi dan pengajuan

Peserta Magang dapat melakukan check-in, check-out, melihat riwayat, dan melihat statistik
kehadiran sesuai jadwal serta tipe kerja yang dikonfigurasi. Peserta Magang dapat mengajukan
jenis izin yang diizinkan kebijakan perusahaan. Peserta Magang tidak diperbolehkan
mengajukan Cuti pada alur cuti tahunan.

### 8.4.2 Logbook magang

Peserta Magang dapat:

- membuat logbook berdasarkan tanggal atau kegiatan;
- menyimpan logbook sebagai draft;
- mengirim logbook untuk direview;
- melihat status dan catatan review; dan
- memperbaiki atau mengirim ulang logbook sesuai alur yang berlaku.

Status utama logbook adalah `DRAFT`, `SUBMITTED`, `APPROVED`, dan `REJECTED`. Reviewer
melakukan pemeriksaan berdasarkan relasi mentor atau Manajer serta scope peserta yang
menjadi tanggung jawabnya.

### 8.4.3 Mentor, statistik, dokumen, dan sertifikat

Peserta Magang dapat melihat informasi mentor atau Manajer, statistik kehadiran dan progres,
dokumen magang yang tersedia, serta sertifikat yang diterbitkan atau diunggah HRD sesuai
kewenangannya. Akses terhadap dokumen dan sertifikat dibatasi agar peserta hanya melihat
data miliknya sendiri.

## 8.5 Komponen Manajer

Manajer dapat melakukan absensi pribadi sekaligus memantau dan menindaklanjuti data tim
yang berada dalam tanggung jawabnya.

### 8.5.1 Dashboard dan kehadiran tim

Manajer dapat melihat:

- status kehadiran anggota tim;
- detail check-in dan check-out sesuai scope;
- keterlambatan, izin, cuti, alpha, dan belum check-out;
- statistik kehadiran per anggota atau periode; dan
- pembaruan kehadiran yang tersedia secara realtime.

Manajer tidak dapat membuka data anggota tim lain di luar scope, meskipun parameter URL
atau permintaan API diubah secara langsung.

### 8.5.2 Laporan kerja dan logbook

Manajer dapat membuka laporan kerja anggota tim, melihat isi dan lampiran yang berwenang,
memberikan catatan review, serta menyetujui atau meminta perbaikan sesuai status dan alur
yang berlaku. Untuk peserta Magang yang berada dalam scope-nya, Manajer atau mentor dapat
melakukan review logbook dan menyimpan catatan hasil review.

### 8.5.3 Approval izin/cuti

Manajer dapat memproses pengajuan izin/cuti anggota tim yang masuk ke jalur approval-nya.
Manajer dapat menyetujui atau menolak pengajuan dengan alasan atau catatan yang diperlukan.
Pengajuan yang menjadi kewenangan HRD tetap diproses oleh HRD/Admin.

### 8.5.4 Export dan tindak lanjut tim

Manajer dapat melihat atau mengekspor data tim apabila permission dan halaman yang digunakan
menyediakan fungsi tersebut. Data export harus mengikuti filter periode, divisi, dan scope
tim serta tidak boleh memuat data organisasi di luar kewenangannya.

## 8.6 Komponen HRD/Admin

HRD/Admin memiliki kewenangan administrasi organisasi, konfigurasi, approval, rekap, audit,
dan operasional sistem.

### 8.6.1 Dashboard dan administrasi karyawan

HRD/Admin dapat mengelola data karyawan dan akun, termasuk:

- menambah, melihat, mengubah, menonaktifkan, atau mengelola siklus hidup karyawan;
- mengatur role Karyawan, Magang, Manajer, atau HRD sesuai kewenangan;
- mengelola NIK/kode karyawan, email, divisi, jabatan, project atau tim;
- mengatur Manajer, mentor, jadwal, shift, status, dan informasi pendukung;
- melakukan impor atau ekspor data karyawan apabila fungsi tersebut tersedia; dan
- mereset akses atau membantu pemulihan akun pengguna.

Data historis transaksi kehadiran, pengajuan, laporan, dan audit tetap dijaga sesuai aturan
retensi ketika akun atau karyawan dinonaktifkan.

### 8.6.2 Organisasi, divisi, jabatan, dan project/team

Modul organisasi menyediakan pengelolaan struktur organisasi yang digunakan oleh absensi,
scope Manajer, laporan, dan dashboard, meliputi:

- divisi;
- jabatan;
- project atau team;
- relasi Manajer dan anggota tim; serta
- status aktif/nonaktif data organisasi.

### 8.6.3 Tipe kerja, jadwal, shift, dan hari kerja

HRD/Admin dapat mengatur parameter yang menjadi dasar validasi absensi, antara lain:

- tipe kerja WFO, WFH, atau tipe custom;
- jadwal reguler dan shift;
- jam mulai dan selesai kerja;
- hari kerja per jadwal;
- toleransi keterlambatan dan batas terkait laporan kerja;
- kalender hari libur nasional, cuti bersama, dan event perusahaan; serta
- penugasan jadwal kepada karyawan atau kelompok pengguna.

Perubahan konfigurasi baru digunakan oleh transaksi berikutnya sesuai aturan sistem dan
tidak boleh menghilangkan histori absensi yang telah tersimpan.

### 8.6.4 Geofence kantor dan lokasi WFH

HRD/Admin dapat mengelola lokasi yang digunakan untuk validasi GPS, meliputi:

- titik koordinat dan radius geofence kantor;
- lokasi rumah karyawan untuk kebutuhan WFH;
- permintaan perubahan lokasi rumah dari pengguna;
- persetujuan atau penolakan permintaan perubahan lokasi; dan
- status aktif lokasi yang dapat digunakan dalam absensi.

Koordinat, radius, dan alamat merupakan data sensitif. Aksesnya harus dibatasi kepada
pemilik data dan role yang memiliki kewenangan administrasi.

### 8.6.5 Kuota dan kebijakan izin/cuti

HRD/Admin dapat:

- membuat, melihat, mengubah, dan menghapus kuota berdasarkan karyawan, tahun, dan jenis;
- mengatur minimum masa kerja untuk Cuti;
- mengatur default kuota Cuti;
- mengatur toleransi pengiriman laporan kerja;
- meninjau pengajuan izin/cuti seluruh organisasi;
- menyetujui, menolak, atau memproses pembatalan sesuai status; dan
- memastikan perubahan status pengajuan tercermin pada kuota dan rekap absensi.

Jenis Cuti dan Lainnya dapat menggunakan kuota sesuai aturan backend, sedangkan Sakit tidak
diperlakukan sebagai kuota cuti tahunan pada fungsi reservasi. Perubahan default kuota tidak
otomatis mengubah kuota yang sudah tersimpan.

### 8.6.6 Approval dan operasional magang

HRD/Admin dapat mengelola proses administrasi yang terkait dengan role dan kegiatan magang,
termasuk penempatan mentor atau Manajer, pemantauan logbook, dokumen internship, serta
sertifikat sesuai fitur dan kewenangan yang tersedia. HRD/Admin juga dapat melihat proses
yang perlu ditindaklanjuti oleh Manajer atau reviewer lain.

### 8.6.7 Rekap, laporan, dan export

HRD/Admin dapat mengakses rekap dan laporan organisasi berdasarkan filter yang tersedia,
antara lain:

- rekap harian, mingguan, dan bulanan;
- laporan keterlambatan;
- laporan alpha atau belum hadir;
- status izin dan cuti;
- statistik kehadiran per divisi, jabatan, project, atau periode;
- laporan kerja dan kepatuhan pengiriman; serta
- laporan atau statistik peserta Magang.

Fitur cetak dan export mengikuti permission, filter, periode, dan format yang disediakan
oleh masing-masing halaman. Data pribadi, koordinat, foto, lampiran, dan informasi sensitif
tidak boleh ikut diekspor tanpa kewenangan.

### 8.6.8 Pengaturan umum dan notifikasi

HRD/Admin dapat mengelola pengaturan umum yang digunakan oleh aplikasi, seperti identitas
organisasi, kontak helpdesk, aturan absensi, aturan cuti dan laporan kerja, pengaturan
notifikasi, serta event perusahaan. Pengaturan notifikasi dapat menentukan jenis pemberitahuan
yang aktif untuk role tertentu melalui kanal yang didukung aplikasi.

### 8.6.9 Audit log dan backup

HRD/Admin dapat:

- melihat aktivitas penting pengguna dan perubahan data;
- menelusuri waktu, aktor, aksi, objek, status, dan detail perubahan yang dicatat;
- mengekspor audit log apabila fitur tersebut diizinkan;
- membuat backup penuh atau backup modul tertentu;
- memeriksa isi file backup sebelum pemulihan; dan
- melakukan restore dengan konfirmasi serta penanganan rollback sesuai implementasi.

Backup harus disimpan pada lokasi aman dan diuji secara berkala. Audit log tidak boleh
dijadikan pengganti backup, dan backup tidak boleh dibagikan kepada pengguna yang tidak
memiliki kewenangan.

## 8.7 Komponen lintas peran dan aturan bisnis

### 8.7.1 Status utama

| Entitas | Status utama | Keterangan |
| --- | --- | --- |
| Absensi | Belum absen, Hadir, Terlambat, Izin, Cuti, Alpha, Belum check-out | Status ditentukan dari absensi, jadwal, hari libur, dan pengajuan yang berlaku. |
| Pengajuan izin/cuti | Pending, Approved, Rejected, Cancelled | Status berubah melalui validasi dan tindakan reviewer yang berwenang. |
| Laporan kerja | Draft, Submitted, Approved, Rejected, Tidak membuat laporan kerja | Status mencerminkan proses pengiriman dan review laporan. |
| Logbook Magang | Draft, Submitted, Approved, Rejected | Status mencerminkan proses pengiriman dan review logbook. |
| Lokasi WFH | Pending, Approved, Rejected, Aktif | Status mencerminkan permintaan dan lokasi yang dapat digunakan. |

### 8.7.2 Aturan tanggal dan waktu

Perhitungan tanggal bisnis menggunakan timezone **Asia/Jakarta (WIB)**. Perhitungan hari
kerja mempertimbangkan jadwal, shift, hari libur, dan periode izin/cuti. Shift yang melewati
tengah malam harus diproses berdasarkan aturan shift yang tersimpan, bukan hanya tanggal
kalender pada browser.

### 8.7.3 Keamanan data dan file

- JWT, middleware autentikasi, role guard, dan pemeriksaan scope membatasi akses endpoint.
- Validasi lokasi dilakukan ulang di backend; hasil perhitungan frontend tidak menjadi satu-
  satunya dasar penerimaan absensi.
- Upload selfie, lampiran laporan, dokumen, dan foto profil harus memeriksa ukuran, MIME
  type, ekstensi, dan nama file.
- Data koordinat, alamat rumah, selfie, dokumen, dan data pribadi hanya ditampilkan kepada
  pemilik atau role yang berwenang.
- Pesan kesalahan kepada pengguna harus cukup jelas untuk memperbaiki input tanpa membuka
  detail internal database atau secret aplikasi.
- Perubahan master data, approval, penghapusan, perubahan status, dan konfigurasi penting
  dicatat pada audit log sesuai implementasi.

## 8.8 Batasan ruang lingkup

Komponen berikut tidak termasuk dalam pengembangan Absensi Golan pada tahap ini:

- payroll dan perhitungan gaji;
- perpajakan dan akuntansi perusahaan;
- rekrutmen dan onboarding penuh;
- penilaian kinerja formal;
- manajemen tugas atau proyek secara penuh;
- chat atau komunikasi internal umum;
- pengadaan, invoice, anggaran, rekening bank, dan jurnal keuangan; serta
- integrasi eksternal baru yang belum disepakati.

Integrasi payroll atau sistem lain dapat dipertimbangkan pada tahap lanjutan melalui API,
tetapi modul tersebut bukan bagian dari komponen absensi pada dokumen ini.

## 8.9 Status pelaksanaan tahap saat ini

Pemetaan dan dokumentasi tahap pertama mencakup login, identifikasi role, navigasi HRD,
dashboard HRD, pengelolaan karyawan, organisasi, tipe kerja, jadwal/shift, geofence kantor,
lokasi WFH, pengaturan umum, kuota izin/cuti, dan referensi screenshot halaman.

Pendalaman dan verifikasi end-to-end untuk approval cuti, rekap/export, laporan kerja,
audit log, backup, serta modul Karyawan, Magang, dan Manajer dilakukan secara bertahap sesuai
prioritas dan hasil persetujuan UAT. Pernyataan ruang lingkup di atas menunjukkan komponen
sistem yang menjadi acuan pengembangan dan dokumentasi, bukan pernyataan bahwa seluruh
skenario lanjutan telah selesai diuji pada tahap pertama.

## 8.10 Referensi implementasi

Pemetaan komponen dapat ditelusuri melalui referensi berikut:

- Route frontend utama: [`app.routes.ts`](../frontend/src/app/app.routes.ts)
- Handler autentikasi dan sesi: [`auth.go`](../backend/internal/handlers/auth.go)
- Middleware JWT dan role: [`auth.go`](../backend/internal/middleware/auth.go)
- Handler absensi: [`attendance.go`](../backend/internal/handlers/attendance.go)
- Handler izin/cuti: [`leave.go`](../backend/internal/handlers/leave.go)
- Handler laporan kerja: [`work_report.go`](../backend/internal/handlers/work_report.go)
- Handler modul internship: [`internship.go`](../backend/internal/handlers/internship.go)
- Handler administrasi karyawan: [`employee.go`](../backend/internal/handlers/employee.go)
- Handler pengaturan dan backup: [`settings.go`](../backend/internal/handlers/settings.go)
- Alur bisnis utama: [`WORKFLOW-SISTEM-ABSENSI-GOLAN.md`](./WORKFLOW-SISTEM-ABSENSI-GOLAN.md)
- Dokumen kebutuhan produk: [`PRD-Sistem-Absensi-Golan-Digital-Kreatif.md`](./PRD-Sistem-Absensi-Golan-Digital-Kreatif.md)

