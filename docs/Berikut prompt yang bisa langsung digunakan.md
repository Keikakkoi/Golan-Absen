Saya ingin mengubah sistem identitas data pada aplikasi Absensi Golan.

Konteks aplikasi:

- Backend menggunakan Go, Fiber, GORM, dan PostgreSQL.
- Frontend menggunakan Angular.
- User berada pada workspace proyek saat ini.
- Jangan langsung mengubah kode sebelum melakukan audit struktur database, model, handler, service, dan komponen frontend yang berkaitan.

Tujuan:
Ubah penggunaan “ID” yang ditampilkan kepada pengguna menjadi “Code”. ID database tetap digunakan untuk relasi internal dan tidak boleh dihapus atau diganti.

Aturan utama:

1. ID database internal tetap dipertahankan

Pertahankan field seperti:

- users.id
- employees.id
- divisions.id
- positions.id

Field tersebut hanya digunakan untuk primary key dan relasi database. ID database boleh loncat dan tidak perlu ditampilkan sebagai identitas bisnis.

2. Tambahkan employee code otomatis

Tambahkan field baru pada user atau employee sesuai struktur aplikasi yang paling tepat:

```text
employee_code

Format employee code wajib:
[Kode jabatan][Kode Divisi][Nomor Urut]

Gunakan kode jabatan berikut:
Magang   = 01
Karyawan = 02
Manajer  = 03

Kode divisi dibuat otomatis atau dikonfigurasi oleh admin:
Divisi A = 1
Divisi B = 2

Contoh:
Karyawan Divisi A nomor 001 = 021001
Magang Divisi A nomor 001   = 011001
Manajer Divisi B nomor 001  = 032001

Agar mudah dibaca, tampilkan pada frontend dengan format:
02-1-001
01-1-001
03-2-001

Namun nilai database boleh disimpan sebagai:
021001
011001
032001

Gunakan satu format secara konsisten setelah ditentukan.

3. Employee code harus dibuat oleh backend

Jangan membuat employee code di Angular.
Saat menambahkan karyawan, magang, atau manajer:
- Backend membaca jabatan.
- Backend membaca divisi.
- Backend mengambil nomor urut berikutnya.
- Backend membuat employee code otomatis.
- Backend menyimpan user dan employee dalam satu database transaction.
- Frontend hanya menampilkan hasil employee code dari backend.
- Employee code tidak boleh diisi manual oleh admin.

4. Hindari code bertabrakan

Implementasikan mekanisme yang aman terhadap dua admin yang menyimpan data secara bersamaan.
Gunakan salah satu pendekatan yang aman:
- PostgreSQL sequence untuk setiap kombinasi role dan divisi; atau
- tabel generator code dengan row locking dan transaction.
Jangan hanya menggunakan:
SELECT MAX(employee_code) + 1
tanpa locking karena dapat menghasilkan code duplikat.
Tambahkan unique index pada employee code.
Aturan tambahan:
- Code tidak boleh digunakan ulang setelah data dihapus.
- Code harus tetap unik.
- Jika proses penyimpanan gagal, transaction harus rollback.
- Jika role atau divisi tidak valid, data tidak boleh disimpan.
- Jika employee code sudah ada, backend harus menangani conflict dan mencoba secara aman sesuai mekanisme generator.

5. Tambahkan division code

Tambahkan field:
division_code
pada tabel divisions.
Saat membuat divisi baru:
- Sistem membuat division code otomatis jika admin tidak memilih mode custom.
- Division code harus unik.
- Nama divisi juga harus unik.
- Tampilkan code pada daftar dan detail divisi.
- Jangan gunakan divisions.id sebagai code yang ditampilkan.
Contoh:
Golan Website = 1
Golan Education = 2
Sediakan opsi edit division code dari halaman admin.
Saat division code diubah:
- Jangan mengubah divisions.id.
- Semua employee_code milik divisi tersebut harus dibuat ulang menggunakan division code terbaru.
- Nomor urut employee tetap dipertahankan.
- Perubahan harus dilakukan dalam satu transaction.
- Perubahan harus dicatat pada audit log.
- Pastikan tidak ada duplicate employee_code setelah perubahan.
Contoh:
Sebelum:
Fakhri = 02-1-001
Jika kode divisi berubah dari 1 menjadi 5:
Fakhri = 02-5-001

6. Kode role

Simpan mapping role code secara terpusat di backend, bukan tersebar di banyak file.
Contoh:
MAGANG  -> 01
Karyawan -> 02
MANAJER -> 03
Jika role seorang user berubah:
- Employee code harus dibuat ulang berdasarkan role baru.
- Division code tetap sama.
- Nomor urut baru atau nomor urut lama harus ditentukan secara konsisten.
- Jangan sampai code lama dan code baru bertabrakan.
- Catat perubahan pada audit log.

7. Perbedaan role dan jabatan harus jelas

Periksa struktur aplikasi saat ini karena terdapat:
- Role: Magang, Karyawan, Manajer.
- Jabatan/Position: Software Engineer, Designer, Content Writer, dan sebagainya.
- Divisi/Division: Golan Website, Golan Education, dan sebagainya.
Employee code wajib menggunakan:
[Kode Role][Kode Divisi][Nomor Urut]
Jabatan/position tidak masuk ke employee code berdasarkan format ini.
Tambahkan juga field berikut pada positions:
position_code
Position code harus:
- Dibuat otomatis ketika jabatan dibuat.
- Unik.
- Bisa diedit oleh admin.
- Tetap menggunakan positions.id sebagai primary key internal.
Jika position code diubah:
- Jangan mengubah employee_code karena employee_code tidak menggunakan position code.
- Update position_code yang tampil pada daftar, detail, dropdown, laporan, dan export.
- Jangan mengubah relasi employee terhadap position.
- Catat perubahan pada audit log.
Jika istilah “jabatan” di aplikasi ternyata dimaksudkan sebagai role Magang/Karyawan/Manajer, gunakan role code sebagai bagian employee_code. Jangan mencampuradukkan role dengan position.

8. Migrasi data lama

Sebelum membuat perubahan:
- Audit semua tabel, API, frontend, laporan, export, import, dan pencarian yang masih menampilkan ID.
- Cari semua penggunaan NIK, users.id, employees.id, divisions.id, dan positions.id.
- Buat migration untuk menambahkan field baru.
- Generate employee_code untuk semua data lama tanpa mengubah primary key.
- Generate division_code dan position_code untuk data lama.
- Pastikan semua code lama tidak duplikat.
- Jangan menghapus data lama sebelum migration berhasil.
- Sediakan fallback jika ada data lama yang tidak lengkap.

9. Backend yang harus diperbarui

Perbarui seluruh endpoint yang berkaitan dengan:
- Tambah employee.
- Edit employee.
- Tambah manager.
- Tambah intern.
- Import employee.
- Tambah division.
- Edit division.
- Tambah position.
- Edit position.
- Detail employee.
- Daftar employee.
- Laporan.
- Export.
- Search dan filter.
Response API harus mengembalikan code dengan nama yang jelas, misalnya:
{
  "id": 23,
  "employee_code": "02-1-001",
  "nama": "Fakhri",
  "role": "Karyawan",
  "division_id": 1,
  "division_code": "1",
  "position_id": 4,
  "position_code": "JBT-001"
}
Primary key internal tetap boleh dikirim untuk kebutuhan frontend, tetapi jangan tampilkan sebagai identitas utama kepada pengguna.

10. Frontend yang harus diperbarui

Perbarui halaman:
- Employee list.
- Employee detail.
- Employee form.
- Division management.
- Position management.
- Manager list.
- Intern list.
- Report.
- Export/import.
- Search dan filter.
Gunakan label:
Code
Employee Code
Division Code
Position Code
Jangan menggunakan label “ID” untuk code bisnis.
Employee code hanya untuk ditampilkan dan tidak boleh diedit manual.
Division code dan position code boleh diedit oleh admin melalui form masing-masing.
Tambahkan confirmation dialog sebelum perubahan code karena perubahan division code akan memperbarui employee_code banyak karyawan.

11. Validasi

Tambahkan validasi backend dan frontend:
- Role wajib valid.
- Division wajib valid.
- Division code wajib unik.
- Position code wajib unik.
- Employee code wajib unik.
- Code tidak boleh kosong.
- Code tidak boleh mengandung spasi atau karakter ilegal.
- Code harus mengikuti format yang ditentukan.
- Tidak boleh ada employee_code duplikat setelah edit division code atau perubahan role.

12. Testing

Tambahkan atau perbarui unit test dan integration test untuk:
- Membuat karyawan baru.
- Membuat magang baru.
- Membuat manajer baru.
- Membuat divisi baru.
- Membuat jabatan baru.
- Membuat dua data secara bersamaan.
- Menghapus data lalu membuat data baru.
- Mengubah division code.
- Mengubah position code.
- Mengubah role user.
- Import employee.
- Migration data lama.
- Percobaan membuat code duplikat.
- Rollback ketika proses gagal.
Sebelum selesai:
- Tampilkan file yang diubah.
- Jelaskan migration yang dibuat.
- Jalankan test backend.
- Jalankan test frontend.
- Periksa apakah TypeScript dan Go berhasil build.
- Pastikan tidak ada penggunaan ID database sebagai code bisnis yang tersisa.
- Jangan menghapus fungsi lama sebelum penggantinya sudah berjalan dan teruji.

Catatan penting: karena format employee code hanya memakai role, divisi, dan nomor urut, perubahan `position_code` tidak boleh mengubah employee code. Yang dapat mengubah employee code adalah perubahan rol
```
