# Product Requirements Document (PRD)
# Sistem Absensi Karyawan — Golan Digital Kreatif

**Versi Dokumen:** 1.2
**Tanggal:** 21 Juli 2026 (revisi: penambahan lokasi kantor, validasi GPS real-time, spesifikasi desain antarmuka, serta tipe kerja/status kehadiran WFO/WFH/Custom beserta aturan validasi GPS untuk WFH)
**Status:** Draft untuk Review
**Pemilik Dokumen:** Product/Project Manager

---

## 1. Ringkasan Eksekutif

Golan Digital Kreatif membutuhkan sebuah **Sistem Informasi Absensi Karyawan berbasis web** untuk menggantikan proses absensi manual yang saat ini digunakan. Sistem ini akan menjadi satu sumber kebenaran (*single source of truth*) untuk data kehadiran, memungkinkan karyawan melakukan absen secara mandiri, HRD mengelola dan merekap data dengan cepat, serta pimpinan memantau kehadiran secara *real-time* tanpa perlu menunggu laporan manual.

### 1.1 Informasi Perusahaan & Lokasi Kantor

| Atribut | Detail |
|---|---|
| Nama Perusahaan | PT. Golan Digital Kreatif |
| Alamat Kantor | Jalan Manyar II RT.002 RW.011, Tegal Alur, Kalideres, Jakarta Barat, DKI Jakarta |
| Koordinat GPS Kantor | -6.1202471, 106.7118952 |
| Google Maps | https://maps.app.goo.gl/hsgREUHXShsJm9ms6 |
| Radius Geofence Absensi (default) | 100 meter dari titik koordinat kantor (dapat diubah Admin) |

> Koordinat ini menjadi **titik referensi (anchor point)** untuk validasi lokasi check-in/check-out — lihat detail pada bagian 6.1 (tipe kerja), 6.2 (validasi GPS), dan 10 (Model Data).

---

## 2. Latar Belakang & Masalah yang Dipecahkan

| No | Masalah Saat Ini | Dampak |
|----|-------------------|--------|
| 1 | Absensi masih dilakukan secara manual | Memakan waktu, rawan human error |
| 2 | Rekap kehadiran bulanan sulit dilakukan | Proses lambat, sering terlambat untuk kebutuhan payroll/laporan |
| 3 | HRD sulit memantau keterlambatan, izin, dan ketidakhadiran | Tidak ada data terpusat untuk pengambilan keputusan |
| 4 | Risiko kesalahan pencatatan & kehilangan data | Data absensi tidak dapat diaudit/dipertanggungjawabkan |
| 5 | Pimpinan tidak bisa memantau kehadiran real-time | Keputusan manajerial terlambat |

---

## 3. Tujuan Produk (Goals)

1. Mengotomatisasi proses check-in/check-out karyawan.
2. Menyediakan rekap kehadiran (harian/mingguan/bulanan) secara otomatis dan akurat.
3. Memberikan visibilitas real-time kepada HRD dan pimpinan terkait status kehadiran.
4. Menyediakan alur pengajuan & approval izin/cuti yang terdokumentasi.
5. Mengurangi risiko kehilangan/kesalahan data melalui penyimpanan terpusat dan *audit log*.

### Non-Goals (Di Luar Ruang Lingkup)

- Penggajian (Payroll)
- Rekrutmen karyawan
- Penilaian performa karyawan (Performance Appraisal)
- Manajemen inventaris perusahaan
- Chat/komunikasi internal
- Manajemen proyek atau tugas

> Catatan: Sistem ini dirancang agar dapat **berintegrasi** di masa depan dengan sistem payroll melalui API, namun modul payroll itu sendiri tidak dibangun dalam proyek ini.

---

## 4. Target Pengguna & Persona

### 4.1 Karyawan
- **Kebutuhan:** Absen cepat, cek riwayat kehadiran sendiri, ajukan izin/cuti tanpa proses kertas.
- **Pain point:** Absen manual (tanda tangan/kertas) memakan waktu dan rawan lupa.

### 4.2 Admin/HRD
- **Kebutuhan:** Kelola data karyawan, pantau & approve izin/cuti, rekap laporan bulanan dengan cepat.
- **Pain point:** Rekap manual dari kertas/Excel memakan waktu berhari-hari.

### 4.3 Manajer/Pimpinan
- **Kebutuhan:** Melihat status kehadiran tim secara real-time, laporan ringkas per periode.
- **Pain point:** Tidak ada dashboard, harus menunggu laporan dari HRD.

---

## 5. Role & Hak Akses (RBAC)

| Fitur | Karyawan | HRD/Admin | Manajer/Pimpinan |
|---|:---:|:---:|:---:|
| Login sesuai role | ✅ | ✅ | ✅ |
| Check-in / Check-out | ✅ | ✅ (opsional) | ✅ (opsional) |
| Ajukan izin/cuti | ✅ | ✅ | ✅ |
| Approve izin/cuti | ❌ | ✅ | ✅ (khusus tim sendiri, opsional) |
| Riwayat absensi pribadi | ✅ | ✅ | ✅ |
| Kelola data karyawan | ❌ | ✅ | ❌ |
| Rekap absensi seluruh karyawan | ❌ | ✅ | View-only (tim/departemen) |
| Dashboard statistik | View pribadi | Full | Full (real-time) |
| Manajemen role/permission | ❌ | ✅ (Admin) | ❌ |
| Kelola tipe kerja/status kehadiran (tambah tipe custom WFO/WFH/lainnya) | ❌ | ✅ (Admin) | ❌ |
| Konfigurasi lokasi rumah karyawan (geofence WFH) | ❌ | ✅ (Admin/HRD) | ❌ |

---

## 6. Fitur Utama (In Scope)

1. **Autentikasi & Otorisasi Berbasis Role** — Login, forgot/reset password, session management.
2. **Manajemen Tipe Kerja/Status Kehadiran (WFO, WFH, & Custom)** — Sistem mendukung tipe kerja **WFO (Work From Office)** dan **WFH (Work From Home)** secara default, dengan kemampuan **Admin menambahkan tipe custom sendiri** (mis. "Kunjungan Klien", "Dinas Luar Kota") secara fleksibel tanpa perlu perubahan kode (lihat rincian di bagian 6.1).
3. **Check-in (Absen Masuk)** — Pencatatan waktu masuk, dengan **validasi lokasi GPS real-time wajib** dan **foto selfie wajib** sebagai bukti kehadiran, disesuaikan dengan tipe kerja yang aktif (lihat rincian di bagian 6.1, 6.2, dan 6.3).
4. **Check-out (Absen Pulang)** — Pencatatan waktu pulang dengan validasi lokasi GPS dan foto selfie yang sama seperti check-in, otomatis menghitung durasi kerja.
5. **Pengajuan Izin/Cuti** — Form pengajuan dengan kategori (sakit, izin, cuti tahunan, dll), upload lampiran (surat dokter, dll), dan status approval (pending/approved/rejected).
6. **Riwayat Absensi** — Karyawan dapat melihat histori absensi pribadi; HRD dapat melihat seluruh karyawan.
7. **Dashboard Statistik Kehadiran** — Grafik kehadiran, keterlambatan, ketidakhadiran per periode, per role.
8. **Rekap Absensi Harian/Mingguan/Bulanan** — Termasuk fitur export (PDF/Excel).
9. **Manajemen Data Karyawan (Admin)** — CRUD data karyawan, departemen, jabatan, dan status kepegawaian.

### Fitur Pendukung (untuk mendukung fitur utama agar solid)

- Manajemen jadwal kerja/shift & jam kerja
- Pengaturan lokasi absensi (geofence kantor & opsional geofence rumah karyawan untuk WFH) & kalender hari libur perusahaan
- Manajemen kuota cuti/izin per karyawan per tahun
- Notifikasi (in-app) untuk approval, keterlambatan, dsb.
- Audit log aktivitas sistem (siapa mengubah apa dan kapan)

### 6.1 Rincian Fitur: Tipe Kerja/Status Kehadiran (WFO, WFH, & Custom)

Sistem tidak hanya mencatat "hadir/tidak hadir", tetapi juga **tipe kerja** yang berlaku saat karyawan melakukan absensi. Ini menjadi dasar bagi sistem untuk menentukan aturan validasi lokasi yang sesuai (lihat 6.2).

**Tipe kerja bawaan (default):**

| Tipe Kerja | Deskripsi | Validasi Lokasi |
|---|---|---|
| **WFO** (Work From Office) | Bekerja dari kantor | Wajib berada dalam radius geofence **kantor** |
| **WFH** (Work From Home) | Bekerja dari rumah | Wajib berada dalam radius geofence **kantor** *atau* radius geofence **rumah karyawan** (jika dikonfigurasi — lihat 6.2) |

**Tipe kerja custom (dapat ditambahkan Admin):**
- Admin dapat menambahkan tipe kerja baru sesuai kebutuhan perusahaan (contoh: "Dinas Luar Kota", "Kunjungan Klien", "Kerja Lapangan") melalui halaman **Manajemen Tipe Kerja/Status Kehadiran**, tanpa perlu bantuan tim development.
- Untuk setiap tipe custom, Admin dapat mengatur:
  - Nama & deskripsi tipe kerja.
  - Apakah tipe ini **memerlukan validasi geofence** (dan geofence mana yang berlaku — kantor, rumah karyawan, lokasi bebas dengan pencatatan koordinat saja, atau kombinasi) — lihat aturan validasi umum di 6.2.
  - Apakah tipe ini tetap **mewajibkan foto selfie** (lihat 6.3) — secara default selalu wajib untuk semua tipe kerja, termasuk tipe custom, demi menjaga integritas bukti kehadiran.
  - Ikon/warna penanda tipe kerja pada pill status di dashboard & tabel rekap, agar mudah dibedakan secara visual dari WFO/WFH.
  - Status aktif/nonaktif tipe kerja (tipe yang dinonaktifkan tidak muncul lagi sebagai pilihan baru, namun data historis tetap tersimpan).

**Alur teknis:**
1. Sebelum menekan tombol check-in, karyawan memilih **tipe kerja** untuk hari itu dari dropdown (WFO / WFH / tipe custom lain yang aktif) pada halaman Check-in.
2. Sistem menyesuaikan alur validasi lokasi (radius mana yang dipakai) berdasarkan tipe kerja yang dipilih (lihat detail per tipe pada 6.2).
3. Tipe kerja yang dipilih tersimpan pada record absensi harian (`tipe_kerja`), sehingga muncul di riwayat absensi, dashboard, dan rekap HRD/Pimpinan sebagai kolom/label terpisah dari status kehadiran (hadir/terlambat/alpha).
4. HRD dapat memfilter rekap absensi berdasarkan tipe kerja (mis. melihat rekap WFH bulan ini saja) pada halaman Rekap Absensi.

**Konfigurasi Admin:**
- Tipe kerja WFO & WFH tersedia secara default dan tidak dapat dihapus (hanya dapat diubah pengaturan validasinya), karena menjadi acuan utama kebijakan perusahaan.
- Tipe kerja custom dapat ditambah, diedit, dinonaktifkan, atau dihapus (jika belum pernah dipakai pada record absensi) oleh Admin/HRD.

### 6.2 Rincian Fitur: Validasi Lokasi GPS Real-time untuk Check-in/Check-out

Ini adalah **syarat wajib (mandatory requirement)**, bukan opsi — karyawan tidak dapat menekan tombol check-in/check-out tanpa mengizinkan akses lokasi.

**Alur teknis:**
1. Saat karyawan membuka halaman Check-in, browser/aplikasi meminta izin akses **GPS (Geolocation API)**.
2. Jika GPS belum aktif atau izin ditolak, sistem menampilkan pesan blocking: *"Aktifkan GPS untuk melanjutkan absensi"* — tombol check-in dinonaktifkan sampai izin diberikan.
3. Setelah izin diberikan, sistem mengambil koordinat lokasi karyawan **secara real-time** (update berkala, bukan sekali ambil di awal, untuk mencegah spoofing lokasi statis).
4. Koordinat karyawan ditampilkan **langsung di atas peta interaktif** pada halaman check-in, dengan penanda (pin) lokasi karyawan saat ini serta lingkaran radius geofence kantor (anchor point: **-6.1202471, 106.7118952**, radius 100 meter — lihat 1.1).
5. Sistem menghitung jarak (haversine distance) antara koordinat karyawan dan **titik referensi geofence yang berlaku sesuai tipe kerja yang dipilih (lihat 6.1)**:
   - **Tipe WFO** → titik referensi tunggal: koordinat **kantor**. Di luar radius kantor → tombol check-in nonaktif, atau memerlukan alasan/approval khusus dari HRD (dikonfigurasi Admin).
   - **Tipe WFH (dan tipe custom lain di luar kantor)** → **GPS + foto selfie tetap wajib** (tidak ada pengecualian). Titik referensi yang divalidasi adalah **radius kantor** *dan* **opsional radius rumah karyawan** (jika Admin/HRD telah mengonfigurasi koordinat rumah karyawan tersebut pada data karyawan — lihat bagian 10, entitas EmployeeHomeLocation). Karyawan dianggap "Lokasi terverifikasi" apabila berada **di dalam salah satu** dari kedua radius tersebut. Jika radius rumah belum dikonfigurasi untuk karyawan itu, validasi otomatis kembali hanya memeriksa radius kantor.
   - **Di luar seluruh radius yang berlaku** → tombol check-in nonaktif atau memerlukan alasan/approval khusus dari HRD (dikonfigurasi oleh Admin).
6. Setelah **lokasi tervalidasi** dan **foto selfie berhasil diambil** (lihat 6.3), barulah check-in tersimpan. Data yang tersimpan mencakup: timestamp, latitude, longitude, akurasi GPS (meter), tipe kerja, radius mana yang cocok (kantor/rumah), snapshot peta, dan foto selfie — untuk keperluan audit.
7. HRD dapat melihat riwayat lokasi absensi tiap karyawan pada peta di halaman Detail Absensi/Audit Log, termasuk keterangan tipe kerja dan radius yang tervalidasi saat itu.

**Kebutuhan teknis pendukung:**
- Frontend: Browser **Geolocation API** (`navigator.geolocation.watchPosition`) untuk pelacakan real-time selama halaman check-in terbuka.
- Peta interaktif: **Leaflet.js + OpenStreetMap** (opsi gratis, tanpa API key) atau **Google Maps JavaScript API** (opsi berbayar, fitur lebih lengkap) — direkomendasikan mulai dengan Leaflet + OSM untuk MVP, migrasi ke Google Maps bila dibutuhkan fitur tambahan (Street View, traffic, dsb). Untuk tipe WFH, peta menampilkan **dua lingkaran radius** (kantor & rumah, jika radius rumah dikonfigurasi) secara bersamaan agar karyawan tahu area mana yang berlaku.
- Backend: endpoint menerima `latitude`, `longitude`, `accuracy`, `timestamp`, `tipe_kerja_id`, lalu menghitung jarak terhadap koordinat kantor (tabel `OfficeLocation`) dan, bila relevan, koordinat rumah karyawan (tabel `EmployeeHomeLocation` — lihat bagian 10).
- Keamanan: kombinasi validasi GPS + deteksi mock-location (Android/iOS memberi flag `isMocked` yang bisa dibaca aplikasi mobile jika di masa depan dibuatkan versi native) sebagai lapisan tambahan anti-kecurangan — berlaku untuk seluruh tipe kerja, termasuk WFH.

### 6.3 Rincian Fitur: Foto Selfie Wajib Sebagai Bukti Kehadiran

Selain validasi lokasi, setiap proses check-in **dan** check-out mewajibkan karyawan mengambil **foto selfie langsung dari kamera** (bukan unggah dari galeri) sebagai bukti bahwa karyawan yang bersangkutan yang benar-benar hadir secara fisik, bukan diwakilkan orang lain.

**Alur teknis:**
1. Setelah lokasi GPS tervalidasi (berada dalam radius kantor), sistem membuka akses **kamera depan (front-facing camera)** perangkat melalui izin browser/aplikasi.
2. Karyawan mengambil foto selfie langsung di dalam aplikasi (live capture) — **tombol unggah dari galeri/file tersimpan sengaja tidak disediakan** untuk mencegah kecurangan menggunakan foto lama.
3. Sistem menampilkan pratinjau (preview) foto sebelum dikonfirmasi, dengan opsi "Ambil Ulang" jika hasil kurang jelas.
4. Foto ditempeli **watermark otomatis** berisi nama karyawan, tanggal, jam, dan koordinat GPS saat itu — agar bukti tidak bisa dipakai ulang di kesempatan lain.
5. Tombol "Check-in"/"Check-out" baru aktif setelah **dua syarat terpenuhi sekaligus**: lokasi dalam radius kantor **dan** foto selfie berhasil diambil.
6. Foto disimpan di object storage (lihat 7.1) dan tertaut ke record absensi harian, dapat ditinjau kembali oleh HRD di halaman Detail Absensi/Audit Log.

**Kebutuhan teknis pendukung:**
- Frontend: **MediaDevices API** (`navigator.mediaDevices.getUserMedia`) untuk akses kamera langsung di browser, dengan constraint `facingMode: "user"` (kamera depan).
- Kompresi gambar di sisi klien sebelum unggah (mis. maks. 300–500 KB per foto) agar hemat bandwidth dan storage.
- Backend: endpoint upload foto terenkripsi menuju object storage (S3-compatible), menghasilkan URL yang disimpan di field `foto_url` pada tabel `AttendanceRecord`.
- Retensi: foto absensi disimpan minimal selama masa retensi data absensi perusahaan (mengacu ke kebijakan HRD, contoh: 1–2 tahun).
- Privasi: akses foto absensi dibatasi hanya untuk karyawan bersangkutan, HRD, dan pimpinan — tidak dapat diakses publik.

### 6.4 Rincian Fitur: Kebijakan Jam Kerja & Batas Toleransi Keterlambatan

| Parameter | Nilai Default | Keterangan |
|---|---|---|
| Jam kerja | **09.00 – 17.00 WIB** | Berlaku untuk shift reguler; dapat dikonfigurasi berbeda per divisi/karyawan melalui menu Manajemen Jadwal Kerja/Shift (Admin) |
| Batas toleransi keterlambatan | **10 menit** | Check-in hingga **09.10** masih dihitung status **"Hadir"** |
| Ambang status "Terlambat" | **> 09.10** | Check-in setelah pukul 09.10 otomatis diberi status **"Terlambat"**, dan sistem mencatat durasi keterlambatan (mis. "Terlambat 14 menit") |

**Alur teknis:**
1. Saat karyawan berhasil check-in (lokasi + selfie valid, lihat 6.2–6.3), sistem membandingkan **timestamp check-in** dengan **jam masuk standar (09.00) + batas toleransi (10 menit)** yang tersimpan pada tabel `WorkSchedule`.
2. Jika `waktu_checkin ≤ 09.10` → status otomatis **"Hadir"**.
3. Jika `waktu_checkin > 09.10` → status otomatis **"Terlambat"**, dengan durasi keterlambatan dihitung = `waktu_checkin - 09.00` (bukan dikurangi dari 09.10, agar durasi keterlambatan yang tercatat di rekap tetap akurat secara utuh).
4. Status ini muncul secara real-time di halaman konfirmasi check-in (stempel/pill status), dashboard karyawan, dan direkap otomatis oleh HRD (harian/mingguan/bulanan — lihat bagian 9.3).
5. Batas jam kerja (17.00) dipakai sebagai referensi jam pulang standar untuk perhitungan durasi kerja pada check-out; keterlambatan pulang lebih awal (pulang sebelum 17.00 tanpa izin) dapat ditandai terpisah sebagai catatan HRD, namun tidak masuk ruang lingkup fitur "keterlambatan" pada versi ini (fitur ini fokus pada keterlambatan **masuk**).

**Konfigurasi Admin:**
- Jam kerja standar, batas toleransi, dan hari kerja (mis. Senin–Jumat) dapat diubah oleh Admin/HRD melalui halaman **Pengaturan Jam Kerja**, tanpa perlu mengubah kode program.
- Nilai ini dapat berbeda per divisi atau per shift jika perusahaan menerapkan sistem kerja bergilir (lihat halaman **Manajemen Jadwal Kerja/Shift** pada daftar halaman bagian 8).

---

## 7. Rekomendasi Tech Stack

### 7.1 Backend

| Bahasa | Rekomendasi | Alasan |
|---|---|---|
| **Go** | ⭐ Sangat Direkomendasikan | Performa tinggi, concurrency native (goroutines) cocok untuk proses absensi real-time & rekap data besar, deployment ringan (single binary), ekosistem matang (Gin/Fiber, GORM) |
| **Kotlin** | ⭐ Direkomendasikan | Berjalan di JVM (stabil, library enterprise lengkap), sintaks modern & ringkas, cocok jika tim sudah familiar Java, interoperable dengan Spring Boot |
| **Rust** | ⭐ Direkomendasikan | Performa & keamanan memori terbaik, cocok untuk sistem jangka panjang yang butuh reliabilitas tinggi, namun kurva belajar lebih curam dan waktu pengembangan lebih lama |
| Java | Alternatif | Ekosistem enterprise (Spring Boot) sangat matang, banyak talent, tapi lebih verbose dan startup time lebih lambat dibanding Go |
| Node.js | Alternatif | Cepat untuk prototyping, satu bahasa dengan frontend (jika pakai JS penuh), tapi kurang ideal untuk beban kerja CPU-intensive seperti rekap data besar |

**Rekomendasi final:** **Go** sebagai pilihan utama — pertimbangan *time-to-market*, performa, dan kemudahan maintenance untuk tim kecil-menengah. Jika tim memiliki pengalaman kuat di ekosistem JVM, **Kotlin + Spring Boot** adalah alternatif solid kedua.

**Komponen pendukung backend:**
- Database: PostgreSQL (relasional, cocok untuk data absensi terstruktur)
- Cache/Session: Redis
- Auth: JWT (JSON Web Token) + Refresh Token
- API: RESTful API (opsional GraphQL untuk dashboard kompleks)
- File storage: object storage (S3-compatible) untuk foto absen & lampiran izin

### 7.2 Frontend

| Framework | Rekomendasi | Alasan |
|---|---|---|
| **Angular** | ⭐⭐ Diutamakan | Struktur proyek yang tegas (opinionated), sangat cocok untuk aplikasi enterprise berskala besar dengan 50+ halaman, built-in dependency injection, routing, form validation, dan RxJS untuk data real-time — memudahkan konsistensi antar tim developer |
| React | Alternatif | Fleksibel, ekosistem besar, ideal jika butuh kecepatan development & banyak talent tersedia, tapi butuh disiplin arsitektur ekstra karena tidak *opinionated* |
| Vue | Alternatif | Kurva belajar rendah, cocok untuk tim kecil, dokumentasi ramah pemula, namun ekosistem enterprise-nya sedikit lebih kecil dibanding Angular/React |

**Rekomendasi final:** **Angular** — karena skala aplikasi ini besar (50+ halaman, banyak role, banyak form kompleks), struktur Angular yang konsisten akan memudahkan maintenance jangka panjang oleh banyak developer.

**Komponen pendukung frontend:**
- State management: NgRx (jika Angular) 
- UI Library: Angular Material / PrimeNG
- Charting: Chart.js / ngx-charts untuk dashboard statistik
- Realtime update: WebSocket / Server-Sent Events untuk dashboard pimpinan

### 7.3 Arsitektur Umum

```
[Angular SPA] <--REST/JSON--> [Go REST API] <---> [PostgreSQL]
                                     |
                                     +--> [Redis - cache/session]
                                     +--> [S3-compatible storage - foto/lampiran]
                                     +--> [WebSocket service - realtime dashboard]
```

---

## 8. Daftar Halaman Frontend (Minimal 50 Halaman)

### A. Autentikasi & Umum (6 halaman)
1. Halaman Login
2. Lupa Password
3. Reset Password
4. Halaman 404 (Not Found)
5. Halaman 403 (Akses Ditolak)
6. Halaman Maintenance

### B. Modul Karyawan (16 halaman)
7. Dashboard Karyawan
8. Halaman Check-in
9. Halaman Check-out
10. Riwayat Absensi Pribadi
11. Detail Absensi (per tanggal)
12. Form Pengajuan Izin/Cuti
13. Riwayat Pengajuan Izin/Cuti
14. Detail Pengajuan Izin/Cuti
15. Kalender Kehadiran Pribadi
16. Statistik Kehadiran Pribadi
17. Profil Karyawan
18. Edit Profil
19. Ganti Password
20. Notifikasi
21. Unggah Bukti Absensi (foto/lokasi)
22. Pengaturan Akun Pribadi

### C. Modul HRD/Admin (22 halaman)
23. Dashboard HRD
24. Daftar Data Karyawan
25. Tambah Karyawan Baru
26. Edit Data Karyawan
27. Detail Karyawan
28. Import Data Karyawan (Bulk Upload)
29. Manajemen Departemen/Divisi
30. Manajemen Jabatan
31. Manajemen Role & Permission
32. Daftar Approval Izin/Cuti
33. Detail Approval Izin/Cuti
34. Rekap Absensi Harian
35. Rekap Absensi Mingguan
36. Rekap Absensi Bulanan
37. Export Rekap (PDF/Excel)
38. Manajemen Jadwal Kerja/Shift
39. Pengaturan Jam Kerja
40. Pengaturan Lokasi Absensi (Geofence Kantor)
41. Manajemen Tipe Kerja/Status Kehadiran (WFO/WFH/Custom)
42. Pengaturan Lokasi Rumah Karyawan (Geofence WFH)
43. Manajemen Kalender Hari Libur Perusahaan
44. Manajemen Kuota Cuti/Izin Karyawan

### D. Modul Laporan HRD Lanjutan (4 halaman)
45. Log Aktivitas Sistem (Audit Log)
46. Pengaturan Notifikasi Sistem
47. Laporan Keterlambatan
48. Laporan Ketidakhadiran (Alpha)

### E. Modul Manajer/Pimpinan (5 halaman)
49. Dashboard Pimpinan (Real-time Monitoring)
50. Statistik Kehadiran per Tim/Departemen
51. Laporan Kehadiran per Karyawan
52. Perbandingan Kehadiran Antar Departemen
53. Export Laporan Pimpinan

### F. Modul Sistem & Bantuan (4 halaman)
54. Pengaturan Umum Sistem
55. Manajemen Backup Data
56. Halaman Bantuan/FAQ
57. Tentang Aplikasi

**Total: 57 halaman** (memenuhi target minimal 50 halaman)

---

## 9. Alur Pengguna Utama (User Flow)

### 9.1 Alur Check-in/Check-out (Karyawan)
1. Karyawan login → Dashboard Karyawan
2. Klik "Check-in" → sistem validasi lokasi/waktu → foto opsional → simpan data
3. Status berubah menjadi "Hadir" di dashboard
4. Sore hari, klik "Check-out" → sistem hitung durasi kerja → data tersimpan di riwayat

### 9.2 Alur Pengajuan Izin/Cuti
1. Karyawan buka "Form Pengajuan Izin/Cuti"
2. Isi jenis izin, tanggal, alasan, upload lampiran (jika perlu)
3. Submit → status "Pending"
4. HRD menerima notifikasi → buka "Daftar Approval" → review → Approve/Reject
5. Karyawan menerima notifikasi hasil approval

### 9.3 Alur Rekap Data (HRD)
1. HRD membuka menu "Rekap Absensi"
2. Pilih periode (harian/mingguan/bulanan) dan filter departemen
3. Sistem generate rekap otomatis dari data check-in/check-out
4. HRD export ke PDF/Excel untuk dokumentasi/kebutuhan payroll (di luar sistem ini)

### 9.4 Alur Monitoring Real-time (Pimpinan)
1. Pimpinan login → Dashboard Pimpinan
2. Melihat status kehadiran real-time (hadir/izin/alpha) per departemen
3. Drill-down ke laporan detail per karyawan/departemen bila diperlukan

---

## 10. Model Data Utama (Entitas)

| Entitas | Atribut Kunci |
|---|---|
| **User** | id, nama, email, password_hash, role, status |
| **Employee** | id, user_id, NIK, departemen_id, jabatan_id, tanggal_bergabung |
| **Department** | id, nama_departemen |
| **Position** | id, nama_jabatan |
| **AttendanceRecord** | id, employee_id, tanggal, jam_masuk, jam_pulang, status (hadir/telat/alpha), **tipe_kerja_id**, latitude, longitude, akurasi_gps (meter), dalam_radius (boolean), **radius_tervalidasi (kantor/rumah)**, foto_selfie_masuk_url, foto_selfie_pulang_url |
| **OfficeLocation** | id, nama_lokasi, latitude (-6.1202471), longitude (106.7118952), radius_meter (default 100), alamat |
| **WorkType** | id, nama_tipe (WFO/WFH/custom), deskripsi, is_default (boolean), butuh_validasi_geofence (boolean), radius_yang_berlaku (kantor/rumah/kombinasi), wajib_selfie (boolean, default true), warna_label, status_aktif |
| **EmployeeHomeLocation** | id, employee_id, latitude_rumah, longitude_rumah, radius_meter (opsional, default sesuai pengaturan Admin), alamat_rumah |
| **LeaveRequest** | id, employee_id, jenis_izin, tanggal_mulai, tanggal_selesai, alasan, lampiran, status, approved_by |
| **LeaveQuota** | id, employee_id, tahun, jenis_cuti, sisa_kuota |
| **WorkSchedule** | id, nama_shift, jam_mulai (default 09:00), jam_selesai (default 17:00), toleransi_terlambat_menit (default 10), hari_kerja |
| **Holiday** | id, tanggal, keterangan |
| **AuditLog** | id, user_id, aksi, entitas_terkait, waktu |
| **Notification** | id, user_id, judul, pesan, status_baca, waktu |

---

## 11. Kebutuhan Non-Fungsional

| Kategori | Kebutuhan |
|---|---|
| **Performa** | Waktu respons API < 500ms untuk operasi check-in/check-out |
| **Skalabilitas** | Mampu menangani minimal 500 karyawan aktif secara bersamaan |
| **Keamanan** | Enkripsi password (bcrypt/argon2), JWT dengan expiry, HTTPS wajib, role-based access control |
| **Ketersediaan** | Uptime target 99.5% |
| **Audit & Kepatuhan** | Semua perubahan data penting tercatat di audit log |
| **Kompatibilitas** | Responsive di desktop & mobile browser |
| **Backup Data** | Backup otomatis harian dengan retensi minimal 30 hari |
| **Lokasi/Geofencing** | Validasi radius lokasi kantor untuk mencegah absen fiktif |
| **GPS Real-time** | Wajib mengaktifkan GPS untuk melakukan check-in/check-out; posisi karyawan ditampilkan live di atas peta interaktif selama proses absen |
| **Perizinan Perangkat** | Sistem harus menangani skenario izin lokasi ditolak/GPS mati dengan pesan yang jelas dan tombol absen dinonaktifkan sampai izin diberikan |
| **Kamera/Selfie** | Sistem harus menangani skenario izin kamera ditolak dengan pesan yang jelas; foto selfie wajib diambil langsung (live capture), bukan unggah dari galeri |

---

## 12. Metrik Keberhasilan (Success Metrics)

1. Pengurangan waktu rekap absensi bulanan dari beberapa hari menjadi < 1 jam.
2. 100% karyawan menggunakan sistem absensi digital dalam 1 bulan pertama peluncuran.
3. Pengurangan kesalahan pencatatan absensi hingga mendekati 0%.
4. Pimpinan dapat mengakses data kehadiran real-time tanpa menunggu laporan manual.
5. Waktu proses approval izin/cuti berkurang dari rata-rata beberapa hari menjadi < 1 hari kerja.

---

## 13. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Karyawan absen dari lokasi yang tidak seharusnya (fake GPS) | Kombinasi geofencing + foto selfie + IP address check |
| Resistensi karyawan terhadap sistem baru | Sosialisasi & pelatihan sebelum peluncuran |
| Downtime sistem saat jam absen (pagi/sore) | Load balancing & monitoring proaktif |
| Kehilangan data akibat kegagalan sistem | Backup otomatis + disaster recovery plan |

---

## 14. Roadmap Pengembangan (Usulan)

| Fase | Cakupan | Estimasi |
|---|---|---|
| **Fase 1 — MVP** | Login, Check-in/out, Riwayat Absensi, Manajemen Karyawan dasar | 4-6 minggu |
| **Fase 2** | Pengajuan Izin/Cuti + Approval, Notifikasi | 3-4 minggu |
| **Fase 3** | Dashboard Statistik & Rekap Otomatis + Export | 3-4 minggu |
| **Fase 4** | Dashboard Pimpinan Real-time, Audit Log, Geofencing | 3-4 minggu |
| **Fase 5** | Polishing, testing, UAT, dan peluncuran | 2-3 minggu |

---

## 15. Sistem Desain Antarmuka (UI/UX Design System)

Bagian ini mendokumentasikan bahasa visual yang digunakan pada prototype resmi produk, sebagai acuan bagi tim desain dan front-end developer agar konsisten di seluruh 55 halaman.

### 15.1 Filosofi Desain

Identitas visual mengangkat metafora **"kartu absen & stempel tinta"** — merepresentasikan proses pencatatan kehadiran secara literal namun dengan eksekusi digital yang modern. Elemen tanda tangan (*signature element*) produk adalah **stempel bundar berputar** bertuliskan "GOLAN DIGITAL KREATIF" yang muncul di layar login dan konfirmasi check-in.

### 15.2 Palet Warna

| Token | Hex | Penggunaan |
|---|---|---|
| `--bg` | `#FFFFFF` | Latar utama aplikasi |
| `--mint-0` | `#F2FAF5` | Latar gradasi lembut (sidebar, topbar, kartu statistik) |
| `--mint-1` | `#E3F5EA` | Latar hover, badge, area input |
| `--mint-2` | `#C9ECD6` | Aksen gradasi lanjutan (panel login) |
| `--green` (primer) | `#1F9E64` | Tombol utama, status "hadir", indikator aktif |
| `--green-deep` | `#136E46` | Teks aksen, logo mark, hover state |
| `--stamp` | `#C8672C` | Elemen stempel — satu-satunya titik warna kontras yang disengaja |
| `--late` | `#D99A2B` | Status "terlambat" |
| `--absent` | `#D15C50` | Status "alpha/tidak hadir" |
| `--text-dark` | `#14201A` | Teks utama |
| `--text-dark-lo` | `#5D6E64` | Teks sekunder/meta |

Arah warna: **putih dominan dengan gradasi hijau muda**, dipilih agar terasa bersih, tepercaya, dan "hidup" — selaras dengan identitas merek digital kreatif tanpa jatuh ke tema gelap generik.

### 15.3 Tipografi

| Peran | Font | Karakter |
|---|---|---|
| Display/Judul | Space Grotesk | Geometris, tegas, dipakai di headline & angka statistik besar |
| Body/UI | Inter | Netral, sangat terbaca di ukuran kecil, dipakai di seluruh teks antarmuka |
| Data/Monospace | JetBrains Mono | Dipakai khusus untuk jam, timestamp, NIK, dan data numerik — memberi nuansa "punch clock" digital |

### 15.4 Layout & Komponen Utama

- **Sidebar navigasi** dengan role switcher (Karyawan/HRD/Pimpinan) — struktur menu berubah sesuai role yang aktif.
- **Kartu statistik (stat card)** dengan latar gradasi mint tipis, angka besar Space Grotesk.
- **Pill status** berwarna (hadir/terlambat/alpha/menunggu) untuk pemindaian cepat pada tabel.
- **Tabel data** dengan header uppercase kecil, garis pemisah tipis, dan scroll horizontal otomatis di layar sempit.
- **Tombol punch (check-in/out)** berbentuk lingkaran besar sebagai fokus utama halaman absen, dilengkapi peta lokasi real-time (lihat 16.6).

### 15.5 Responsivitas

Desain diuji pada 4 breakpoint agar konsisten di semua perangkat:

| Breakpoint | Perilaku |
|---|---|
| **> 1080px** (desktop) | Layout penuh: sidebar tetap terlihat, grid statistik 3–4 kolom |
| **≤ 1080px** (laptop kecil/tablet lanskap) | Grid statistik otomatis menyesuaikan jadi 2 kolom |
| **≤ 900px** (tablet potret) | Sidebar berubah jadi **drawer** (menu geser) yang dibuka lewat tombol hamburger di topbar, dengan overlay gelap saat aktif; layout login berubah dari 2 kolom jadi 1 kolom bertumpuk |
| **≤ 640px** (mobile) | Grid statistik jadi 1–2 kolom, tombol check-in mengecil proporsional, ukuran font & padding kartu menyesuaikan, tabel tetap bisa digulir horizontal agar data tidak terpotong |

### 15.6 Peta Lokasi Real-time pada Halaman Check-in

Menindaklanjuti kebutuhan pada bagian 6.2, halaman Check-in/Check-out menampilkan:
- **Peta interaktif** (Leaflet + OpenStreetMap untuk MVP) yang berpusat pada koordinat kantor **-6.1202471, 106.7118952**.
- **Pin penanda posisi karyawan saat ini**, yang bergerak mengikuti update GPS real-time selama halaman terbuka.
- **Lingkaran radius geofence** (100 meter) tervisualisasi transparan di atas peta, sehingga karyawan bisa langsung melihat apakah posisinya berada di dalam atau di luar area absensi yang sah.
- Status tekstual di bawah peta ("Lokasi terverifikasi · radius X meter dari kantor") yang berubah warna (hijau/merah) sesuai validasi.
- Tombol check-in **dinonaktifkan otomatis** apabila GPS tidak aktif, sebagaimana dijelaskan pada 6.2.

### 15.7 Prototype

Prototype resmi (HTML/CSS/JS interaktif, dapat dibuka langsung di browser) mencakup 7 layar representatif — Login, Dashboard Karyawan, Check-in/out, Pengajuan Izin, Dashboard HRD, Data Karyawan, Approval, Rekap Absensi, dan Dashboard Pimpinan — menggunakan sistem desain di atas sebagai acuan untuk direplikasi ke seluruh 55 halaman pada bagian 8.

### 15.8 Aset Visual & Penamaan File Logo

Logo/icon resmi perusahaan akan disediakan terpisah oleh tim dan diletakkan langsung di dalam folder project dengan nama file:

```
icon_golan
```

**Ketentuan penggunaan aset:**
- File `icon_golan` menggantikan placeholder logo huruf **"G"** berlatar gradasi hijau yang saat ini dipakai sementara di brand mark (sidebar, halaman login, favicon) pada prototype.
- Direkomendasikan disediakan dalam **format vektor (`.svg`)** agar tetap tajam di semua ukuran/resolusi layar (mendukung prinsip desain responsif pada bagian 15.5); format `.png` beresolusi tinggi (minimal 512×512px, latar transparan) dapat menjadi cadangan untuk kebutuhan seperti favicon atau ikon PWA.
- Struktur folder frontend disarankan menempatkan aset ini di direktori assets/aset gambar milik project, contoh: `src/assets/icon_golan.svg`, agar mudah direferensikan sebagai komponen `brand-mark` di seluruh 55 halaman.
- Ukuran tampil default mengikuti token desain yang sudah ada di prototype: **30×30px** pada brand mark sidebar/topbar, dapat diskalakan mengikuti breakpoint responsif tanpa distorsi (khususnya jika formatnya `.svg`).
- Setelah aset tersedia, seluruh referensi visual "G" pada dokumen ini dan prototype akan digantikan dengan `icon_golan` sebagai logo resmi.

**Favicon (ikon pada tab browser):**
- Selain dipakai sebagai brand mark di sidebar/topbar, `icon_golan` juga dipasang sebagai **favicon** — ikon kecil yang muncul di tab browser (`<link rel="icon">`) dan di bookmark, sehingga saat website dibuka, pengguna langsung mengenali aplikasi lewat ikon di tab, bukan hanya lewat judul teks.
- Format yang direkomendasikan: `.svg` (skalabel, satu file untuk semua ukuran) sebagai favicon utama, dengan fallback `.png` 32×32px dan 16×16px untuk kompatibilitas browser lama.
- Sebagai placeholder sementara sebelum aset final `icon_golan` tersedia, prototype saat ini sudah memasang favicon sederhana berupa kotak gradasi hijau dengan huruf "G" — akan digantikan otomatis begitu file `icon_golan` diserahkan ke tim development.

---

## 16. Lampiran: Ringkasan Ruang Lingkup

**Termasuk (In Scope):**
Login berbasis role, manajemen tipe kerja/status kehadiran (WFO/WFH/custom), check-in/check-out, pengajuan izin/cuti, riwayat absensi, dashboard statistik, rekap harian/mingguan/bulanan, manajemen data karyawan.

**Tidak Termasuk (Out of Scope):**
Payroll, rekrutmen, penilaian performa, manajemen inventaris, chat internal, manajemen proyek/tugas.

---

*Dokumen ini adalah draft awal dan dapat direvisi berdasarkan diskusi lebih lanjut dengan stakeholder (Karyawan, HRD, dan Pimpinan Golan Digital Kreatif).*
