# PROMPT BUILD — Sistem Absensi Karyawan PT. Golan Digital Kreatif
### (Disusun mengikuti urutan bagian PRD v1.1 — bagian 1 s/d 16)

> Tempel seluruh isi file ini sebagai instruksi awal ke agent (Antigravity IDE) untuk membangun project dari nol.

---

## PERAN AGENT

Kamu adalah AI coding agent yang bertugas membangun **Sistem Informasi Absensi Karyawan berbasis web** untuk PT. Golan Digital Kreatif secara end-to-end — backend, database, API, frontend — mengikuti seluruh spesifikasi di bawah ini sesuai urutan PRD resminya. Jangan melompati bagian manapun.

---

## 1. RINGKASAN EKSEKUTIF & INFORMASI PERUSAHAAN

Bangun sistem yang menjadi **satu sumber kebenaran (single source of truth)** untuk data kehadiran — menggantikan absensi manual, memungkinkan karyawan absen mandiri, HRD merekap cepat, dan pimpinan memantau real-time.

**Informasi Perusahaan (gunakan sebagai data seed/konfigurasi awal):**

| Atribut | Detail |
|---|---|
| Nama Perusahaan | PT. Golan Digital Kreatif |
| Alamat Kantor | Jalan Manyar II RT.002 RW.011, Tegal Alur, Kalideres, Jakarta Barat, DKI Jakarta |
| Koordinat GPS Kantor (anchor point) | `-6.1202471, 106.7118952` |
| Radius Geofence Absensi | 100 meter (default, dapat diubah Admin) |

---

## 2. LATAR BELAKANG & MASALAH YANG DIPECAHKAN

Pastikan desain fitur benar-benar menjawab masalah berikut (jadikan acuan validasi tiap fitur yang dibangun):

| Masalah | Fitur yang Menjawab |
|---|---|
| Absensi manual memakan waktu | Check-in/check-out digital dengan GPS + selfie (bagian 6) |
| Rekap kehadiran bulanan sulit | Rekap otomatis harian/mingguan/bulanan + export (bagian 6, 9.3) |
| HRD sulit memantau keterlambatan/izin/ketidakhadiran | Dashboard HRD + status otomatis hadir/terlambat (bagian 6.3) |
| Risiko kesalahan pencatatan & kehilangan data | Database terpusat + audit log (bagian 10, 11) |
| Pimpinan tidak bisa memantau real-time | Dashboard Pimpinan via WebSocket (bagian 9.4) |

---

## 3. TUJUAN PRODUK (GOALS) & NON-GOALS

**Goals — pastikan tercapai secara fungsional:**
1. Otomatisasi check-in/check-out.
2. Rekap kehadiran otomatis & akurat.
3. Visibilitas real-time untuk HRD & pimpinan.
4. Alur pengajuan & approval izin/cuti yang terdokumentasi.
5. Minim risiko kehilangan/kesalahan data via penyimpanan terpusat + audit log.

**Non-Goals — JANGAN dibangun, di luar ruang lingkup:**
- Penggajian (Payroll)
- Rekrutmen karyawan
- Penilaian performa karyawan
- Manajemen inventaris perusahaan
- Chat/komunikasi internal
- Manajemen proyek/tugas

---

## 4. TARGET PENGGUNA & PERSONA

Bangun UX yang menjawab kebutuhan spesifik tiap persona:

- **Karyawan** — butuh absen cepat, cek riwayat sendiri, ajukan izin/cuti tanpa kertas.
- **Admin/HRD** — butuh kelola data karyawan, approve izin/cuti, rekap laporan bulanan cepat.
- **Manajer/Pimpinan** — butuh lihat status kehadiran tim real-time, laporan ringkas per periode.

---

## 5. ROLE & HAK AKSES (RBAC)

Implementasikan role-based middleware di backend (guard tiap endpoint) dan route guard di frontend berdasarkan role dari JWT payload. Tiga role: **Karyawan**, **HRD/Admin**, **Manajer/Pimpinan**.

| Fitur | Karyawan | HRD/Admin | Manajer/Pimpinan |
|---|:---:|:---:|:---:|
| Login sesuai role | ✅ | ✅ | ✅ |
| Check-in/Check-out | ✅ | ✅ (opsional) | ✅ (opsional) |
| Ajukan izin/cuti | ✅ | ✅ | ✅ |
| Approve izin/cuti | ❌ | ✅ | opsional (tim sendiri) |
| Riwayat absensi pribadi | ✅ | ✅ | ✅ |
| Kelola data karyawan | ❌ | ✅ | ❌ |
| Rekap absensi seluruh karyawan | ❌ | ✅ | view-only (tim/departemen) |
| Dashboard statistik | pribadi | full | full real-time |
| Manajemen role/permission | ❌ | ✅ | ❌ |

---

## 6. FITUR UTAMA (IN SCOPE)

Bangun 8 fitur utama berikut, dengan 3 fitur pertama (check-in/check-out) mengikuti spesifikasi teknis wajib di bagian 6.1–6.3:

1. Autentikasi & Otorisasi Berbasis Role — login, forgot/reset password, session JWT.
2. **Check-in (Absen Masuk)** — validasi lokasi GPS real-time WAJIB + foto selfie WAJIB (lihat 6.1 & 6.2).
3. **Check-out (Absen Pulang)** — validasi sama seperti check-in, otomatis hitung durasi kerja.
4. Pengajuan Izin/Cuti — form dengan kategori, upload lampiran (file biasa, boleh dari galeri), status approval.
5. Riwayat Absensi — karyawan lihat pribadi, HRD lihat semua.
6. Dashboard Statistik Kehadiran — grafik per periode, per role.
7. Rekap Absensi Harian/Mingguan/Bulanan — termasuk export PDF/Excel.
8. Manajemen Data Karyawan (Admin) — CRUD karyawan, departemen, jabatan, status kepegawaian.

**Fitur pendukung:** manajemen jadwal kerja/shift & jam kerja, pengaturan lokasi absensi (geofence), kalender hari libur perusahaan, manajemen kuota cuti/izin, notifikasi in-app, audit log aktivitas sistem.

### 6.1 Validasi Lokasi GPS Real-time (WAJIB, bukan opsional)

- Gunakan **Geolocation API** browser (`navigator.geolocation.watchPosition`) — pelacakan berkelanjutan selama halaman check-in terbuka, bukan sekali ambil (mencegah spoofing lokasi statis).
- Jika GPS belum aktif/izin ditolak → tampilkan pesan blocking *"Aktifkan GPS untuk melanjutkan absensi"*, tombol check-in dinonaktifkan.
- Tampilkan **peta interaktif** (Leaflet + OpenStreetMap untuk MVP) berpusat di koordinat kantor (`-6.1202471, 106.7118952`), dengan:
  - Pin/marker lokasi kantor + lingkaran radius geofence (100m) tervisualisasi transparan.
  - Pin marker posisi karyawan saat ini, bergerak mengikuti update GPS real-time.
- Hitung jarak karyawan ke kantor dengan **haversine distance**:
  - Di dalam radius → tombol check-in aktif, status "Lokasi terverifikasi".
  - Di luar radius → tombol nonaktif (atau butuh approval khusus HRD untuk kasus WFH/lapangan, dikonfigurasi Admin).
- Simpan setelah berhasil: timestamp, latitude, longitude, akurasi GPS (meter), snapshot peta.
- HRD dapat melihat riwayat lokasi absensi tiap karyawan di halaman Detail Absensi/Audit Log.

### 6.2 Foto Selfie Wajib Sebagai Bukti Kehadiran

- Gunakan **MediaDevices API** (`navigator.mediaDevices.getUserMedia`, constraint `facingMode: "user"`) — kamera depan, **live capture langsung di aplikasi**.
- **Tombol upload dari galeri sengaja TIDAK disediakan** untuk fitur check-in/check-out — hanya live-capture, untuk mencegah kecurangan foto lama.
- Tampilkan preview sebelum konfirmasi + tombol "Ambil Ulang".
- Tempel watermark otomatis pada foto: nama karyawan, tanggal, jam, koordinat GPS saat itu.
- Tombol check-in/check-out baru aktif setelah **dua syarat sekaligus terpenuhi**: lokasi dalam radius **dan** foto selfie berhasil diambil.
- Kompresi gambar di sisi klien (maks. 300–500 KB) sebelum upload ke object storage (S3-compatible), simpan URL di field `foto_url` pada attendance record.
- Retensi foto minimal sesuai kebijakan HRD (contoh 1–2 tahun); akses foto dibatasi hanya untuk karyawan bersangkutan, HRD, dan pimpinan.

### 6.3 Kebijakan Jam Kerja & Batas Toleransi Keterlambatan

| Parameter | Nilai Default |
|---|---|
| Jam kerja | 09.00 – 17.00 WIB |
| Batas toleransi keterlambatan | 10 menit |
| Ambang status "Terlambat" | > 09.10 |

- Bandingkan timestamp check-in dengan jam masuk standar + toleransi dari tabel `work_schedules`.
- `waktu_checkin ≤ 09.10` → status otomatis **"Hadir"**.
- `waktu_checkin > 09.10` → status otomatis **"Terlambat"**, durasi keterlambatan dihitung dari **09.00** (bukan dari 09.10) agar data rekap akurat secara utuh.
- Status muncul real-time di layar konfirmasi check-in, dashboard karyawan, dan rekap HRD.
- Jam kerja, toleransi, dan hari kerja **harus dapat dikonfigurasi Admin** melalui halaman Pengaturan Jam Kerja tanpa perlu deploy ulang kode; nilai dapat berbeda per divisi/shift.

---

## 7. REKOMENDASI TECH STACK

### 7.1 Backend — gunakan **Go (Golang)**
- Framework: **Gin** atau **Fiber**, ORM: **GORM**.
- Database: **PostgreSQL**.
- Cache/Session: **Redis**.
- Auth: **JWT** (access + refresh token), password hashing **bcrypt/argon2**.
- File storage: **S3-compatible** (pakai **MinIO** untuk development lokal) — untuk foto selfie & lampiran izin.
- API: RESTful.

*(Alternatif jika dibutuhkan tim: Kotlin + Spring Boot untuk backend — tapi default dan prioritas utama tetap Go.)*

### 7.2 Frontend — gunakan **Angular** (versi stabil terbaru)
- UI Library: **Angular Material** atau **PrimeNG**.
- State management: **NgRx**.
- Data real-time: **RxJS** + **WebSocket**.
- Charting dashboard: **ngx-charts** atau **Chart.js**.
- Peta: **Leaflet.js** + OpenStreetMap tile layer.

*(Alternatif jika dibutuhkan: React — tapi default dan prioritas utama tetap Angular karena skala 55 halaman butuh struktur yang tegas/opinionated.)*

### 7.3 Arsitektur Umum
```
[Angular SPA] <--REST/JSON--> [Go REST API] <---> [PostgreSQL]
                                     |
                                     +--> [Redis - cache/session]
                                     +--> [S3-compatible/MinIO - foto & lampiran]
                                     +--> [WebSocket service - dashboard realtime]
```
Kontainerisasi seluruh stack dengan **Docker + docker-compose** (postgres, redis, minio, backend, frontend) agar bisa dijalankan lokal dengan satu perintah.

---

## 8. DAFTAR HALAMAN FRONTEND (minimal 50 — bangun 55 halaman, kelompokkan jadi modul routing Angular)

**A. Autentikasi & Umum (6):** Login, Lupa Password, Reset Password, 404, 403, Maintenance.

**B. Modul Karyawan (16):** Dashboard, Check-in, Check-out, Riwayat Absensi, Detail Absensi, Form Pengajuan Izin/Cuti, Riwayat Pengajuan, Detail Pengajuan, Kalender Kehadiran, Statistik Pribadi, Profil, Edit Profil, Ganti Password, Notifikasi, Unggah Bukti Absensi, Pengaturan Akun.

**C. Modul HRD/Admin (20):** Dashboard HRD, Daftar Karyawan, Tambah Karyawan, Edit Karyawan, Detail Karyawan, Import Bulk, Manajemen Departemen, Manajemen Jabatan, Manajemen Role & Permission, Daftar Approval, Detail Approval, Rekap Harian, Rekap Mingguan, Rekap Bulanan, Export Rekap, Manajemen Jadwal/Shift, Pengaturan Jam Kerja, Pengaturan Lokasi Absensi, Manajemen Kalender Libur, Manajemen Kuota Cuti.

**D. Laporan HRD Lanjutan (4):** Audit Log, Pengaturan Notifikasi, Laporan Keterlambatan, Laporan Ketidakhadiran.

**E. Modul Pimpinan (5):** Dashboard Real-time, Statistik per Tim/Departemen, Laporan per Karyawan, Perbandingan Antar Departemen, Export Laporan.

**F. Sistem & Bantuan (4):** Pengaturan Umum Sistem, Manajemen Backup Data, Bantuan/FAQ, Tentang Aplikasi.

---

## 9. ALUR PENGGUNA UTAMA (USER FLOW) — pastikan diimplementasikan persis

### 9.1 Alur Check-in/Check-out
Login → Dashboard Karyawan → buka halaman Check-in → sistem minta izin GPS → tampilkan peta + validasi radius → buka kamera → ambil selfie (live capture) → jika lokasi & selfie valid, tombol check-in aktif → tekan → sistem hitung status (hadir/terlambat) → simpan → tampilkan konfirmasi (stempel visual, lihat bagian 15) → sore hari ulangi untuk check-out → sistem hitung durasi kerja.

### 9.2 Alur Pengajuan Izin/Cuti
Karyawan isi form (jenis, tanggal, alasan, lampiran) → submit → status "Pending" → HRD terima notifikasi → buka Daftar Approval → review → Approve/Reject → karyawan terima notifikasi hasil.

### 9.3 Alur Rekap Data (HRD)
HRD buka menu Rekap Absensi → pilih periode (harian/mingguan/bulanan) + filter departemen → sistem generate rekap otomatis dari data check-in/check-out → export ke PDF/Excel.

### 9.4 Alur Monitoring Real-time (Pimpinan)
Login → Dashboard Pimpinan → lihat status kehadiran real-time (hadir/izin/alpha) per departemen via WebSocket → drill-down ke laporan detail per karyawan/departemen.

---

## 10. MODEL DATA UTAMA (ENTITAS) — implementasikan sebagai skema migrasi database

```
users              (id, nama, email, password_hash, role, status)
employees          (id, user_id, nik, department_id, position_id, tanggal_bergabung)
departments        (id, nama_departemen)
positions          (id, nama_jabatan)
attendance_records (
  id, employee_id, tanggal, jam_masuk, jam_pulang,
  status [hadir|terlambat|alpha],
  latitude, longitude, akurasi_gps, dalam_radius (bool),
  foto_selfie_masuk_url, foto_selfie_pulang_url
)
office_locations   (id, nama_lokasi, latitude -6.1202471, longitude 106.7118952, radius_meter 100, alamat)
work_schedules     (id, nama_shift, jam_mulai 09:00, jam_selesai 17:00, toleransi_terlambat_menit 10, hari_kerja)
leave_requests     (id, employee_id, jenis_izin, tanggal_mulai, tanggal_selesai, alasan, lampiran_url, status, approved_by)
leave_quotas       (id, employee_id, tahun, jenis_cuti, sisa_kuota)
holidays           (id, tanggal, keterangan)
audit_logs         (id, user_id, aksi, entitas_terkait, waktu)
notifications      (id, user_id, judul, pesan, status_baca, waktu)
```

Seed data awal wajib: 1 `office_locations` (kantor Golan Digital Kreatif, koordinat di atas), 1 `work_schedules` default (09:00–17:00, toleransi 10 menit), akun dummy untuk 3 role.

---

## 11. KEBUTUHAN NON-FUNGSIONAL

| Kategori | Kebutuhan |
|---|---|
| Performa | Respons API < 500ms untuk check-in/check-out |
| Skalabilitas | Minimal 500 karyawan aktif bersamaan |
| Keamanan | bcrypt/argon2, JWT dengan expiry, HTTPS wajib, RBAC ketat di semua endpoint |
| Ketersediaan | Uptime target 99.5% |
| Audit & Kepatuhan | Semua perubahan data penting tercatat di audit log |
| Kompatibilitas | Responsive di desktop & mobile browser (lihat breakpoint di bagian 15) |
| Backup Data | Otomatis harian, retensi minimal 30 hari |
| Lokasi/Geofencing | Validasi radius lokasi kantor untuk mencegah absen fiktif |
| GPS Real-time | Wajib aktifkan GPS untuk check-in/check-out; posisi live di peta interaktif |
| Perizinan Perangkat | Tangani skenario izin lokasi ditolak/GPS mati dengan pesan jelas, tombol dinonaktifkan sampai izin diberikan |
| Kamera/Selfie | Tangani skenario izin kamera ditolak dengan pesan jelas; selfie wajib live-capture, bukan upload galeri |

---

## 12. METRIK KEBERHASILAN (jadikan acuan kriteria "selesai/berhasil")

1. Rekap absensi bulanan: dari berhari-hari menjadi < 1 jam.
2. 100% karyawan pakai sistem digital dalam 1 bulan pertama.
3. Kesalahan pencatatan absensi mendekati 0%.
4. Pimpinan akses data real-time tanpa laporan manual.
5. Approval izin/cuti: dari rata-rata beberapa hari menjadi < 1 hari kerja.

---

## 13. RISIKO & MITIGASI — bangun mitigasi ini sebagai bagian dari sistem, bukan hanya dokumentasi

| Risiko | Mitigasi yang harus diimplementasikan |
|---|---|
| Fake GPS/absen dari lokasi tidak sah | Kombinasi geofencing (6.1) + foto selfie live-capture (6.2) + cek IP address |
| Resistensi karyawan terhadap sistem baru | (di luar scope teknis — sosialisasi tim internal) |
| Downtime saat jam absen pagi/sore | Load balancing & monitoring proaktif pada arsitektur backend |
| Kehilangan data akibat kegagalan sistem | Backup otomatis (bagian 11) + rencana disaster recovery |

---

## 14. ROADMAP PENGEMBANGAN — ikuti urutan fase ini saat membangun

| Fase | Cakupan |
|---|---|
| Fase 1 — MVP | Login, Check-in/out (GPS+selfie dasar), Riwayat Absensi, Manajemen Karyawan dasar |
| Fase 2 | Pengajuan Izin/Cuti + Approval, Notifikasi |
| Fase 3 | Dashboard Statistik & Rekap Otomatis + Export |
| Fase 4 | Dashboard Pimpinan Real-time (WebSocket), Audit Log, penyempurnaan Geofencing |
| Fase 5 | Polishing, testing, UAT |

---

## 15. SISTEM DESAIN ANTARMUKA (UI/UX DESIGN SYSTEM) — WAJIB DIIKUTI PERSIS

### 15.1 Filosofi Desain
Metafora **"kartu absen & stempel tinta"** — signature element adalah **stempel bundar berputar** bertuliskan "GOLAN DIGITAL KREATIF" yang muncul di layar login dan konfirmasi check-in.

### 15.2 Palet Warna (gunakan sebagai CSS variables/design tokens)
```css
--bg: #FFFFFF;
--mint-0: #F2FAF5;   /* latar gradasi lembut: sidebar, topbar, kartu statistik */
--mint-1: #E3F5EA;   /* hover, badge, input */
--mint-2: #C9ECD6;   /* gradasi lanjutan panel login */
--green: #1F9E64;    /* tombol utama, status hadir, indikator aktif */
--green-deep: #136E46; /* teks aksen, logo mark, hover */
--stamp: #C8672C;    /* warna stempel — satu-satunya titik kontras yang disengaja */
--late: #D99A2B;     /* status terlambat */
--absent: #D15C50;   /* status alpha/tidak hadir */
--text-dark: #14201A;
--text-dark-lo: #5D6E64;
```
Arah warna: **putih dominan dengan gradasi hijau muda** — bersih, tepercaya, selaras identitas digital kreatif, bukan tema gelap generik.

### 15.3 Tipografi
| Peran | Font |
|---|---|
| Display/Judul | Space Grotesk |
| Body/UI | Inter |
| Data/Monospace (jam, timestamp, NIK) | JetBrains Mono |

### 15.4 Layout & Komponen Utama
- Sidebar navigasi dengan **role switcher** (Karyawan/HRD/Pimpinan) — menu berubah sesuai role aktif.
- Kartu statistik (stat card) gradasi mint tipis, angka besar Space Grotesk.
- Pill status berwarna untuk hadir/terlambat/alpha/menunggu.
- Tabel data: header uppercase kecil, garis pemisah tipis, scroll horizontal otomatis di layar sempit.
- Tombol punch (check-in/out) berbentuk lingkaran besar sebagai fokus utama halaman absen, didampingi peta lokasi real-time.

### 15.5 Responsivitas — WAJIB 4 breakpoint
| Breakpoint | Perilaku |
|---|---|
| > 1080px | Layout penuh, sidebar tetap terlihat, grid statistik 3–4 kolom |
| ≤ 1080px | Grid statistik otomatis 2 kolom |
| ≤ 900px | Sidebar jadi **drawer** (menu geser) via tombol hamburger + overlay gelap; login jadi 1 kolom bertumpuk |
| ≤ 640px | Grid 1–2 kolom, tombol check-in mengecil proporsional, tabel tetap scroll horizontal |

### 15.6 Peta Lokasi Real-time pada Halaman Check-in
- Peta interaktif (Leaflet + OpenStreetMap) berpusat di koordinat kantor `-6.1202471, 106.7118952`.
- Pin penanda posisi karyawan bergerak mengikuti GPS real-time.
- Lingkaran radius geofence (100m) tervisualisasi transparan.
- Status tekstual di bawah peta berubah warna (hijau/merah) sesuai validasi lokasi.
- Tombol check-in otomatis terkunci jika GPS mati atau di luar radius.

### 15.7 Prototype Acuan
Gunakan prototype HTML/CSS/JS yang sudah divalidasi (7 layar representatif: Login, Dashboard Karyawan, Check-in/out, Pengajuan Izin, Dashboard HRD, Data Karyawan, Approval, Rekap Absensi, Dashboard Pimpinan) sebagai acuan visual pixel-level untuk direplikasi ke seluruh 55 halaman.

### 15.8 Aset Visual & Penamaan File Logo
- File logo resmi bernama **`icon_golan`** akan disediakan terpisah dan diletakkan di folder project (contoh path: `src/assets/icon_golan.svg`).
- Format utama: `.svg` (skalabel); fallback `.png` 512×512px transparan untuk favicon/PWA.
- Sampai file tersedia, gunakan placeholder: kotak `border-radius:8px` gradasi `linear-gradient(155deg, #28b876, #136e46)` berisi huruf "G" putih bold (Space Grotesk), ukuran tampil 30×30px di sidebar/topbar.
- Pasang juga sebagai **favicon** (`<link rel="icon">`) — muncul di tab browser — format `.svg` utama + fallback `.png` 32×32 dan 16×16.
- Setelah file `icon_golan` final tersedia, seluruh referensi placeholder "G" (brand mark & favicon) digantikan otomatis.

---

## 16. LAMPIRAN: RINGKASAN RUANG LINGKUP

**Termasuk (In Scope):** Login berbasis role, check-in/check-out (GPS real-time + selfie wajib + validasi jam kerja), pengajuan izin/cuti, riwayat absensi, dashboard statistik, rekap harian/mingguan/bulanan, manajemen data karyawan.

**Tidak Termasuk (Out of Scope):** Payroll, rekrutmen, penilaian performa, manajemen inventaris, chat internal, manajemen proyek/tugas.

---

*Prompt ini disusun mengikuti urutan PRD v1.1 (bagian 1–16) dan prototype desain yang sudah divalidasi bersama stakeholder PT. Golan Digital Kreatif. Ikuti setiap bagian secara berurutan saat membangun project.*
