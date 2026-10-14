# Tata Cara Pengujian Web Sistem Absensi Golan

## 1. Tujuan

Dokumen ini digunakan untuk memastikan website Absensi Golan berjalan sesuai fungsi bisnisnya. Pengujian dilakukan dengan cara menjalankan setiap kasus uji, membandingkan hasil aktual dengan hasil yang diharapkan, kemudian mencatat jika ditemukan bug atau error.

Urutan pengujian wajib dilakukan sebagai berikut:

1. Pengujian umum dan autentikasi.
2. Role Karyawan.
3. Role MANAJER.
4. Role Admin/HRD.
5. Role MAGANG sebagai tahap terakhir.

> Pada aplikasi, role Admin ditampilkan sebagai `HRD`. Selanjutnya istilah Admin/HRD berarti akun dengan role `HRD`.

## 2. Istilah dan Status Pengujian

| Istilah | Keterangan |
|---|---|
| Kasus uji | Satu skenario untuk memeriksa satu perilaku fitur. |
| Prasyarat | Data atau kondisi yang harus tersedia sebelum pengujian dimulai. |
| Langkah uji | Tindakan yang dilakukan tester pada website. |
| Hasil yang diharapkan | Perilaku yang seharusnya terjadi. |
| Hasil aktual | Perilaku yang benar-benar terjadi saat diuji. |
| Lulus | Hasil aktual sama dengan hasil yang diharapkan. |
| Gagal | Hasil aktual berbeda dari hasil yang diharapkan atau terjadi error. |
| Belum diuji | Kasus uji belum dijalankan. |
| Blocked | Pengujian tidak dapat dilakukan karena prasyarat atau fitur lain bermasalah. |

## 3. Persiapan Pengujian

### 3.1 Persiapan sistem

1. Pastikan frontend, backend, database, object storage, dan layanan peta aktif.
2. Buka website menggunakan browser terbaru.
3. Gunakan jendela incognito atau hapus cache dan sesi login sebelum berganti akun.
4. Catat URL aplikasi, tanggal pengujian, versi/build, browser, sistem operasi, dan nama tester.
5. Siapkan koneksi internet yang stabil.
6. Siapkan lokasi GPS di dalam dan di luar geofence kantor.
7. Siapkan lokasi GPS WFH di dalam dan di luar geofence rumah.
8. Pastikan kamera dapat digunakan untuk mengambil selfie.
9. Siapkan file uji JPG, PNG, WEBP, PDF, file berukuran terlalu besar, dan format file yang tidak didukung.
10. Gunakan data dummy. Jangan memasukkan password, token, alamat rumah, koordinat, foto, email, atau NIK asli ke screenshot.

### 3.2 Akun dan data uji

| Kode akun | Role | Data minimum |
|---|---|---|
| `KARYAWAN_A` | Karyawan | Divisi, jabatan, project, shift, kuota cuti, dan manajer |
| `KARYAWAN_B` | Karyawan | User di luar tim `MANAJER_A` untuk pengujian pembatasan data |
| `MANAJER_A` | MANAJER | Memimpin `KARYAWAN_A` dan/atau `MAGANG_A` |
| `ADMIN_A` | HRD | Hak akses HRD aktif |
| `MAGANG_A` | MAGANG | Institusi, periode magang, dan mentor/manajer |

### 3.3 Cara menjalankan setiap kasus uji

Untuk setiap ID pengujian:

1. Pastikan prasyarat terpenuhi.
2. Ikuti langkah uji sesuai urutan.
3. Tunggu proses loading selesai sebelum mengambil kesimpulan.
4. Bandingkan hasil aktual dengan hasil yang diharapkan.
5. Isi status `Lulus`, `Gagal`, atau `Blocked`.
6. Simpan screenshot atau file hasil sebagai bukti.
7. Jika gagal, catat langkah pemicu, pesan error, URL, waktu, dan data yang digunakan.
8. Jangan menghapus data uji yang dibutuhkan oleh role berikutnya sebelum seluruh alurnya selesai.

## 4. Format Pencatatan Kasus Uji

Gunakan format berikut pada spreadsheet, issue tracker, atau bagian hasil pengujian.

| ID | Role | Fitur/URL | Prasyarat | Langkah uji | Hasil yang diharapkan | Hasil aktual | Status | Bukti/Bug ID |
|---|---|---|---|---|---|---|---|---|
| AUTH-01 | Semua | Login `/login` | Akun aktif | Isi kredensial valid lalu klik Masuk | Masuk ke dashboard sesuai role | Isi saat pengujian | Belum diuji | - |

Status tidak boleh diisi `Lulus` hanya karena halaman dapat dibuka. Seluruh perilaku pada kolom hasil yang diharapkan harus diperiksa.

## 5. Pengujian Umum dan Autentikasi

### AUTH-01 sampai AUTH-09: Login dan pemulihan akun

| ID | Langkah uji | Hasil yang diharapkan |
|---|---|---|
| AUTH-01 | Buka `/` | Beranda tampil tanpa error console atau error API yang tidak tertangani. |
| AUTH-02 | Buka `/login`, kirim form kosong | Validasi field tampil dan request login tidak dikirim. |
| AUTH-03 | Isi email/password salah dan jawaban matematika benar | Login ditolak, pesan error tampil, dashboard tidak terbuka. |
| AUTH-04 | Isi jawaban matematika salah | Login tidak diproses, pesan validasi tampil, soal matematika dibuat ulang. |
| AUTH-05 | Login dengan akun valid tiap role | User diarahkan ke dashboard yang sesuai role. |
| AUTH-06 | Klik tombol tampilkan/sembunyikan password | Nilai password berubah menjadi terlihat/tersembunyi tanpa mengubah isinya. |
| AUTH-07 | Buka **Lupa password**, kirim email, lalu masukkan OTP salah | OTP salah ditolak dan password belum berubah. |
| AUTH-08 | Masukkan OTP benar lalu reset password dengan password valid | Password berhasil diubah dan dapat digunakan untuk login. |
| AUTH-09 | Coba password lama setelah reset | Password lama ditolak. |

### AUTH-10 sampai AUTH-14: Otorisasi dan fitur umum

| ID | Langkah uji | Hasil yang diharapkan |
|---|---|---|
| AUTH-10 | Login sebagai tiap role lalu periksa sidebar | Menu yang muncul sesuai hak akses role. |
| AUTH-11 | Buka URL role lain secara langsung | User diarahkan ke `/403` atau akses ditolak. |
| AUTH-12 | Buka `/help` dan `/about` | Halaman bantuan dan informasi aplikasi dapat dibuka tanpa error. |
| AUTH-13 | Buka notifikasi topbar, baca satu notifikasi, buka daftar notifikasi | Status baca dan badge berubah dengan benar. |
| AUTH-14 | Logout lalu tekan Back browser | Halaman terlindungi tidak dapat digunakan tanpa login. |

## 6. Pengujian Role Karyawan

Gunakan `KARYAWAN_A`. Data yang dibuat pada bagian ini dipakai untuk pengujian MANAJER dan Admin/HRD.

### KRY-01 sampai KRY-05: Dashboard dan navigasi

1. Login sebagai `KARYAWAN_A` dan pastikan URL menjadi `/employee/dashboard`.
2. Periksa nama user, status absensi hari ini, kehadiran bulan berjalan, dan sisa cuti.
3. Pada kalender perusahaan, pindah bulan dan klik tanggal yang memiliki event atau hari libur.
4. Pastikan detail event/hari libur tampil dan quick action check-in/check-out mengarah ke URL yang benar.
5. Buka seluruh menu Karyawan: dashboard, check-in/out, riwayat, laporan kerja, statistik, pengajuan izin, manajer, notifikasi, profil, dan bantuan.

**Hasil yang diharapkan:** semua menu dapat dibuka, data sesuai akun, tidak ada menu yang mengarah ke halaman kosong atau error.

### KRY-06 sampai KRY-16: Absensi WFO/WFH

1. Pada hari kerja, buka `/employee/checkin` sebelum melakukan absensi.
2. Tolak izin lokasi atau kamera. Pastikan website menampilkan pesan yang jelas dan tidak menyimpan absensi.
3. Izinkan lokasi dan kamera. Pastikan peta, status geofence, dan kontrol selfie tampil.
4. Ambil selfie valid, pilih tipe kerja/event yang tersedia, lalu kirim check-in dari lokasi kantor.
5. Pastikan waktu, koordinat, tipe kerja, foto, dan status hadir/terlambat tersimpan.
6. Coba check-in dua kali. Sistem harus menolak duplikasi.
7. Buka `/employee/checkout`, ambil selfie, dan kirim check-out dari lokasi valid.
8. Pastikan status berubah menjadi selesai dan check-out kedua ditolak.
9. Uji lokasi di luar geofence. Check-in harus ditolak dan tidak membuat record baru.
10. Setelah selfie berhasil diambil, tekan **Ambil Ulang**. Pastikan foto lama terhapus dari preview, foto baru wajib diambil ulang, tombol absensi kembali nonaktif, dan request absensi tidak dikirim sebelum selfie baru tersedia.
11. Buka halaman check-out sebelum check-in. Sistem tidak boleh membuat check-out yatim.
12. Uji hari libur, bukan hari kerja, absensi ditutup, dan hari dengan izin/cuti. Pesan serta tombol harus sesuai kondisi.

**Bukti minimum:** screenshot halaman check-in berhasil, penolakan geofence, riwayat check-in, dan check-out selesai.

### KRY-17 sampai KRY-21: Riwayat absensi

1. Buka `/employee/history`.
2. Pastikan hanya data `KARYAWAN_A` yang tampil.
3. Ganti tampilan Tabel dan Kalender, lalu pindah bulan.
4. Buka detail record dan periksa jam masuk, jam pulang, durasi, status, tipe kerja, koordinat, dan foto.
5. Cari record tanpa check-out dan pastikan label **Belum Check-out** tampil.

**Hasil yang diharapkan:** data riwayat lengkap, konsisten setelah reload, dan tidak membocorkan data user lain.

### KRY-22 sampai KRY-29: Pengajuan izin/cuti

1. Buka `/employee/leaves` dan catat total kuota, terpakai, dan sedang diproses.
2. Kirim form tanpa jenis, tanggal, alasan, dan lampiran. Validasi wajib harus tampil.
3. Ajukan izin sakit dengan tanggal valid dan lampiran yang didukung.
4. Ajukan cuti dalam batas kuota dan periksa jumlah hari kerja.
5. Coba cuti melebihi kuota atau tanggal tidak valid. Pengajuan harus ditolak.
6. Buka detail pengajuan dan periksa approver, status, alasan, lampiran, serta catatan.
7. Batalkan pengajuan yang masih dapat dibatalkan.
8. Sisakan satu pengajuan berstatus menunggu untuk diproses MANAJER.

**Hasil yang diharapkan:** validasi, kuota, lampiran, status, pembatalan, dan riwayat pengajuan bekerja sesuai aturan.

### KRY-30 sampai KRY-43: Laporan kerja

1. Buka `/employee/work-report` dan periksa status pelaporan serta riwayat laporan.
2. Buka form baru dan kirim tanpa tanggal, judul, deskripsi, atau realisasi. Validasi wajib harus tampil.
3. Isi judul tugas, deskripsi kegiatan, realisasi/capaian, kendala, rencana minggu depan, link artikel, catatan tambahan, kolom tambahan, dan screenshot.
4. Simpan sebagai draft, reload halaman, lalu buka kembali laporan.
5. Edit draft dan hapus satu lampiran jika tersedia.
6. Ajukan laporan dan catat ID/tanggal laporan.
7. Buka detail laporan dan periksa semua field, lampiran, status pengisian, status validasi, dan catatan review.
8. Pastikan laporan yang sudah diajukan tidak dapat diedit/dihapus jika status tidak mengizinkan.
9. Setelah laporan ditolak MANAJER atau Admin, baca alasan, perbaiki laporan, dan ajukan ulang.
10. Periksa status kalender: belum membuat laporan, draft, diajukan, disetujui, ditolak, dan tanggal mendatang.
11. Tetap di halaman `/employee/work-report`: ubah pilihan **Periode** pada bagian **Status Pelaporan**, pindah halaman tabel riwayat jika pagination tersedia, tekan **Refresh**, buka **Lihat detail laporan kerja**, lalu reload browser. Pastikan periode, daftar laporan, status, isi, dan detail tetap sesuai setelah setiap tindakan.
12. Uji export CSV, Excel/XLS, JSON, PDF, dan cetak.
13. Pastikan file export hanya berisi data akun/periode yang dipilih dan tidak menggandakan baris.
14. Sisakan satu laporan berstatus diajukan untuk direview MANAJER.

**Hasil yang diharapkan:** laporan dapat dibuat, disimpan, diedit, diajukan, ditolak, diperbaiki, dan diekspor tanpa kehilangan data.

### KRY-44 sampai KRY-52: Statistik, profil, lokasi, dan notifikasi

1. Buka `/employee/statistics` dan periksa metrik hadir, izin/cuti, alpha, rata-rata check-in, tipe kerja, serta grafik **Tren Durasi Kerja (7 Absensi Terakhir)**. Pada versi aplikasi saat ini belum tersedia kontrol untuk mengubah periode; catat sebagai temuan/fitur belum tersedia jika pengujian membutuhkan filter tanggal statistik.
2. Uji semua format export statistik yang tersedia.
3. Buka `/employee/manager` dan pastikan informasi manajer sesuai penugasan.
4. Buka `/employee/profile` dan periksa data profil, divisi, jabatan, status, tanggal bergabung, alamat, dan lokasi WFH.
5. Ubah nama dengan data uji, simpan, dan reload.
6. Upload foto profil valid, lalu uji file terlalu besar/tidak didukung.
7. Ajukan perubahan lokasi WFH dengan alamat, Google Maps/koordinat, radius, tanggal, alasan, dan lampiran.
8. Uji perubahan email/password dengan password lama salah dan benar.
9. Buka `/employee/notifications`, tandai notifikasi terbaca, lalu periksa badge.

## 7. Pengujian Role MANAJER

Gunakan `MANAJER_A`. Pastikan laporan dan pengajuan dari `KARYAWAN_A` sudah tersedia.

### MGR-01 sampai MGR-07: Dashboard dan fitur pribadi

1. Login sebagai `MANAJER_A`; pastikan diarahkan ke `/manager/dashboard`.
2. Periksa ringkasan tim, hadir, belum absen, izin/cuti, laporan pending, grafik, dan notifikasi.
3. Uji check-in/out dan riwayat pribadi melalui `/employee/checkin`, `/employee/checkout`, dan `/employee/history`.
4. Buat satu laporan kerja manajer melalui `/employee/work-report`, simpan draft, ajukan, buka detail, dan uji export.
5. Buka `/employee/statistics` dan periksa metrik statistik serta grafik **Tren Durasi Kerja (7 Absensi Terakhir)**. Pada versi aplikasi saat ini belum tersedia filter periode maupun tombol **Unduh/Cetak**, sehingga keduanya tidak dapat diuji melalui UI; catat sebagai fitur belum tersedia jika memang diwajibkan oleh kebutuhan sistem.
6. Buka `/employee/leaves` dan pastikan pengajuan pribadi mengikuti aturan role.
7. Uji profil, notifikasi, `/help`, `/about`, dan logout.

### MGR-08 sampai MGR-13: Absensi tim

1. Buka `/manager/team/attendance`.
2. Cari anggota berdasarkan nama/NIK dan filter periode.
3. Filter status Hadir, Terlambat, dan Alpha.
4. Periksa tanggal, status, jam masuk, jam pulang, dan label Belum Check-out.
5. Uji pagination dan perubahan jumlah baris.
6. Export CSV, Excel, JSON, PDF, dan cetak.

**Hasil yang diharapkan:** hanya anggota dalam scope manajer yang tampil. `KARYAWAN_B` di luar tim tidak boleh terlihat.

### MGR-14 sampai MGR-23: Laporan tim dan review

1. Buka `/manager/team/reports` dan cari laporan `KARYAWAN_A`.
2. Gunakan pencarian nama/NIK, rentang tanggal, refresh, dan pagination.
3. Buka detail laporan dan periksa role, divisi, status pengisian, status laporan, status waktu, isi, catatan, dan lampiran.
4. Tolak satu laporan dengan alasan/catatan.
5. Login kembali sebagai Karyawan dan pastikan alasan penolakan serta notifikasi tampil.
6. Perbaiki dan ajukan ulang laporan dari akun Karyawan.
7. Kembali sebagai MANAJER dan setujui laporan uji kedua.
8. Pastikan status serta catatan review tampil pada akun Karyawan.
9. Uji semua format export laporan tim.
10. Coba membuka data di luar tim melalui pencarian/URL. Akses harus ditolak atau data tidak dikembalikan.

### MGR-24 sampai MGR-32: Statistik dan persetujuan izin

1. Buka `/manager/team/statistics` dan periksa total anggota, hadir, terlambat, izin/cuti, alpha, belum absen, dan persentase.
2. Buka/tutup grup, gunakan Buka Semua, Tutup Semua, dan Tampilkan anggota berikutnya.
3. Ubah periode dan pastikan data berubah sesuai periode.
4. Uji export statistik tim.
5. Buka `/manager/leaves` dan temukan pengajuan `KARYAWAN_A`.
6. Buka detail pengajuan, lalu setujui satu pengajuan.
7. Tolak pengajuan kedua dengan alasan/catatan.
8. Pastikan pengajuan selesai tidak dapat diproses ulang.
9. Pastikan status, kuota, absensi, dan notifikasi pemohon diperbarui.

## 8. Pengujian Role Admin/HRD

Gunakan `ADMIN_A`. Admin/HRD menguji data seluruh role dan validasi akhir.

### ADM-01 sampai ADM-05: Dashboard dan notifikasi

1. Login sebagai `ADMIN_A`; pastikan diarahkan ke `/admin/dashboard`.
2. Periksa total karyawan, hadir, belum absen, izin/cuti, magang aktif, laporan pending, dan belum membuat laporan.
3. Buka notifikasi dashboard dan `/admin/notifications`.
4. Tandai notifikasi terbaca.
5. Uji seluruh quick action dashboard.

### ADM-06 sampai ADM-14: Data karyawan

1. Buka `/admin/employees`.
2. Uji pencarian, filter divisi/jabatan/project, dan semua pengurutan.
3. Tambah satu karyawan uji dengan data identitas, akun, role, organisasi, tanggal masuk, status, dan shift.
4. Pastikan kode karyawan dibuat dan baris baru tampil.
5. Buka detail dan edit data uji.
6. Uji status aktif/nonaktif atau hapus sesuai kontrol yang tersedia.
7. Sebelum mengubah status, catat minimal satu data lama milik karyawan uji: riwayat absensi, laporan kerja, pengajuan izin/cuti, dan bila tersedia audit log. Setelah status diubah menjadi nonaktif atau data uji dihapus sesuai kontrol yang tersedia, buka kembali `/admin/reports`, `/admin/work-reports`, `/admin/leaves`, dan `/admin/audit`. Data lama harus tetap dapat ditemukan dengan identitas/kode karyawan yang sama; yang boleh berubah hanya akses atau kemampuan membuat transaksi baru sesuai aturan sistem. Jangan memakai karyawan produksi untuk percobaan hapus.
8. Buka detail karyawan uji dan periksa data lokasi rumah yang memang terdaftar: alamat, link Google Maps, koordinat, dan radius geofence harus sesuai data uji. Pastikan field sensitif seperti NIK, email, nomor telepon, alamat, koordinat/lokasi rumah, foto, password, dan token hanya tampil untuk role yang berwenang; login sebagai Karyawan/MANAJER lalu coba membuka data karyawan lain melalui menu atau URL langsung dan pastikan data ditolak, tidak ditampilkan, atau hanya menampilkan data yang memang menjadi scope role tersebut.
9. Export CSV, XLSX, JSON, PDF, dan cetak.

### ADM-15 sampai ADM-25: Organisasi, tipe kerja, jadwal, dan kuota

1. Buka `/admin/organization` dan tambah/edit Divisi.
2. Tambah/edit Jabatan dan pastikan tersedia pada form karyawan.
3. Tambah/edit Project, ubah aktif/nonaktif, dan periksa pilihan project.
4. Buka `/admin/worktypes`, tambah/edit tipe kerja WFO/WFH dan aturan validasi lokasi rumah.
5. Buka `/admin/schedules`, tambah shift dengan jam, toleransi, dan hari kerja.
6. Edit shift dan tugaskan ke `KARYAWAN_A`.
7. Kembalikan karyawan ke shift Reguler.
8. Pastikan konfigurasi baru berlaku untuk data baru dan tidak mengubah histori.
9. Buka `/admin/leave-quotas`, buat/ubah kuota cuti tahun berjalan.
10. Verifikasi sisa kuota pada akun Karyawan.
11. Catat kuota tahun berjalan milik karyawan uji pada `/admin/leave-quotas` (misalnya 12 hari). Ubah **Default kuota Cuti** pada `/admin/settings` menjadi nilai lain (misalnya 15 hari), simpan, lalu buka kembali `/admin/leave-quotas`. Kuota karyawan lama harus tetap 12 hari. Nilai 15 hari hanya boleh dipakai otomatis untuk karyawan baru atau kuota yang belum ada; kuota lama baru berubah jika HRD mengeditnya secara langsung melalui form kuota.

### ADM-26 sampai ADM-35: Lokasi WFH dan pengaturan umum

1. Buka `/admin/home-locations` dan lihat pengajuan lokasi dari `KARYAWAN_A`.
2. Periksa alamat, koordinat, radius, tanggal, alasan, dan lampiran.
3. Setujui satu pengajuan dan tolak pengajuan lain dengan alasan.
4. Pastikan lokasi aktif, status, alasan, dan notifikasi pemohon berubah.
5. Buka `/admin/settings` dan uji hari libur, jadwal reguler, aturan cuti/laporan kerja, geofence kantor, serta kontak helpdesk.
6. Ubah satu nilai pada setiap panel, simpan, dan reload.
7. Buka `/admin/settings/notifications`, ubah pengaturan email/in-app per role, simpan, dan reload.
8. Kirim pengumuman ke Karyawan, MANAJER, MAGANG, semua role, dan HRD/Admin.
9. Pastikan hanya penerima yang dipilih yang menerima pengumuman.
10. Pastikan perubahan geofence/jadwal berlaku pada absensi baru dan tidak mengubah histori.

### ADM-36 sampai ADM-40: Event perusahaan

1. Buka `/admin/events` dan tambah event dengan tanggal, tipe, jam, judul, deskripsi, lokasi, dan lampiran.
2. Pastikan event tampil pada kalender Karyawan, MANAJER, dan MAGANG.
3. Edit event dan ubah aktif/nonaktif.
4. Filter event berdasarkan periode dan buka lampiran.
5. Hapus/nonaktifkan event uji dan pastikan tidak lagi muncul pada dashboard.

### ADM-41 sampai ADM-46: Persetujuan izin/cuti

1. Buka `/admin/leaves`.
2. Filter jenis dan status menunggu manager, menunggu admin, disetujui, ditolak, dan dibatalkan.
3. Buka detail pengajuan dan periksa identitas, approver, periode, durasi, alasan, lampiran, serta catatan.
4. Setujui satu pengajuan dan tolak satu pengajuan dengan catatan.
5. Pastikan status, kuota, absensi, notifikasi, dan alasan penolakan terlihat pada akun pemohon.
6. Uji export CSV, Excel, JSON, PDF, dan cetak.

### ADM-47 sampai ADM-57: Validasi laporan kerja

1. Buka `/admin/work-reports`.
2. Uji filter kata kunci, tanggal, divisi, user, role, tim, project, jabatan, dan status.
3. Pastikan laporan Karyawan dan MANAJER dari tahap sebelumnya tampil.
4. Buka detail laporan dan periksa isi, lampiran, status pengisian, status waktu, review manager, validasi HRD, catatan, dan alasan penolakan.
5. Filter role pelapor satu per satu.
6. Uji status Menunggu, Sesuai, Tidak Sesuai, Sudah membuat laporan, Belum Membuat Laporan Kerja, Laporan belum lengkap, dan Submitted.
7. Validasi laporan yang sudah disetujui MANAJER sebagai Sesuai.
8. Tandai laporan lain Tidak Sesuai dan isi alasan.
9. Pastikan status final dan notifikasi pemilik berubah.
10. Pastikan Belum Membuat Laporan Kerja tidak dihitung sebagai draft, pending review, disetujui, atau ditolak.
11. Uji pagination, pengurutan, refresh, CSV, XLS, JSON, PDF, dan cetak.

### ADM-58 sampai ADM-65: Rekap dan laporan absensi

1. Buka `/admin/reports` dan uji harian, mingguan, bulanan, serta periode kustom.
2. Filter kata kunci, tanggal, divisi, jabatan, Hadir, Belum Check-out, Alpha, Izin, dan Cuti.
3. Buka detail absensi dan periksa identitas, tipe kerja, foto, waktu, lokasi, dan status.
4. Uji pagination, pengurutan, dan semua format export.
5. Buka `/admin/reports/alpha`, filter divisi/project/nama, dan buka detail alpha.
6. Jika menu Laporan Keterlambatan tersedia, uji periode, divisi, nama, total menit, detail, dan export.
7. Pastikan hasil export sesuai filter aktif dan tidak menggandakan data.
8. Pastikan data pada laporan hanya dapat dilihat role yang berwenang.

### ADM-66 sampai ADM-75: Operasional magang dan tim

1. Buka `/admin/role-operations` dan uji tab Operasional Magang serta Operasional Tim & Manajer.
2. Periksa total magang, magang aktif, laporan pending, sertifikat terbit, dan arsip kompatibilitas.
3. Filter peserta berdasarkan nama/NIK/status sertifikat.
4. Untuk peserta yang masa magangnya berakhir, upload sertifikat PDF, Nilai Magang, dan Keterangan Lulus.
5. Download dan hapus dokumen uji.
6. Pastikan upload terkunci sebelum masa magang berakhir.
7. Periksa ringkasan tim, absensi, laporan, statistik, dan izin pending.
8. Uji filter, pagination, export, dan persetujuan dari halaman operasional.
9. Pastikan laporan aktif dikelola melalui Manajemen Laporan Kerja, bukan halaman duplikat.
10. Pastikan arsip historis tetap dapat dibaca.

### ADM-76 sampai ADM-83: Backup, audit, dan keamanan

1. Buka `/admin/backup` dan buat backup lengkap serta backup modul tertentu dalam JSON dan ZIP.
2. Pastikan password, token, dan secret tidak masuk file backup.
3. Preview file backup dan periksa modul, tabel, file, serta jumlah data.
4. Uji restore hanya di database/lingkungan uji menggunakan mode tambah dan timpa.
5. Buka `/admin/audit`, filter aktor, aksi, entitas, dan tanggal.
6. Pastikan aktivitas create, edit, approve, reject, delete, dan restore tercatat.
7. Uji export audit log.
8. Dengan akun non-HRD, akses seluruh URL `/admin/*`. Akses harus ditolak oleh frontend dan backend.

## 9. Pengujian Role MAGANG sebagai Tahap Terakhir

Gunakan `MAGANG_A` setelah data mentor, periode, laporan, dan dokumen akhir disiapkan oleh Admin/HRD.

### INT-01 sampai INT-05: Dashboard dan kalender

1. Login sebagai `MAGANG_A` dan pastikan URL menjadi `/intern/dashboard`.
2. Periksa sisa hari, periode magang, progress, laporan diajukan, dan laporan disetujui.
3. Pindah bulan pada kalender dan buka event/hari libur.
4. Pastikan instruksi laporan kerja harian tampil.
5. Pastikan menu Magang tidak menampilkan menu administrasi HRD.

### INT-06 sampai INT-13: Absensi, laporan, dan izin

1. Uji check-in/check-out dengan GPS, selfie, tipe kerja, dan kondisi hari kerja.
2. Buka `/employee/history` dan pastikan hanya data `MAGANG_A` yang tampil.
3. Buka `/employee/work-report`, buat draft, isi field, upload screenshot, simpan, edit, dan ajukan.
4. Buka detail laporan dan uji seluruh export.
5. Pastikan status laporan berubah setelah review MANAJER/Admin.
6. Buka `/employee/leaves`, periksa kuota bila berlaku, ajukan izin dengan lampiran, dan lihat detail/status.
7. Batalkan pengajuan yang masih dapat dibatalkan.
8. Pastikan data Karyawan lain tidak dapat dibaca melalui UI, URL, atau request API.

### INT-14 sampai INT-22: Statistik, mentor, sertifikat, dan akun

1. Buka `/intern/statistics`, filter periode, dan periksa metrik kehadiran, durasi, laporan, serta lokasi.
2. Uji export CSV, Excel, JSON, PDF, dan cetak.
3. Buka `/intern/mentor` dan periksa identitas, kontak, jabatan, departemen, shift, lokasi, dan institusi mentor.
4. Buka `/intern/certificate` sebelum masa selesai. Status harus terkunci atau belum tersedia.
5. Setelah Admin upload dokumen, reload halaman dan pastikan nama file serta status tampil.
6. Download sertifikat, Nilai Magang, dan Keterangan Lulus.
7. Buka notifikasi dan profil, lalu periksa institusi, periode, foto, preferensi, keamanan, dan lokasi WFH.
8. Buka `/help` dan `/about`.
9. Logout dan pastikan Back browser tidak membuka halaman terlindungi.

## 10. Cara Menentukan Bug atau Error

Sebuah temuan dinyatakan bug apabila memenuhi salah satu kondisi berikut:

- Hasil aktual berbeda dari hasil yang diharapkan.
- Tombol atau menu tidak bekerja, salah arah, atau membuka halaman kosong.
- Data berhasil disimpan tetapi hilang setelah reload.
- Data user lain terlihat oleh user yang tidak berwenang.
- Validasi tidak muncul atau data tidak valid berhasil disimpan.
- Sistem menampilkan HTTP 4xx/5xx, error API, error JavaScript, atau halaman blank.
- Status, notifikasi, kuota, laporan, atau audit log tidak ikut berubah setelah suatu aksi.
- Export berbeda dari filter aktif, berisi data yang tidak berwenang, atau menggandakan data.
- File upload/download gagal tanpa pesan yang jelas.
- Layout rusak sehingga fungsi tidak dapat digunakan pada desktop atau mobile.

### Klasifikasi prioritas bug

| Prioritas | Kriteria | Contoh |
|---|---|---|
| Critical | Keamanan atau fungsi utama berhenti total | User dapat melihat data rahasia, login tidak aman, database rusak |
| High | Fitur utama tidak dapat digunakan | Check-in gagal untuk semua user, laporan tidak dapat diajukan |
| Medium | Fitur masih dapat digunakan dengan gangguan | Filter salah, notifikasi terlambat, export sebagian salah |
| Low | Tampilan atau teks tidak sesuai tetapi fungsi utama berjalan | Typo, jarak layout, ikon kurang tepat |

### Format laporan bug

```text
Bug ID       : BUG-YYYYMMDD-001
Judul        : [Ringkas masalah]
Prioritas    : Critical / High / Medium / Low
Role         : Karyawan / MANAJER / HRD / MAGANG
URL          : [URL halaman]
Browser      : [Nama dan versi browser]
Prasyarat    : [Data/kondisi sebelum diuji]
Langkah      :
  1. [Langkah pertama]
  2. [Langkah kedua]
  3. [Langkah pemicu bug]
Hasil harapan: [Perilaku yang seharusnya]
Hasil aktual : [Perilaku yang terjadi]
Bukti        : [Nama screenshot/video/file/log]
Status       : Open / In Progress / Fixed / Retest / Closed
```

## 11. Retest Setelah Perbaikan

1. Jalankan ulang kasus uji yang sebelumnya gagal.
2. Pastikan hasil aktual sudah sesuai hasil yang diharapkan.
3. Jalankan regression test pada fitur yang berhubungan.
4. Periksa kembali keamanan role, data, notifikasi, export, dan audit log.
5. Ubah status bug menjadi `Closed` hanya jika retest berhasil.

## 12. Kriteria Website Dinyatakan Berfungsi

Website dapat dinyatakan berfungsi dengan semestinya apabila:

- Semua kasus uji Critical dan High berstatus Lulus.
- Tidak ada bug keamanan atau akses data lintas role.
- Login, absensi, izin/cuti, laporan kerja, persetujuan, dan validasi berjalan dari awal sampai akhir.
- Data tetap konsisten setelah simpan, reload, filter, pagination, dan pergantian akun.
- Notifikasi, kuota, status, audit log, upload, download, dan export bekerja sesuai kebutuhan.
- Tidak ada error console/API yang mengganggu fungsi utama.
- Semua bug yang belum selesai sudah disetujui sebagai risiko oleh pemilik sistem.

## 13. Rekap Hasil Pengujian

| Kelompok pengujian | Total kasus | Lulus | Gagal | Blocked | Belum diuji | Catatan |
|---|---:|---:|---:|---:|---:|---|
| Umum dan autentikasi |  |  |  |  |  |  |
| Karyawan |  |  |  |  |  |  |
| MANAJER |  |  |  |  |  |  |
| Admin/HRD |  |  |  |  |  |  |
| MAGANG |  |  |  |  |  |  |
| Regression dan keamanan |  |  |  |  |  |  |
| **Total** |  |  |  |  |  |  |

### Informasi pelaksanaan

| Item | Isi |
|---|---|
| URL aplikasi |  |
| Versi/build |  |
| Tanggal pengujian |  |
| Browser dan versi |  |
| Nama tester |  |
| Pemilik sistem |  |
| Keputusan akhir | Lulus / Lulus dengan catatan / Tidak lulus |

Format nama bukti yang disarankan: `ID-role-fitur-status-tanggal`, contoh `MGR-REPORT-014-gagal-2026-10-08.png`.
