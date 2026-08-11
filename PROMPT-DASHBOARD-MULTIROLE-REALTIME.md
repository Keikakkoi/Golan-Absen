# Prompt Implementasi Dashboard Multi-Role Realtime — Golan

## Peran kamu

Kamu adalah senior engineer Angular 18 + Go Fiber yang melanjutkan project absensi Golan. Kerjakan implementasi langsung pada repository ini, bukan membuat mockup terpisah. Sebelum mengubah kode, inspeksi struktur project, `PRD-Sistem-Absensi-Golan-Digital-Kreatif.md`, route, guard, service, model, endpoint, database, dan PDF referensi `C:\Users\devan\Downloads\All Navbar Dashboard.pdf`.

## Tujuan utama

Bangun ulang isi halaman yang dibuka dari menu **Dashboard** yang sudah ada menjadi dashboard analitik sesuai role:

- `HRD` / admin: monitoring seluruh operasional absensi, karyawan, magang, laporan kerja, logbook, izin/cuti, dan tindak lanjut HR.
- `Karyawan`: ringkasan absensi pribadi, tren kehadiran, laporan kerja, izin/cuti, target, dan notifikasi.
- `MAGANG`: ringkasan absensi pribadi, logbook, progres kegiatan, mentor, periode magang, sertifikat, dan hari tersisa.
- `MANAJER`: ringkasan absensi dan produktivitas tim yang menjadi kewenangannya, laporan kerja, logbook, approval, dan anggota yang perlu ditindaklanjuti.

Jangan membuat navbar baru, halaman landing dashboard baru, atau menu analitik khusus. Pertahankan item sidebar **Dashboard** yang telah ada untuk tiap role dan jadikan route dashboard role tersebut sebagai satu-satunya pintu masuk analitik. Jangan merusak route, guard, permission, tema, komponen, atau fitur lain.

## Referensi visual wajib

Ikuti layout dan hierarki visual dari `All Navbar Dashboard.pdf` serta design system yang sudah ada di project:

- gunakan sidebar/navbar yang sudah ada, logo Golan, warna, tipografi, spacing, card, badge, tabel, tombol, dark mode, dan breakpoint responsif yang sudah dipakai;
- jangan mengubah urutan, label, atau perilaku menu selain penyesuaian yang memang diperlukan agar link **Dashboard** menuju dashboard role yang benar;
- gunakan satu komponen/layout bersama dan konfigurasi berbasis role, bukan empat navbar yang duplikatif;
- chart harus memiliki judul, legenda, tooltip, label angka, satuan, empty state, dan aksesibilitas; sediakan tabel ringkas atau `aria-label` sebagai alternatif data;
- jangan memakai warna status yang ambigu: hadir/sukses hijau, izin/cuti biru, terlambat oranye, alfa/tidak hadir merah, pending kuning, netral abu-abu; konsisten di semua chart.

## Layout dashboard

Setiap dashboard berisi bagian berikut sesuai hak akses role:

1. Header: sapaan/nama user, tanggal dan jam WIB, status koneksi realtime, waktu sinkronisasi terakhir, tombol refresh manual, notifikasi yang sudah ada.
2. Filter analitik: rentang tanggal, hari/minggu/bulan, departemen/divisi/proyek untuk role yang berwenang, serta tombol reset. Filter tidak boleh hilang ketika data realtime masuk.
3. KPI cards: angka utama, label jelas, perubahan dibanding periode sebelumnya, icon/status, loading skeleton, error retry, dan empty state.
4. Visualisasi:
   - line/area chart tren hadir, terlambat, izin/cuti, alfa, dan total check-in;
   - bar chart perbandingan departemen/tim atau hari kerja sesuai scope role;
   - donut/pie chart komposisi status absensi;
   - bar chart laporan kerja/logbook: selesai, pending, terlambat, ditolak;
   - progress chart untuk target kerja/progres magang jika datanya tersedia.
5. Panel tindak lanjut: approval pending, laporan/logbook belum diisi, keterlambatan, alfa, kontrak magang mendekati selesai, dan notifikasi penting. Setiap item memiliki route aksi yang sudah ada, bukan route baru.
6. Activity/recent update: perubahan absensi, laporan, logbook, approval, dan notifikasi terbaru dengan waktu yang benar.

### Data khusus role

**Admin/HRD** wajib menampilkan total karyawan aktif, hadir hari ini, belum absen, terlambat, izin/cuti, alfa, magang aktif, logbook pending, laporan kerja pending/terlambat, distribusi per departemen, tren absensi, dan daftar tindak lanjut. Data harus mencakup karyawan dan magang tanpa membocorkan data yang tidak berwenang.

**Karyawan** wajib menampilkan status check-in/out hari ini, jam kerja, total hadir/terlambat/izin/alfa periode aktif, tren pribadi, laporan kerja terkirim/pending, saldo izin bila tersedia, kalender ringkas, dan notifikasi.

**Magang** wajib menampilkan status absensi hari ini, kehadiran periode, logbook terkirim/pending/disetujui/ditolak, progres periode/kegiatan, mentor, tanggal mulai/selesai, hari tersisa, sertifikat, dan tindak lanjut logbook.

**Manajer** hanya boleh melihat data timnya: jumlah anggota, hadir/belum absen/terlambat/izin/alfa hari ini, tren tim, komposisi status, perbandingan anggota/departemen yang menjadi scope-nya, laporan kerja/logbook pending, dan approval cuti/izin. Jangan tampilkan data tim lain.

## Kontrak API dan otorisasi

- Reuse endpoint yang sudah ada bila kontraknya benar. Jika belum cukup, buat endpoint dashboard terpisah yang konsisten, terdokumentasi, dan memakai model/query database yang aman.
- Semua endpoint harus memakai JWT middleware dan pemeriksaan role/scope di backend; frontend guard saja tidak cukup.
- Jangan mengirim data mentah sensitif yang tidak diperlukan chart.
- Gunakan parameter tervalidasi: `start_date`, `end_date`, `period`, `department_id`, `project_id`, `page`, dan `limit` sesuai kebutuhan.
- Response harus memiliki bentuk stabil, misalnya `{ kpi, attendance_trend, status_breakdown, department_comparison, work_reports, actions, meta }`, angka selalu numerik, tanggal ISO, timezone ditetapkan `Asia/Jakarta`/WIB, dan nilai kosong menjadi `0` atau `[]`.
- Jangan memakai data hard-coded, angka contoh, `localhost` yang tersebar di komponen, atau memalsukan status realtime.

## Realtime lintas role

Implementasikan satu `RealtimeService`/hub RxJS bersama untuk seluruh dashboard. Jangan membuat koneksi WebSocket baru untuk setiap widget atau komponen. Prioritaskan WebSocket yang sudah tersedia di backend dengan autentikasi token saat handshake; gunakan polling terkontrol sebagai fallback.

Event minimal:

- `attendance.created`, `attendance.updated`;
- `leave.created`, `leave.updated`;
- `work_report.created`, `work_report.updated`;
- `logbook.created`, `logbook.updated`;
- `notification.created`;
- `dashboard.refresh`.

Payload minimal berisi `event`, `entity_id`, `actor_id`, `audience`/`scope`, `occurred_at`, dan data ringkas yang aman. Backend wajib memfilter broadcast berdasarkan user, role, departemen, atau manager scope; user tidak boleh menerima event dashboard milik organisasi/team lain. Setelah menerima event, invalidasi dan ambil ulang agregat yang relevan, jangan menambahkan data mentah secara spekulatif.

Aturan koneksi: reconnect exponential backoff dengan batas maksimum, status online/offline terlihat, cleanup subscription/socket saat destroy, tidak ada duplicate listener, polling hanya aktif ketika socket gagal, retry aman, dan refresh tidak mereset filter, scroll, form, atau notifikasi yang sedang diproses.

## Kualitas dan anti-bug

- Gunakan `ChangeDetectionStrategy.OnPush` bila kompatibel, RxJS subscription management, dan hindari memory leak.
- Tangani loading, empty, error, retry, timeout, offline, akses role salah, data null, tanggal invalid, pembagian dengan nol, dan data besar.
- Chart tidak boleh rusak ketika hanya satu seri kosong atau data realtime datang bersamaan.
- Tampilkan fallback tabel/teks untuk screen reader dan jangan hanya mengandalkan warna.
- Responsif desktop/tablet/mobile, tidak overflow horizontal tanpa alasan, dan tetap kompatibel dark mode.
- Jangan menghapus data atau mengubah migration lama tanpa alasan kuat. Semua query agregasi harus efisien dan memiliki index yang diperlukan.

## Pengujian wajib

Tambahkan/perbarui test yang relevan untuk:

1. role guard dan akses langsung URL dashboard;
2. transform response API ke KPI dan series chart, termasuk data kosong/null;
3. filter, reset, retry, loading, error, dark mode, dan responsif;
4. satu koneksi realtime per dashboard session, reconnect, fallback polling, dan cleanup;
5. check-in karyawan memperbarui dashboard admin dan manajer yang berwenang;
6. laporan kerja/logbook memperbarui KPI owner, manajer, dan admin sesuai scope;
7. event dari scope lain tidak terlihat oleh user;
8. backend authorization, response schema, timezone WIB, dan agregasi periode.

## Definition of Done

- Menu **Dashboard** yang lama tetap dipakai; tidak ada navbar atau route khusus analitik baru.
- Admin, karyawan, magang, dan manajer memiliki isi dashboard berbeda sesuai role dengan visual design system Golan yang sama.
- Chart garis, batang, dan lingkaran tampil dari data API nyata, bukan hard-code.
- Absensi, laporan kerja, logbook, izin/cuti, dan notifikasi tersinkron realtime dengan fallback yang aman.
- Tidak ada kebocoran data lintas role/scope.
- Jalankan formatter, unit test, integration test yang tersedia, dan production build Angular serta test Go. Laporkan command yang dijalankan dan error yang memang sudah ada sebelumnya; jangan memperbaiki unrelated changes.
- Sebelum selesai, tampilkan daftar file yang diubah, kontrak endpoint/event, asumsi, dan langkah verifikasi manual untuk setiap role.

Kerjakan bertahap: inspeksi source dan PDF, petakan kontrak data existing, rapikan service realtime bersama, implementasikan backend authorization/agregasi, implementasikan dashboard role dengan komponen chart reusable, integrasikan item Dashboard yang sudah ada, tambahkan test, lalu jalankan validasi. Jangan mengubah fitur di luar ruang lingkup ini.
