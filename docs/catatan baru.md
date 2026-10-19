# Alur Testing End-to-End Sistem Absensi Golan

Dokumen ini adalah checklist pengujian fungsional berbasis browser. Jalankan sesuai urutan: **Karyawan → Manajer → Admin/HRD → Magang**. Setiap langkah harus dicentang dan bukti berupa screenshot, file hasil ekspor, atau nomor data dicatat pada kolom catatan.

> **Catatan role:** pada aplikasi, role admin ditampilkan sebagai `HRD`. Istilah **Admin/HRD** pada dokumen ini berarti akun dengan role `HRD`.

## 1. Persiapan Pengujian

### 1.1 Lingkungan dan data uji

- [ ] Pastikan frontend, backend, database, object storage, dan layanan peta berjalan.
- [ ] Gunakan browser terbaru dalam mode incognito atau hapus sesi sebelumnya.
- [ ] Catat URL aplikasi, tanggal pengujian, versi/build, nama penguji, dan timezone `Asia/Jakarta`.
- [ ] Siapkan lokasi/GPS uji untuk WFO di dalam dan di luar radius geofence kantor.
- [ ] Siapkan lokasi/GPS uji untuk WFH yang berada di dalam dan di luar radius rumah.
- [ ] Siapkan kamera yang dapat mengambil foto selfie.
- [ ] Siapkan file JPG/PNG/WEBP untuk selfie/lampiran dan PDF untuk dokumen izin, sertifikat, serta backup.
- [ ] Jangan memakai data pribadi nyata pada screenshot. Samarkan email, NIK, alamat, koordinat, foto, token, dan password.

### 1.2 Akun uji

| Akun | Role | Kegunaan utama | Data yang perlu tersedia |
|---|---|---|---|
| `KARYAWAN_A` | Karyawan | Membuat absensi, izin/cuti, dan laporan kerja | Divisi, jabatan, project, shift, kuota cuti, manajer |
| `KARYAWAN_B` | Karyawan | Skenario pembatasan data dan pembanding | Berbeda divisi atau tim bila memungkinkan |
| `MANAJER_A` | MANAJER | Review data tim dan persetujuan | Memimpin tim `KARYAWAN_A` dan/atau `MAGANG_A` |
| `ADMIN_A` | HRD | Administrasi dan validasi akhir | Hak akses HRD aktif |
| `MAGANG_A` | MAGANG | Alur terakhir peserta magang | Institusi, periode magang, mentor/manajer |

### 1.3 Format pencatatan hasil

Untuk setiap skenario, catat: **Lulus**, **Gagal**, atau **Belum Diuji**. Jika gagal, tulis URL, langkah terakhir, pesan error, waktu kejadian, dan lampiran bukti.

---

## 2. Pengujian Umum Sebelum Masuk Role

### 2.1 Halaman publik dan autentikasi

1. Buka `/` dan pastikan halaman beranda tampil tanpa error.
2. Buka `/login`; pastikan form email, password, verifikasi matematika, tombol tampilkan password, dan tautan **Lupa password?** tersedia.
3. Kirim login dengan field kosong. Pastikan validasi tampil dan request tidak dilanjutkan.
4. Masukkan email/password salah dengan jawaban matematika benar. Pastikan login ditolak tanpa membuka dashboard.
5. Masukkan jawaban matematika salah. Pastikan muncul pesan validasi dan soal dibuat ulang.
6. Login menggunakan akun uji yang benar. Pastikan pengguna diarahkan ke dashboard sesuai role.
7. Uji **Lupa password** dengan email uji, lanjutkan verifikasi OTP 6 digit, kirim OTP salah, lalu kirim OTP benar.
8. Pada halaman reset password, uji password kurang dari 8 karakter, password tanpa kombinasi yang disyaratkan, konfirmasi berbeda, lalu password valid.
9. Login dengan password baru dan pastikan password lama tidak lagi diterima.

### 2.2 Otorisasi dan komponen bersama

1. Saat login sebagai tiap role, pastikan menu sidebar hanya menampilkan menu yang sesuai.
2. Buka `/help` dan uji pencarian, filter kategori FAQ, serta modal kontak bantuan.
3. Buka `/about` dan pastikan informasi aplikasi serta status layanan tampil.
4. Uji mode terang/gelap dari profil dan pastikan preferensi bertahan setelah reload.
5. Klik ikon notifikasi di topbar, buka satu notifikasi, lalu pastikan status terbaca berubah.
6. Logout, tekan tombol Back browser, dan pastikan halaman terlindungi tidak dapat digunakan tanpa login.
7. Dengan role yang salah, buka URL role lain secara langsung. Pastikan diarahkan ke `/403` atau ditolak oleh backend.

---

## 3. Alur 1 — Role Karyawan

Gunakan `KARYAWAN_A`. Skenario pada bagian ini membuat data yang akan diverifikasi oleh MANAJER dan ADMIN/HRD.

### 3.1 Dashboard dan navigasi karyawan

1. Login sebagai `KARYAWAN_A`; pastikan diarahkan ke `/employee/dashboard`.
2. Verifikasi nama/email, status absensi hari ini, kehadiran bulan berjalan, dan sisa cuti.
3. Pada **Kalender perusahaan**, pindah bulan, klik tanggal yang memiliki event, dan pastikan detail event/libur tampil.
4. Klik quick action **Mulai Check-in Harian** atau **Mulai Check-out Harian** sesuai kondisi akun.
5. Buka semua menu karyawan: dashboard, check-in/out, riwayat absensi, laporan kerja, statistik, pengajuan izin, relasi manajer, notifikasi, profil, dan bantuan.

### 3.2 Check-in dan check-out WFO

1. Buka `/employee/checkin` pada hari kerja dengan akun yang belum absen.
2. Tolak izin lokasi/kamera browser. Pastikan aplikasi menampilkan instruksi/error yang jelas dan tidak menyimpan absensi palsu.
3. Izinkan lokasi dan kamera; pastikan peta lokasi real-time, status geofence, dan tombol ambil foto tampil.
4. Pilih tipe event yang tersedia, ambil selfie valid, lalu kirim check-in dari lokasi kantor.
5. Pastikan berhasil tersimpan dengan waktu, koordinat, tipe kerja, foto, dan status hadir/terlambat yang benar.
6. Coba check-in kedua kali. Pastikan aplikasi mencegah duplikasi.
7. Buka `/employee/checkout`, ambil selfie check-out, dan kirim dari lokasi yang valid.
8. Pastikan status berubah menjadi selesai dan tombol check-out tidak dapat digunakan lagi pada hari yang sama.
9. Uji validasi foto dengan file tidak didukung/ukuran melebihi batas jika kontrol file tersedia.
10. Uji lokasi di luar geofence pada data/sesi uji terpisah. Pastikan check-in ditolak dan tidak membuat record absensi.
11. Uji route `/employee/checkout` ketika belum check-in. Pastikan sistem tidak membuat check-out yatim.
12. Uji kondisi hari libur, bukan hari kerja, absensi ditutup, dan hari dengan izin/cuti. Pesan dan tombol harus sesuai kondisi.

### 3.3 Riwayat absensi pribadi

1. Buka `/employee/history` dan pastikan data absensi milik `KARYAWAN_A` tampil, bukan data user lain.
2. Ganti tampilan **Tabel** ke **Kalender**, pindah bulan, dan kembali ke bulan berjalan.
3. Buka detail satu record; verifikasi jam masuk, jam pulang, durasi, status, tipe kerja, koordinat, dan foto selfie.
4. Pastikan record tanpa check-out diberi status **Belum Check-out** dan dibedakan dari hadir lengkap.
5. Reload halaman dan pastikan riwayat tetap konsisten.

### 3.4 Pengajuan izin/cuti

1. Buka `/employee/leaves`; pastikan sisa kuota, terpakai, dan sedang diproses tampil.
2. Uji submit form tanpa jenis, tanggal, alasan, atau lampiran. Pastikan validasi wajib tampil.
3. Ajukan izin sakit dengan tanggal valid dan lampiran PDF/JPG/PNG yang diizinkan.
4. Ajukan cuti dalam batas kuota. Pastikan jumlah hari kerja dan sisa kuota dihitung benar.
5. Coba mengajukan cuti melebihi sisa kuota atau tanggal tidak valid. Pastikan request ditolak.
6. Buka detail pengajuan dan verifikasi alasan, lampiran, approver, status, serta catatan manager/admin.
7. Batalkan satu pengajuan yang masih dapat dibatalkan. Pastikan status berubah menjadi dibatalkan dan tidak lagi menunggu persetujuan.
8. Simpan satu pengajuan berstatus menunggu untuk diproses oleh MANAJER.

### 3.5 Laporan kerja

1. Buka `/employee/work-report`; pastikan status pelaporan periode dan riwayat laporan tampil.
2. Buka form baru lalu uji validasi tanggal, judul tugas, deskripsi kegiatan, dan realisasi kegiatan yang wajib diisi.
3. Isi seluruh field: judul tugas, deskripsi, realisasi/capaian, kendala, rencana minggu depan, link artikel, catatan tambahan, kolom tambahan, dan maksimal tiga screenshot.
4. Simpan sebagai **Draft**. Reload halaman, buka kembali laporan, dan pastikan isi tetap ada.
5. Edit draft, hapus satu lampiran bila tersedia, lalu simpan perubahan.
6. Ajukan laporan. Pastikan status berubah menjadi diajukan/menunggu review dan notifikasi dikirim ke pihak yang berwenang.
7. Buka detail laporan dan pastikan seluruh field, lampiran, status pengisian, status validasi, serta catatan review tampil.
8. Pastikan laporan yang sudah diajukan tidak dapat diedit/dihapus kecuali status mengizinkan.
9. Setelah nanti ditolak MANAJER atau ADMIN, kembali ke halaman ini, baca alasan penolakan, edit laporan, dan ajukan ulang.
10. Pastikan status kalender membedakan belum membuat laporan, draft, diajukan, disetujui, ditolak, dan tanggal mendatang.
11. Uji filter/periode, pagination, refresh, dan detail setelah reload.
12. Uji **Unduh/Cetak** dalam CSV, Excel/XLS, JSON, PDF, dan cetak. Pastikan hasil mengikuti data user/periode yang dipilih dan tidak menggandakan baris.
13. Simpan satu laporan berstatus diajukan untuk direview MANAJER.

### 3.6 Statistik, profil, relasi manajer, dan notifikasi

1. Buka `/employee/statistics`; ubah periode dan verifikasi metrik hadir, terlambat, izin/cuti, alpha, durasi, dan tren.
2. Gunakan ekspor CSV, Excel, JSON, PDF, dan cetak bila tersedia; cocokkan periode dengan layar.
3. Buka `/employee/manager`; pastikan informasi manajer yang ditetapkan tampil. Uji kondisi data manajer kosong bila akun uji mendukung.
4. Buka `/employee/profile`; verifikasi data profil, divisi, jabatan, status akun, tanggal bergabung, alamat, dan lokasi WFH.
5. Ubah nama profil dengan data uji, simpan, reload, dan pastikan perubahan tersimpan.
6. Upload foto profil valid, uji file terlalu besar/tidak didukung, lalu pastikan foto tampil setelah reload.
7. Ajukan perubahan lokasi WFH dengan alamat, link Google Maps/koordinat, radius, tanggal berlaku, alasan, dan lampiran opsional. Simpan nomor/status pengajuan.
8. Pada tab keamanan, uji perubahan email dengan password lama yang salah lalu benar; uji perubahan password dan konfirmasi.
9. Buka `/employee/notifications`, tandai notifikasi terbaca, dan pastikan badge ikut berubah.
10. Simpan bukti bahwa laporan, pengajuan izin, perubahan lokasi, dan hasil review dapat menghasilkan notifikasi.

---

## 4. Alur 2 — Role Manajer

Gunakan `MANAJER_A`. Data laporan, izin, dan lokasi yang dibuat pada bagian Karyawan menjadi data awal verifikasi.

### 4.1 Dashboard dan fitur pribadi manajer

1. Login sebagai `MANAJER_A`; pastikan diarahkan ke `/manager/dashboard`.
2. Verifikasi ringkasan tim, jumlah hadir, belum absen, izin/cuti, laporan pending, grafik, dan notifikasi.
3. Uji check-in/check-out dan riwayat absensi manajer dengan alur yang sama seperti Karyawan.
4. Buka `/employee/work-report` dan buat satu laporan kerja manajer, simpan draft, ajukan, lihat detail, serta uji ekspor.
5. Buka `/employee/statistics`; ubah periode, cek metrik pribadi, dan uji ekspor.
6. Buka `/employee/leaves`; buat satu pengajuan izin/cuti manajer atau verifikasi bahwa menu dapat digunakan sesuai aturan.
7. Buka notifikasi, profil, `/help`, dan `/about`; uji fungsi bersama serta logout.

### 4.2 Absensi tim

1. Buka `/manager/team/attendance`.
2. Pastikan hanya anggota tim dalam scope `MANAJER_A` yang tampil; `KARYAWAN_B` di luar scope tidak boleh muncul.
3. Filter berdasarkan nama/NIK, tanggal mulai/selesai, dan status Hadir, Terlambat, atau Alpha.
4. Verifikasi tanggal, status, jam masuk, jam pulang, dan label **Belum Check-out**.
5. Uji pagination dan perubahan jumlah baris per halaman.
6. Ekspor hasil filter ke CSV, Excel, JSON, PDF, dan cetak. Cocokkan jumlah data dengan tabel.

### 4.3 Laporan tim dan review laporan kerja

1. Buka `/manager/team/reports`; pastikan laporan `KARYAWAN_A` yang diajukan muncul.
2. Cari berdasarkan nama/NIK dan filter rentang tanggal; uji refresh dan pagination.
3. Buka detail laporan dan verifikasi role pelapor, divisi, status pengisian, status laporan, status waktu, isi laporan, catatan, dan lampiran.
4. Untuk satu laporan uji, isi catatan review lalu pilih **Tolak**. Pastikan alasan wajib diminta dan status berubah menjadi ditolak.
5. Pastikan `KARYAWAN_A` menerima notifikasi/alasan penolakan dan dapat memperbaiki lalu mengajukan ulang.
6. Untuk laporan uji kedua, buka detail, isi catatan opsional, lalu pilih **Setujui**.
7. Pastikan status laporan yang disetujui dan catatan review terlihat pada akun Karyawan.
8. Uji export CSV, Excel, JSON, PDF, dan cetak laporan tim berdasarkan filter aktif.
9. Pastikan MANAJER tidak dapat memproses laporan atau data di luar timnya.

### 4.4 Statistik tim dan persetujuan izin

1. Buka `/manager/team/statistics`; verifikasi grup manajer, total anggota, hadir, terlambat, izin/cuti, alpha, belum absen, dan persentase.
2. Buka/tutup detail grup, gunakan **Buka Semua**, **Tutup Semua**, dan **Tampilkan anggota berikutnya** bila tersedia.
3. Ubah periode statistik dan pastikan angka serta grafik mengikuti periode.
4. Uji ekspor CSV, Excel, JSON, PDF, dan cetak statistik tim.
5. Buka `/manager/leaves`; temukan pengajuan izin `KARYAWAN_A` yang menunggu.
6. Buka detail, periksa lampiran dan alasan, lalu lakukan **Approve** pada satu pengajuan.
7. Tolak pengajuan kedua dengan catatan/alasan. Pastikan status dan alasan terlihat oleh Karyawan.
8. Pastikan pengajuan yang selesai tidak dapat diproses ulang dan kuota/status absensi mengikuti keputusan.
9. Uji notifikasi perubahan keputusan untuk Karyawan dan Admin/HRD.

---

## 5. Alur 3 — Role Admin/HRD

Gunakan `ADMIN_A`. Admin/HRD memeriksa data seluruh role, memproses validasi akhir, dan menguji seluruh modul administrasi.

### 5.1 Dashboard, notifikasi, dan ringkasan

1. Login sebagai `ADMIN_A`; pastikan diarahkan ke `/admin/dashboard`.
2. Verifikasi kartu total karyawan, hadir hari ini, belum absen, izin/cuti, magang aktif, laporan kerja pending, dan belum membuat laporan.
3. Buka notifikasi dashboard, tandai notifikasi terbaca, dan buka `/admin/notifications`.
4. Pastikan quick action menuju karyawan, persetujuan izin/cuti, rekap absensi, dan operasional role berfungsi.

### 5.2 Manajemen data karyawan

1. Buka `/admin/employees`; uji pencarian, filter divisi, jabatan, project, dan seluruh pilihan pengurutan.
2. Buka **Tambah Karyawan**, isi data uji lengkap: identitas, akun, role, divisi, jabatan, project, tanggal bergabung, status, dan shift bila tersedia.
3. Simpan, pastikan kode karyawan dibuat dan baris baru tampil.
4. Buka detail karyawan; verifikasi NIK, kontak, organisasi, status, shift, lokasi rumah, dan histori yang ditampilkan.
5. Edit data uji yang diizinkan, simpan, reload, dan pastikan perubahan tampil.
6. Uji perubahan status aktif/nonaktif atau operasi hapus sesuai kontrol yang tersedia. Pastikan histori tidak hilang tanpa aturan yang jelas.
7. Buka lokasi rumah dari data karyawan dan pastikan link/koordinat hanya terlihat untuk user berwenang.
8. Ekspor daftar hasil filter dalam CSV, XLSX, JSON, PDF, dan cetak.

### 5.3 Organisasi, project, tipe kerja, jadwal, dan kuota

1. Buka `/admin/organization`; pada tab Divisi, tambah/edit data divisi uji, lalu verifikasi tampil pada pilihan karyawan.
2. Pada tab Jabatan, tambah/edit jabatan uji dan pastikan dapat dipilih pada data karyawan.
3. Pada tab Project, tambah/edit project, ubah aktif/nonaktif, dan pastikan hanya project aktif yang tersedia untuk pilihan baru.
4. Buka `/admin/worktypes`; tambah tipe kerja WFO dan WFH uji, atur apakah perlu validasi lokasi rumah, edit, lalu hapus/nonaktifkan data uji.
5. Buka `/admin/schedules`; tambah shift dengan jam mulai/selesai, toleransi absen awal, toleransi keterlambatan, dan hari kerja.
6. Edit shift, filter tanggal/nama, tugaskan shift ke `KARYAWAN_A`, lalu kembalikan ke Reguler. Pastikan histori absensi tidak berubah.
7. Buka `/admin/leave-quotas`; buat atau ubah kuota cuti tahun berjalan untuk `KARYAWAN_A`, lalu verifikasi sisa kuota pada akun Karyawan.
8. Pastikan perubahan default kuota tidak mengubah kuota yang sudah tersimpan tanpa tindakan eksplisit.

### 5.4 Lokasi WFH dan pengaturan umum

1. Buka `/admin/home-locations`; lihat lokasi WFH aktif dan pengajuan perubahan lokasi dari `KARYAWAN_A`.
2. Buka detail pengajuan, verifikasi alamat, koordinat, radius, tanggal berlaku, alasan, dan lampiran.
3. Setujui satu pengajuan. Pastikan lokasi aktif berubah dan notifikasi terkirim.
4. Tolak pengajuan kedua dengan alasan. Pastikan alasan terlihat di akun Karyawan.
5. Buka `/admin/settings`; uji tab hari libur, jadwal reguler, aturan cuti/laporan kerja, geofence kantor, dan kontak helpdesk.
6. Ubah satu nilai uji di setiap panel, simpan, reload, dan pastikan nilai tersimpan.
7. Pastikan perubahan jadwal/geofence berlaku untuk absensi baru dan tidak mengubah record historis.
8. Buka `/admin/settings/notifications`; pilih role, aktif/nonaktifkan email dan in-app per tipe notifikasi, simpan, reload, dan verifikasi.
9. Kirim pengumuman ke Karyawan, MANAJER, MAGANG, semua role, dan HRD/Admin secara bergantian. Pastikan penerima serta isi notifikasi benar.

### 5.5 Event perusahaan

1. Buka `/admin/events`; tambah event dengan tanggal, tipe, jam, judul, deskripsi, lokasi, dan lampiran.
2. Pastikan event muncul pada kalender dan dashboard akun Karyawan/MANAJER/MAGANG.
3. Buka detail event, edit isi, ubah status aktif/nonaktif, lalu pastikan perubahan tampil di kalender.
4. Filter daftar event berdasarkan periode, buka lampiran, dan uji event tanpa lampiran.
5. Hapus/nonaktifkan data event uji dan pastikan tidak lagi muncul pada dashboard publik internal.

### 5.6 Persetujuan izin/cuti HRD

1. Buka `/admin/leaves`; uji filter jenis dan status: menunggu manager, menunggu admin, disetujui, ditolak, dan dibatalkan.
2. Buka detail pengajuan `KARYAWAN_A`; verifikasi identitas, approver, periode, durasi, alasan, lampiran, catatan manager, dan catatan admin.
3. Proses satu pengajuan dengan **Setujui** dan satu dengan **Tolak** menggunakan catatan yang relevan.
4. Pastikan keputusan HRD, status kuota, status absensi, notifikasi, dan alasan penolakan terlihat pada akun pemohon.
5. Uji export CSV, Excel, JSON, PDF, dan cetak berdasarkan filter aktif.

### 5.7 Manajemen laporan kerja

1. Buka `/admin/work-reports`; pastikan laporan Karyawan dan MANAJER yang diproses sebelumnya tampil.
2. Pastikan filter tersedia untuk kata kunci, tanggal, divisi, user pelapor, role pelapor, tim, project, jabatan, dan status.
3. Filter role pelapor satu per satu; pastikan laporan tidak tertukar dan laporan MAGANG dapat muncul bila sudah tersedia.
4. Filter status **Menunggu**, **Sesuai**, **Tidak Sesuai**, **Sudah membuat laporan**, **Belum Membuat Laporan Kerja**, **Laporan belum lengkap**, dan **Submitted**.
5. Buka detail laporan; verifikasi isi, status pengisian, status waktu, review manager, validasi HRD/Admin, catatan, alasan penolakan, dan lampiran.
6. Validasi laporan yang sudah disetujui MANAJER sebagai **Sesuai**. Pastikan status final dan notifikasi pemilik berubah.
7. Tandai satu laporan sebagai **Tidak Sesuai**; pastikan alasan/catatan diminta, tersimpan, dan dapat dilihat pemilik.
8. Pastikan laporan **Belum Membuat Laporan Kerja** tidak diperlakukan sebagai draft, pending review, atau laporan yang dapat divalidasi.
9. Uji pagination, sort, refresh, dan konsistensi data setelah reload.
10. Ekspor CSV, XLS, JSON, PDF, dan cetak. Cocokkan filter, role, jumlah, dan isi file dengan tabel.

### 5.8 Rekap absensi dan laporan khusus

1. Buka `/admin/reports`; uji rekap harian, mingguan, bulanan, dan periode kustom.
2. Filter kata kunci, tanggal, divisi, jabatan, status Hadir, Belum Check-out, Alpha, Izin, dan Cuti.
3. Buka detail absensi; pastikan identitas, tipe kerja, foto, waktu masuk/pulang, lokasi, dan status tampil.
4. Uji pagination, pengurutan terbaru/terlama/nama, serta export CSV, XLS, JSON, PDF, dan cetak.
5. Buka `/admin/reports/alpha`; filter divisi, project, nama, serta pengurutan frekuensi alpha. Buka detail riwayat alpha.
6. Jika menu **Laporan Keterlambatan** tersedia pada build, uji periode, divisi, nama, pengurutan, total menit, detail tanggal/jam, dan seluruh format ekspor.

### 5.9 Operasional Magang & Tim

1. Buka `/admin/role-operations`; pastikan tab Operasional Magang dan Operasional Tim & Manajer dapat dibuka.
2. Pada Operasional Magang, verifikasi total magang, magang aktif, laporan pending, sertifikat terbit, dan arsip kompatibilitas.
3. Filter peserta berdasarkan nama/NIK dan status sertifikat.
4. Untuk peserta yang masa magangnya berakhir, upload sertifikat PDF, Nilai Magang, dan Keterangan Lulus.
5. Download setiap dokumen, lalu hapus satu dokumen uji dan pastikan status berubah.
6. Pastikan upload sertifikat/dokumen dikunci sebelum masa magang berakhir.
7. Pada Operasional Tim & Manajer, verifikasi ringkasan anggota, hadir, belum absen, dan izin pending.
8. Uji filter/export absensi tim, laporan tim, statistik tim, dan daftar persetujuan izin sesuai scope HRD.

### 5.10 Backup, audit, dan pembatasan admin

1. Buka `/admin/backup`; buat backup lengkap dan backup modul tertentu dengan format JSON dan ZIP.
2. Pastikan file dapat diunduh, password/token/secret tidak ikut, ukuran dan riwayat backup tercatat.
3. Pilih file backup uji, lakukan validasi/preview, dan pastikan jumlah modul, tabel, file, serta count terbaca.
4. Uji restore hanya pada lingkungan/data uji. Coba mode tambah data dan timpa data; pastikan transaksi dibatalkan seluruhnya jika ada error.
5. Buka `/admin/audit`; filter aktor, aksi, entitas, tanggal mulai, dan tanggal selesai.
6. Pastikan pembuatan/edit/persetujuan/penolakan/penghapusan data pada sesi ini memiliki audit log dengan waktu, aktor, entitas, ID, dan detail perubahan.
7. Uji export audit log dalam CSV, XLS, JSON, PDF, dan cetak.
8. Dengan akun bukan HRD, buka seluruh URL `/admin/*` secara langsung. Pastikan akses ditolak dan endpoint backend tetap mengembalikan 403.

---

## 6. Alur 4 — Role Magang (Tahap Terakhir)

Gunakan `MAGANG_A`. Jalankan setelah pengujian Admin/HRD agar data mentor, periode, laporan, dan dokumen akhir sudah tersedia.

### 6.1 Dashboard dan kalender magang

1. Login sebagai `MAGANG_A`; pastikan diarahkan ke `/intern/dashboard`.
2. Verifikasi sisa hari magang, periode mulai/selesai, progress periode, laporan diajukan, dan laporan disetujui.
3. Pada kalender, pindah bulan, klik tanggal event/libur, dan pastikan agenda perusahaan tampil.
4. Pastikan instruksi bahwa laporan kerja wajib diisi setiap hari tampil sesuai aturan.

### 6.2 Absensi, riwayat, laporan kerja, dan izin

1. Jalankan check-in/check-out dari `/employee/checkin` dan `/employee/checkout` dengan validasi lokasi, selfie, tipe kerja, dan kondisi hari kerja yang sama seperti Karyawan.
2. Buka `/employee/history`; pastikan hanya riwayat `MAGANG_A` tampil, termasuk detail foto, lokasi, jam, durasi, dan status.
3. Buka `/employee/work-report`; buat draft, isi field wajib dan opsional, upload screenshot, simpan, edit, ajukan, buka detail, dan uji seluruh export.
4. Pastikan status laporan magang dapat dilihat pada kalender dan dapat berubah setelah review/validasi Admin.
5. Buka `/employee/leaves`; cek kuota bila berlaku, ajukan izin dengan lampiran, lihat detail/status, dan batalkan pengajuan yang masih dapat dibatalkan.
6. Pastikan laporan dan izin milik `KARYAWAN_A` atau user lain tidak dapat dibaca melalui UI maupun URL/API.

### 6.3 Statistik, mentor, sertifikat, dan akun

1. Buka `/intern/statistics`; filter tanggal mulai/selesai, verifikasi persentase hadir, status kehadiran, durasi, metrik operasional, status laporan, dan lokasi absensi.
2. Uji ekspor CSV, Excel, JSON, PDF, dan cetak statistik magang.
3. Buka `/intern/mentor`; verifikasi ID/nama mentor, kontak, jabatan, departemen, shift, lokasi, dan institusi.
4. Buka `/intern/certificate`; sebelum masa magang berakhir pastikan status belum tersedia/terkunci.
5. Setelah Admin mengunggah sertifikat, Nilai Magang, atau Keterangan Lulus, reload halaman dan pastikan status serta nama file tampil.
6. Klik Download setiap dokumen dan pastikan file benar; uji kondisi dokumen belum tersedia.
7. Buka `/employee/notifications`; baca notifikasi review laporan, keputusan izin, pengumuman, dan dokumen akhir.
8. Buka `/employee/profile`; verifikasi institusi, periode magang, mentor/lokasi bila tersedia, foto profil, preferensi, keamanan, dan pengajuan perubahan lokasi WFH.
9. Buka `/help` dan `/about`, lalu logout. Pastikan sesi terlindungi tidak dapat dibuka kembali dengan tombol Back.

---

## 7. Verifikasi Akhir Lintas Role

- [ ] Data yang dibuat Karyawan terlihat pada scope MANAJER sesuai tim.
- [ ] Data yang disetujui/ditolak MANAJER terlihat pada Karyawan dan Admin/HRD.
- [ ] Admin/HRD dapat memfilter laporan berdasarkan Karyawan, MANAJER, dan MAGANG tanpa duplikasi atau kehilangan data.
- [ ] Status laporan konsisten: draft, diajukan, disetujui/sesuai, ditolak/tidak sesuai, belum lengkap, dan belum membuat laporan kerja.
- [ ] Status **Belum Membuat Laporan Kerja** tidak masuk hitungan pending review, draft, disetujui, atau ditolak.
- [ ] Kuota, absensi, notifikasi, dan audit log mengikuti keputusan izin/cuti.
- [ ] Foto selfie, koordinat, lampiran, dan link hanya dapat dilihat oleh pemilik atau role yang berwenang.
- [ ] Semua halaman tidak menampilkan error console/API yang tidak tertangani.
- [ ] Pagination, filter, reload, responsive layout, empty state, loading state, dan pesan error telah diuji pada modul utama.
- [ ] Export tidak mengandung baris di luar filter aktif, tidak menggandakan baris, dan nama file/periode benar.
- [ ] Akses langsung ke route role lain ditolak oleh guard dan backend.
- [ ] Tidak ada dead link dari sidebar, tombol, quick action, atau notifikasi.

## 8. Rekap Hasil Pengujian

| Kelompok | Jumlah skenario | Lulus | Gagal | Belum diuji | Catatan/bukti |
|---|---:|---:|---:|---:|---|
| Umum & autentikasi |  |  |  |  |  |
| Karyawan |  |  |  |  |  |
| MANAJER |  |  |  |  |  |
| Admin/HRD |  |  |  |  |  |
| MAGANG |  |  |  |  |  |
| Lintas role & keamanan |  |  |  |  |  |
| **Total** |  |  |  |  |  |

### Format bukti yang disarankan

`<ID>-<role>-<modul>-<status>-<tanggal>`, contoh: `MGR-REPORT-002-manager-approved-2026-10-08.png`.

Untuk setiap bug, lampirkan langkah reproduksi singkat, hasil aktual, hasil yang diharapkan, URL, browser, waktu, dan screenshot tanpa data rahasia.

## Prompt Implementasi Filter Statistik Kehadiran Pribadi

```text
Tambahkan filter rentang tanggal pada halaman "Statistik Kehadiran Pribadi" yang digunakan oleh role Karyawan dan Manajer, dengan tampilan dan perilaku yang konsisten dengan halaman "Statistik Kehadiran Magang".

Konteks kode saat ini:
- Route halaman pribadi: `/employee/statistics`.
- Route tersebut terdaftar untuk role `Karyawan`, `MANAJER`, dan `MAGANG`, tetapi kebutuhan ini ditujukan untuk tampilan statistik pribadi Karyawan dan Manajer. Jangan merusak kompatibilitas role `MAGANG`; bila komponen yang sama tetap dirender untuk MAGANG, gunakan kondisi role atau pertahankan perilaku yang kompatibel dengan halaman `/intern/statistics`.
- Komponen utama: `frontend/src/app/features/employee/statistics/statistics.component.html`, `.ts`, dan `.scss`.
- Service riwayat absensi: `frontend/src/app/core/services/attendance.service.ts`.
- Referensi UI/UX filter: `frontend/src/app/features/intern/intern-statistics/intern-statistics.component.html`, `.ts`, dan `.scss`.

Tujuan:
1. Tambahkan toolbar filter di bawah judul halaman statistik pribadi.
2. Tampilkan dua input tanggal native:
   - `Mulai` (`start_date`)
   - `Selesai` (`end_date`)
3. Gunakan styling, ukuran, jarak, warna, dan perilaku responsive yang sama atau sedekat mungkin dengan filter pada halaman "Statistik Kehadiran Magang".
4. Ketika tanggal mulai atau selesai berubah, muat ulang data statistik dan terapkan rentang tersebut pada seluruh metrik:
   - persentase kehadiran;
   - rincian Hadir, Izin, Cuti, Terlambat, dan Alpha;
   - rata-rata jam check-in;
   - statistik tipe kerja WFO, WFH, dan Dinas Luar/Remote;
   - tren durasi kerja.
5. Jika hanya salah satu tanggal diisi, tetap gunakan filter yang tersedia. Jika keduanya kosong, tampilkan seluruh data sesuai perilaku saat ini.
6. Validasi rentang tanggal. Jika tanggal mulai lebih besar dari tanggal selesai, jangan tampilkan hasil yang salah; tampilkan pesan validasi yang jelas dan cegah request/perhitungan yang tidak valid.
7. Pastikan filter tidak mengubah pembatasan data: pengguna hanya boleh melihat statistik absensinya sendiri.

Implementasi teknis:
- Ikuti pola `start`, `end`, `load()`, dan `[(ngModel)]`/`(ngModelChange)` dari komponen statistik magang.
- Pastikan `FormsModule` diimpor pada standalone component jika diperlukan.
- Perbarui `AttendanceService.getHistory()` agar dapat menerima parameter tanggal opsional, atau tambahkan endpoint/query backend yang tepat bila endpoint riwayat belum mendukung `start_date` dan `end_date`.
- Gunakan format query ISO `YYYY-MM-DD` dan pertahankan timezone bisnis aplikasi `Asia/Jakarta`.
- Terapkan filter pada sumber data sebelum semua metrik dan grafik dihitung, bukan hanya menyembunyikan tampilan grafik.
- Pertahankan struktur kartu, perhitungan yang sudah benar, loading state, empty state, dan error handling yang sudah ada.
- Jangan mengubah halaman "Statistik Kehadiran Magang" dan jangan menambahkan filter berdasarkan user lain/divisi karena ini adalah statistik pribadi.
- Pastikan saat reload halaman, state filter memiliki perilaku yang konsisten; bila belum ada mekanisme penyimpanan state, gunakan default kosong seperti halaman magang.
- Pastikan layout tetap rapi pada desktop dan mobile, tidak menyebabkan horizontal overflow, dan tidak menutupi kartu statistik.

Pengujian yang wajib dilakukan:
1. Login sebagai Karyawan, buka `/employee/statistics`, isi tanggal mulai dan selesai, lalu pastikan seluruh KPI dan grafik berubah sesuai periode.
2. Uji hanya tanggal mulai, hanya tanggal selesai, dan kedua tanggal kosong.
3. Uji tanggal mulai setelah tanggal selesai dan pastikan validasi tampil.
4. Login sebagai Manajer dan ulangi pengujian; pastikan statistik yang tampil tetap statistik pribadi Manajer, bukan statistik tim.
5. Pastikan data di luar periode tidak memengaruhi jumlah, persentase, rata-rata, tipe kerja, maupun tren.
6. Uji tanggal yang tidak memiliki data dan pastikan empty state/metrik nol tampil tanpa error.
7. Uji responsive pada desktop dan mobile serta pastikan tidak ada error di console atau request API yang gagal.
8. Tambahkan atau perbarui unit test/component test yang relevan untuk parameter tanggal, validasi rentang, dan perhitungan metrik setelah filter.

Setelah selesai, tampilkan ringkasan file yang diubah, keputusan apakah filter dilakukan melalui API atau setelah mengambil riwayat, serta hasil pengujian.
```
