# Prompt Implementasi Filter Statistik Kehadiran Pribadi

```text
Tambahkan filter rentang tanggal pada halaman "Statistik Kehadiran Pribadi" yang digunakan oleh role Karyawan dan Manajer, dengan tampilan dan perilaku yang konsisten dengan halaman "Statistik Kehadiran Magang".

Konteks kode saat ini:
- Route halaman pribadi: `/employee/statistics`.
- Route tersebut terdaftar untuk role `Karyawan`, `MANAJER`, dan `MAGANG`, tetapi kebutuhan ini ditujukan untuk tampilan statistik pribadi Karyawan dan Manajer.
- Jangan merusak kompatibilitas role `MAGANG`; bila komponen yang sama tetap dirender untuk MAGANG, gunakan kondisi role atau pertahankan perilaku yang kompatibel dengan halaman `/intern/statistics`.
- Komponen utama: `frontend/src/app/features/employee/statistics/statistics.component.html`, `.ts`, dan `.scss`.
- Service riwayat absensi: `frontend/src/app/core/services/attendance.service.ts`.
- Referensi UI/UX filter: `frontend/src/app/features/intern/intern-statistics/intern-statistics.component.html`, `.ts`, dan `.scss`.

Tujuan:
1. Tambahkan toolbar filter di bawah judul halaman statistik pribadi.
2. Tampilkan dua input tanggal native:
   - `Mulai` dengan parameter `start_date`.
   - `Selesai` dengan parameter `end_date`.
3. Gunakan styling, ukuran, jarak, warna, dan perilaku responsive yang sama atau sedekat mungkin dengan filter pada halaman "Statistik Kehadiran Magang".
4. Ketika tanggal mulai atau selesai berubah, muat ulang data statistik dan terapkan rentang tersebut pada seluruh metrik:
   - persentase kehadiran;
   - rincian Hadir, Izin, Cuti, Terlambat, dan Alpha;
   - rata-rata jam check-in;
   - statistik tipe kerja WFO, WFH, dan Dinas Luar/Remote;
   - tren durasi kerja.
5. Jika hanya salah satu tanggal diisi, tetap gunakan filter yang tersedia. Jika keduanya kosong, tampilkan seluruh data sesuai perilaku saat ini.
6. Validasi rentang tanggal. Jika tanggal mulai lebih besar dari tanggal selesai, tampilkan pesan validasi yang jelas dan cegah request atau perhitungan yang tidak valid.
7. Pastikan pengguna hanya dapat melihat statistik absensinya sendiri.

Implementasi teknis:
- Ikuti pola `start`, `end`, `load()`, dan `[(ngModel)]`/`(ngModelChange)` dari komponen statistik magang.
- Pastikan `FormsModule` diimpor pada standalone component jika diperlukan.
- Perbarui `AttendanceService.getHistory()` agar dapat menerima parameter tanggal opsional, atau tambahkan dukungan query backend bila endpoint riwayat belum mendukung `start_date` dan `end_date`.
- Gunakan format query ISO `YYYY-MM-DD` dan pertahankan timezone bisnis aplikasi `Asia/Jakarta`.
- Terapkan filter pada sumber data sebelum semua metrik dan grafik dihitung, bukan hanya menyembunyikan tampilan grafik.
- Pertahankan struktur kartu, perhitungan yang sudah benar, loading state, empty state, dan error handling yang sudah ada.
- Jangan mengubah halaman "Statistik Kehadiran Magang" dan jangan menambahkan filter berdasarkan user lain, divisi, atau tim.
- Gunakan default tanggal kosong seperti halaman statistik magang jika belum ada mekanisme penyimpanan state filter.
- Pastikan layout tetap rapi pada desktop dan mobile, tidak menyebabkan horizontal overflow, dan tidak menutupi kartu statistik.

Pengujian wajib:
1. Login sebagai Karyawan, buka `/employee/statistics`, isi tanggal mulai dan selesai, lalu pastikan seluruh KPI dan grafik berubah sesuai periode.
2. Uji hanya tanggal mulai, hanya tanggal selesai, dan kedua tanggal kosong.
3. Uji tanggal mulai setelah tanggal selesai dan pastikan validasi tampil.
4. Login sebagai Manajer dan ulangi pengujian; pastikan yang tampil adalah statistik pribadi Manajer, bukan statistik tim.
5. Pastikan data di luar periode tidak memengaruhi jumlah, persentase, rata-rata, tipe kerja, maupun tren.
6. Uji tanggal yang tidak memiliki data dan pastikan empty state atau metrik nol tampil tanpa error.
7. Uji tampilan desktop dan mobile serta pastikan tidak ada error pada console atau request API yang gagal.
8. Tambahkan atau perbarui unit test/component test yang relevan untuk parameter tanggal, validasi rentang, dan perhitungan metrik setelah filter.

Setelah selesai, tampilkan ringkasan file yang diubah, keputusan apakah filter dilakukan melalui API atau setelah mengambil riwayat, serta hasil pengujian.
```
