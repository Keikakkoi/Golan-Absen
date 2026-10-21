# Prompt Perbaikan Filter Bulan, Tahun, dan Kolom Periode Penggajian

Perbaiki modul **Penggajian** pada aplikasi Absensi Golan Digital Kreatif.

## Masalah

1. Filter **Bulan** dan **Tahun** belum konsisten saat digunakan.
2. Filter tidak boleh mengirim request pada setiap ketikan angka tahun.
3. Slip gaji dengan periode `Oktober 2026` sudah tersimpan, tetapi kolom
   **Periode** pada tabel Admin tampil kosong.

## Perbaikan yang wajib dilakukan

### Filter Bulan dan Tahun

- Ubah filter Bulan menjadi pilihan Januari sampai Desember, dengan nilai
  `1` sampai `12`.
- Sediakan pilihan awal `Semua bulan` dengan nilai kosong.
- Ubah filter Tahun menjadi dropdown dengan gaya visual yang sama seperti
  dropdown Bulan, dengan pilihan `Semua tahun` dan daftar tahun yang valid.
- Jalankan filter Tahun ketika input selesai diubah (`change`/submit), bukan
  pada setiap karakter yang diketik.
- Jika Bulan dan Tahun dipilih, hasil harus hanya memuat slip pada kombinasi
  bulan-tahun tersebut.
- Jika hanya Tahun dipilih, tampilkan semua bulan pada tahun tersebut.
- Jika hanya Bulan dipilih, tampilkan bulan tersebut pada seluruh tahun.
- Tombol Reset harus mengosongkan Bulan, Tahun, Karyawan, Divisi, dan Status,
  lalu memuat ulang halaman pertama.
- Backend harus memvalidasi Bulan `1..12` dan Tahun dalam rentang tahun yang
  disepakati aplikasi. Nilai invalid harus menghasilkan HTTP 400 dengan pesan
  yang jelas.
- Gunakan query rentang tanggal untuk kombinasi Bulan dan Tahun, misalnya
  `periode_bulan >= awal_periode AND periode_bulan < awal_bulan_berikutnya`.
  Jangan membandingkan angka hasil `EXTRACT` dengan string dari query secara
  langsung.

### Kolom Periode

- Ambil nilai dari field API `periode_bulan`.
- Dukung format ISO seperti `2026-10-01T00:00:00Z`, `2026-10-01`, dan
  `2026-10`.
- Format tampilan dengan parsing tahun dan bulan yang eksplisit menjadi
  `Oktober 2026` menggunakan locale Indonesia.
- Jika nilainya kosong atau tidak valid, tampilkan `-`, bukan string kosong.
- Gunakan formatter yang sama pada tabel Admin, Preview, halaman Slip Gaji
  karyawan, dan nama file PDF bila relevan.
- Jangan mengubah nilai tanggal yang tersimpan di database hanya untuk
  memperbaiki tampilan.

## Validasi dan pengujian

Tambahkan atau perbarui pengujian untuk memastikan:

1. Filter Bulan Oktober mengirim nilai `10` dan menemukan slip Oktober.
2. Filter Tahun `2026` menemukan seluruh slip pada 2026.
3. Filter Bulan `10` + Tahun `2026` hanya menemukan periode `2026-10`.
4. Nilai Bulan `0` atau `13` ditolak backend.
5. Tahun invalid ditolak backend.
6. Nilai `2026-10-01T00:00:00Z` ditampilkan sebagai `Oktober 2026`.
7. Nilai periode kosong/invalid ditampilkan sebagai `-`.
8. Slip baru dengan periode Oktober 2026 tampil pada kolom Periode tabel Admin.
9. Reset mengembalikan daftar tanpa filter dan kembali ke halaman pertama.
10. Tidak ada error TypeScript, Go test, atau error di console browser.

Sebelum selesai, tampilkan file yang diubah, hasil pengujian, serta contoh
request API untuk filter `month=10&year=2026`.
