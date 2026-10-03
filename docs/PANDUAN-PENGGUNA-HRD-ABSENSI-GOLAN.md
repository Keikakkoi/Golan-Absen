# Panduan Penggunaan Absensi Golan Digital Kreatif

## User Manual — Role HRD/Admin

| Keterangan | Isi |
| --- | --- |
| Nama sistem | Absensi Golan Digital Kreatif |
| Jenis dokumen | Panduan penggunaan tahap 1 |
| Role utama | HRD/Admin |
| Versi | 1.0 — 28 September 2026 |
| Cakupan tahap | Antarmuka umum, role, master data, dan konfigurasi absensi |

> Dokumen ini menggunakan struktur tutorial SIMKEU yang dikirim sebagai contoh. Istilah,
> menu, alur, dan screenshot di bawah disesuaikan dengan aplikasi Absensi Golan yang ada
> di repository ini. Modul keuangan, pajak, COA, dan invoice dari dokumen contoh tidak
> termasuk dalam project ini.

## Daftar isi

- [Glosarium](#glosarium)
- [Bagian I — Panduan antarmuka umum](#bagian-i--panduan-antarmuka-umum)
- [Bagian II — Manajemen data HRD](#bagian-ii--manajemen-data-hrd)
- [Bagian III — Konfigurasi hak akses dan operasional role](#bagian-iii--konfigurasi-hak-akses-dan-operasional-role)
- [Bagian IV — Konfigurasi absensi](#bagian-iv--konfigurasi-absensi)
- [Bagian V — Konfigurasi kuota izin dan cuti](#bagian-v--konfigurasi-kuota-izin-dan-cuti)
- [Batas implementasi tahap saat ini](#batas-implementasi-tahap-saat-ini)
- [Referensi screenshot](#referensi-screenshot)

## Glosarium

| Istilah | Definisi |
| --- | --- |
| HRD/Admin | Role dengan akses pengelolaan master data, approval, rekap, konfigurasi, dan audit organisasi. |
| Karyawan | Pengguna yang mencatat absensi, melihat riwayat, mengajukan izin/cuti, dan mengisi laporan kerja. |
| Magang | Pengguna dengan laporan kerja, mentor, dan sertifikat magang. |
| Manajer | Pengguna yang memantau tim dan melakukan approval atau review sesuai scope-nya. |
| Divisi | Unit organisasi yang digunakan untuk mengelompokkan karyawan. |
| Jabatan | Posisi atau peran pekerjaan karyawan dalam organisasi. |
| Project | Project aktif yang dapat dikaitkan ke data karyawan. |
| Route | Alamat halaman aplikasi, misalnya `/admin/employees`. |

# Bagian I — Panduan antarmuka umum

## 1.1 Pendahuluan

Panduan ini ditujukan untuk HRD/Admin yang mengelola data dan operasional Absensi Golan
Digital Kreatif. HRD memiliki cakupan data seluruh organisasi, sedangkan Karyawan, Magang,
dan Manajer melihat menu sesuai role serta scope masing-masing.

Alur masuk aplikasi:

1. Buka halaman login aplikasi pada route `/login`.
2. Masukkan kredensial akun yang diberikan oleh HRD.
3. Selesaikan validasi login yang ditampilkan.
4. Setelah berhasil, sistem mengarahkan HRD ke `/admin/dashboard`.

> **Catatan akses:** route guard pada frontend membantu mengarahkan pengguna, tetapi
> pembatasan role dan scope tetap divalidasi oleh backend. Jangan membagikan token atau
> kredensial melalui screenshot.

### Referensi screenshot web — R-SC-01 (Login)

Tempatkan screenshot halaman login di bagian ini setelah mengambilnya dari aplikasi yang
sedang berjalan.

- Route yang ditampilkan: `/login`
- Sumber halaman: [`login.component.html`](../frontend/src/app/features/auth/login/login.component.html)
- Sumber perilaku login: [`login.component.ts`](../frontend/src/app/features/auth/login/login.component.ts)
- Referensi implementasi route: [`app.routes.ts`](../frontend/src/app/app.routes.ts)

Screenshot harus memperlihatkan form login tanpa menampilkan password, token, atau data
pribadi pengguna.

## 1.2 Mengenal antarmuka HRD

Setelah login, sidebar menampilkan badge **HRD / Admin** dan menu berikut:

| Kelompok | Menu | Fungsi |
| --- | --- | --- |
| Ringkasan | Dashboard | Melihat ringkasan kehadiran dan tindak lanjut hari ini. |
| Master data | Karyawan | Menambah, mengubah, melihat, menghapus, dan mengekspor data karyawan. |
| Master data | Organisasi & Jabatan | Mengelola divisi, jabatan, dan project. |
| Operasional | Kalender & Event | Mengelola event perusahaan. |
| Approval | Persetujuan Cuti | Meninjau pengajuan izin/cuti. |
| Laporan | Laporan Kerja, Rekap Absensi, Lap. Ketidakhadiran | Memantau kepatuhan dan rekap absensi. |
| Konfigurasi | Pengaturan Umum, Jadwal/Shift, Lokasi Rumah WFH, Kuota Cuti | Mengatur parameter operasional. |
| Sistem | Notifikasi, Backup Data, Audit Log, Bantuan, Tentang Aplikasi | Pemeliharaan dan informasi sistem. |

Sidebar dapat dibuka sebagai drawer pada layar kecil. Tombol notifikasi pada topbar
menampilkan notifikasi yang belum dibaca.

### Referensi screenshot web — R-SC-02 (Sidebar HRD)

Tempatkan screenshot tampilan sidebar HRD dan badge role di bagian ini.

- Route contoh: `/admin/dashboard`
- Sumber sidebar: [`shared-sidebar.component.html`](../frontend/src/app/features/shared/shared-sidebar/shared-sidebar.component.html)
- Sumber gaya/sidebar responsif: [`shared-sidebar.component.scss`](../frontend/src/app/features/shared/shared-sidebar/shared-sidebar.component.scss)
- Komponen wrapper admin: [`admin-sidebar.component.ts`](../frontend/src/app/features/admin/admin-sidebar/admin-sidebar.component.ts)

## 1.3 Dashboard HRD

Dashboard HRD menampilkan ringkasan yang membantu pemantauan operasional harian:

- Total Karyawan.
- Hadir Hari Ini.
- Belum Absen Hari Ini.
- Izin / Cuti Hari Ini.
- Magang Aktif.
- Laporan Kerja Pending.
- Belum Membuat Laporan Kerja.
- Grafik dan quick action untuk membuka modul terkait.

Langkah membuka dashboard:

1. Login menggunakan akun HRD.
2. Pilih **Dashboard** pada sidebar, atau buka `/admin/dashboard`.
3. Tunggu kartu ringkasan selesai dimuat.
4. Pilih quick action jika ingin langsung membuka data karyawan, operasional, atau laporan.

Angka pada dashboard mengikuti data dari backend dan dapat diperbarui otomatis. Jika data
belum tampil, periksa koneksi aplikasi dan status notifikasi error yang muncul.

### Referensi screenshot web — R-SC-03 (Dashboard HRD)

Tempatkan screenshot penuh dashboard HRD di bagian ini. Pastikan kartu ringkasan, judul
halaman, sidebar, dan minimal satu area grafik terlihat.

- Route yang ditampilkan: `/admin/dashboard`
- Template tampilan: [`admin-dashboard.component.html`](../frontend/src/app/features/admin/admin-dashboard/admin-dashboard.component.html)
- Logika pemuatan data: [`admin-dashboard.component.ts`](../frontend/src/app/features/admin/admin-dashboard/admin-dashboard.component.ts)
- Styling dashboard: [`admin-dashboard.component.scss`](../frontend/src/app/features/admin/admin-dashboard/admin-dashboard.component.scss)

# Bagian II — Manajemen data HRD

## 2.1 Kelola data karyawan

Halaman **Karyawan** digunakan HRD untuk mengelola identitas, role, divisi, jabatan, project,
status kepegawaian, dan kebutuhan lokasi rumah WFH.

### Membuka daftar karyawan

1. Klik **Karyawan** pada sidebar HRD.
2. Sistem membuka route `/admin/employees`.
3. Gunakan pencarian atau filter untuk menemukan data yang diperlukan.
4. Gunakan tombol lihat detail, edit, atau hapus pada baris karyawan.

### Menambah karyawan

1. Klik tombol **Tambah Karyawan**.
2. Isi identitas dasar, termasuk nama, NIK, email, dan data kontak yang diwajibkan.
3. Pilih role: **Karyawan**, **Magang**, **Manajer**, atau **HRD**.
4. Pilih divisi dan jabatan yang sesuai.
5. Isi project jika karyawan perlu dikaitkan dengan project aktif.
6. Jika role adalah Magang, isi manager pembimbing dan periode magang.
7. Isi link Google Maps rumah bila akun memerlukan validasi WFH.
8. Periksa kembali data, lalu klik **Simpan**.

Kode karyawan dapat dibuat otomatis berdasarkan tahun masuk. Saat edit, HRD dapat memperbarui
data yang diizinkan oleh form. Data lokasi rumah dipakai untuk kebutuhan geofence WFH dan
harus diperlakukan sebagai data sensitif.

### Edit, detail, hapus, dan ekspor

| Aksi | Keterangan |
| --- | --- |
| Lihat detail | Membuka ringkasan profil dan atribut karyawan. |
| Edit | Mengubah data karyawan melalui form. |
| Hapus | Menghapus data setelah konfirmasi. Pastikan dampak terhadap histori dan audit dipahami. |
| Ekspor | Mengunduh data yang sedang ditampilkan dalam CSV, XLSX, JSON, PDF, atau mencetak laporan. |

### Referensi screenshot web — R-SC-04 (Daftar Karyawan)

Tempatkan screenshot daftar karyawan yang menampilkan judul halaman, filter, tombol tambah,
baris data, dan kontrol aksi.

- Route yang ditampilkan: `/admin/employees`
- Template daftar dan modal: [`employee-list.component.html`](../frontend/src/app/features/admin/employee-list/employee-list.component.html)
- Logika form, filter, CRUD, dan ekspor: [`employee-list.component.ts`](../frontend/src/app/features/admin/employee-list/employee-list.component.ts)
- Validasi kolom CSV: [`employee-csv.schema.ts`](../frontend/src/app/features/admin/employee-list/employee-csv.schema.ts)
- Catatan screenshot: samarkan nama, NIK, email, foto, koordinat, dan link Maps pada data contoh.

### Referensi screenshot web — R-SC-05 (Form Tambah/Edit Karyawan)

Tempatkan screenshot modal form pada bagian ini. Ambil satu screenshot ketika role **Karyawan**
terpilih dan satu screenshot tambahan bila perlu untuk kondisi **Magang** yang menampilkan
manager pembimbing serta periode magang.

- Route yang ditampilkan: `/admin/employees`
- Elemen form: [`employee-list.component.html`](../frontend/src/app/features/admin/employee-list/employee-list.component.html)
- Perubahan field berdasarkan role: [`employee-list.component.ts`](../frontend/src/app/features/admin/employee-list/employee-list.component.ts)

## 2.2 Kelola organisasi, jabatan, dan project

Halaman **Organisasi & Jabatan** memiliki tiga tab:

1. **Divisi** — unit organisasi dan kode divisi.
2. **Jabatan** — posisi pekerjaan dan kode jabatan.
3. **Project** — project yang dapat dipilih pada data karyawan, beserta status aktif/nonaktif.

### Menambah atau mengubah divisi

1. Buka **Organisasi & Jabatan** pada sidebar.
2. Pastikan tab **Divisi** aktif.
3. Klik **+ Tambah Divisi**, atau klik ikon edit pada baris yang sudah ada.
4. Isi nama, kode, dan deskripsi.
5. Klik **Simpan**, lalu konfirmasi tindakan.

### Menambah atau mengubah jabatan

1. Pilih tab **Jabatan**.
2. Klik **+ Tambah Jabatan**, atau pilih ikon edit.
3. Isi nama jabatan, kode, dan deskripsi.
4. Klik **Simpan** dan periksa baris data yang diperbarui.

### Menambah atau mengubah project

1. Pilih tab **Project**.
2. Klik **+ Tambah Project** untuk membuat project baru.
3. Isi nama dan deskripsi project.
4. Saat mengubah project, tentukan apakah project masih aktif dan tersedia untuk karyawan.
5. Klik **Simpan**.

Data master yang sedang digunakan oleh karyawan atau transaksi terkait tidak boleh dihapus
secara sembarangan. Jika backend menolak penghapusan, simpan data sebagai nonaktif atau
ubah keterkaitannya sesuai kebijakan HRD.

### Referensi screenshot web — R-SC-06 (Organisasi & Jabatan)

Tempatkan screenshot tab **Divisi** pada bagian ini. Screenshot harus memperlihatkan tab,
judul daftar, tombol tambah, kolom kode/nama/deskripsi, dan aksi baris.

- Route yang ditampilkan: `/admin/organization`
- Template halaman dan modal: [`organization.component.html`](../frontend/src/app/features/admin/organization/organization.component.html)
- Logika tab, CRUD, dan pemanggilan API: [`organization.component.ts`](../frontend/src/app/features/admin/organization/organization.component.ts)
- Styling halaman: [`organization.component.scss`](../frontend/src/app/features/admin/organization/organization.component.scss)

### Referensi screenshot web — R-SC-07 (Form Master Data)

Tempatkan screenshot modal **Tambah Divisi**, **Tambah Jabatan**, atau **Tambah Project** di
bagian ini. Sebutkan nama tab yang sedang ditampilkan pada caption screenshot.

- Sumber modal divisi/jabatan/project: [`organization.component.html`](../frontend/src/app/features/admin/organization/organization.component.html)
- Sumber aksi simpan dan konfirmasi: [`organization.component.ts`](../frontend/src/app/features/admin/organization/organization.component.ts)

# Bagian III — Konfigurasi hak akses dan operasional role

## 3.1 Pengertian hak akses per role

Pada Absensi Golan, akses utama ditentukan oleh role akun dan divalidasi pada dua lapisan:

1. **Frontend** menampilkan menu yang sesuai dan mengarahkan akses yang tidak sesuai ke
   halaman 403.
2. **Backend** memeriksa JWT, role akun yang sedang aktif, dan scope data sebelum melayani
   endpoint.

Role yang tersedia saat ini adalah:

| Role pada sistem | Fokus akses |
| --- | --- |
| HRD | Seluruh organisasi, master data, approval, rekap, konfigurasi, operasional, dan audit. |
| Manajer | Dashboard dan data tim yang menjadi tanggung jawabnya, termasuk approval tim. |
| Karyawan | Absensi pribadi, riwayat, izin/cuti, laporan kerja, statistik, dan profil. |
| Magang | Absensi pribadi, riwayat, laporan kerja, statistik, izin, mentor, sertifikat, dan profil. |

Berbeda dari PDF contoh, aplikasi ini belum menyediakan halaman frontend untuk mengubah
checkbox permission per role. Karena itu, jangan menuliskan bahwa HRD dapat membuka menu
"Simpan Hak Akses [Nama Role]". Hak akses pada versi ini mengikuti role dan aturan endpoint
yang sudah ditetapkan aplikasi.

### Matriks akses halaman utama

| Modul | HRD | Manajer | Karyawan | Magang |
| --- | :---: | :---: | :---: | :---: |
| Dashboard sesuai role | Ya | Ya | Ya | Ya |
| Check-in / Check-out | Tidak pada route karyawan | Ya | Ya | Ya |
| Riwayat absensi pribadi | Tidak pada route karyawan | Ya | Ya | Ya |
| Pengajuan izin/cuti | Approval admin | Pengajuan dan approval tim | Pengajuan | Pengajuan |
| Laporan kerja | Kelola dan validasi | Review laporan tim | Isi laporan sendiri | Isi laporan sendiri |
| Kelola data karyawan | Ya | Tidak | Tidak | Tidak |
| Rekap organisasi | Ya | Scope tim | Tidak | Tidak |
| Operasional Magang & Tim | Ya | Operasional tim sendiri | Tidak | Tidak |
| Audit dan konfigurasi sistem | Ya | Tidak | Tidak | Tidak |

Tanda “tidak pada route karyawan” berarti HRD tetap memiliki laporan dan data administratif
yang relevan, tetapi tidak menggunakan halaman absensi pribadi milik role lain.

### Referensi screenshot web — R-SC-08 (Menu berdasarkan role)

Tempatkan dua screenshot berdampingan: sidebar HRD dan sidebar Manajer. Pastikan nama role
dan perbedaan menu terlihat, tetapi gunakan akun/data uji.

- Sumber navigasi seluruh role: [`shared-sidebar.component.html`](../frontend/src/app/features/shared/shared-sidebar/shared-sidebar.component.html)
- Sumber label role dan state menu: [`shared-sidebar.component.ts`](../frontend/src/app/features/shared/shared-sidebar/shared-sidebar.component.ts)
- Definisi route dan role yang diizinkan: [`app.routes.ts`](../frontend/src/app/app.routes.ts)

## 3.2 Hak akses HRD/Admin

HRD adalah role dengan scope organisasi penuh. Setelah login, HRD dapat mengakses:

- Dashboard HRD.
- Data karyawan serta organisasi, jabatan, dan project.
- Kalender dan event perusahaan.
- Persetujuan izin/cuti tingkat HRD.
- Laporan kerja, rekap absensi, dan laporan ketidakhadiran.
- Jadwal/shift, lokasi rumah WFH, kuota cuti, dan tipe kerja.
- Notifikasi, backup data, audit log, bantuan, dan tentang aplikasi.
- Operasional peserta magang serta monitoring tim/manajer.

### Cara memeriksa akses HRD

1. Login menggunakan akun dengan role **HRD**.
2. Pastikan badge sidebar menampilkan **HRD / Admin**.
3. Buka menu yang diperlukan dari sidebar.
4. Jika membuka URL langsung, sistem tetap memeriksa role sebelum halaman ditampilkan.
5. Jika endpoint mengembalikan error, baca pesan pada halaman dan periksa konfigurasi role
   akun di data karyawan.

### Referensi screenshot web — R-SC-09 (Akses HRD)

Tempatkan screenshot halaman **Operasional Magang & Tim** yang dibuka menggunakan akun HRD.
Screenshot sebaiknya menampilkan judul halaman, dua tab operasional, dan kartu ringkasan.

- Route yang ditampilkan: `/admin/role-operations`
- Template halaman: [`role-operations.component.html`](../frontend/src/app/features/admin/role-operations/role-operations.component.html)
- Logika tab dan data: [`role-operations.component.ts`](../frontend/src/app/features/admin/role-operations/role-operations.component.ts)
- Endpoint backend khusus HRD: [`admin_role_operations.go`](../backend/internal/handlers/admin_role_operations.go)

## 3.3 Hak akses Manajer

Manajer berfokus pada data tim. Manajer dapat:

- Melihat dashboard manajer.
- Melihat absensi anggota tim.
- Melihat laporan tim dan statistik tim.
- Meninjau serta memproses pengajuan izin/cuti anggota tim sesuai alur approval.
- Melakukan review laporan kerja peserta magang yang menjadi tanggung jawabnya.
- Menggunakan check-in/check-out, riwayat, statistik, notifikasi, dan profil pribadi.

Scope Manajer tidak sama dengan scope HRD. Data tim diperoleh dari hubungan manager/team di
backend; Manajer tidak boleh menganggap dapat melihat seluruh organisasi hanya karena dapat
membuka halaman dashboard.

### Referensi screenshot web — R-SC-10 (Dashboard Manajer)

Tempatkan screenshot dashboard Manajer yang memperlihatkan kartu anggota tim, kehadiran hari
ini, belum absen, dan izin pending.

- Route yang ditampilkan: `/manager/dashboard`
- Template dashboard: [`manager-dashboard.component.html`](../frontend/src/app/features/manager/manager-dashboard/manager-dashboard.component.html)
- Logika dashboard: [`manager-dashboard.component.ts`](../frontend/src/app/features/manager/manager-dashboard/manager-dashboard.component.ts)
- Aturan akses dan scope backend: [`manager.go`](../backend/internal/handlers/manager.go)

## 3.4 Hak akses Karyawan

Karyawan hanya menggunakan fitur pribadi dan alur kerja yang diberikan kepadanya:

- Dashboard karyawan.
- Check-in/check-out dengan validasi yang diwajibkan sistem.
- Riwayat absensi pribadi.
- Laporan kerja pribadi.
- Statistik kehadiran pribadi.
- Pengajuan izin/cuti dan riwayat pengajuannya.
- Informasi manajer, notifikasi, dan profil.

Karyawan tidak dapat membuka halaman administrasi, melihat rekap seluruh organisasi, atau
memproses approval milik pengguna lain. Memasukkan URL admin secara manual tidak memberikan
akses tambahan.

## 3.5 Hak akses Magang

Magang memiliki alur pribadi yang mirip dengan Karyawan, dengan tambahan fitur khusus:

- Dashboard periode magang.
- Laporan kerja harian.
- Statistik kehadiran magang.
- Informasi mentor/manajer.
- Sertifikat magang.
- Check-in/check-out, riwayat, izin, notifikasi, dan profil.

HRD memantau laporan kerja dan dokumen magang melalui **Manajemen Laporan Kerja** serta
**Operasional Magang**. Review laporan kerja peserta dilakukan oleh Manajer pembimbing sesuai
scope tim, sedangkan HRD memproses validasi administratif pada halaman Manajemen Laporan Kerja.
Dokumen sertifikat dapat diunggah atau dihapus setelah periode magang berakhir.

### Referensi screenshot web — R-SC-11 (Operasional Magang)

Tempatkan screenshot halaman **Manajemen Laporan Kerja** dan tab **Operasional Magang** yang
menampilkan kartu Total Magang, Magang Aktif, Laporan Kerja Pending, serta daftar Sertifikat.

- Route yang ditampilkan: `/admin/role-operations`
- Bagian template operasional: [`role-operations.component.html`](../frontend/src/app/features/admin/role-operations/role-operations.component.html)
- Aturan endpoint magang HRD: [`admin_role_operations.go`](../backend/internal/handlers/admin_role_operations.go)

## 3.6 Alur approval berdasarkan role

Approval izin/cuti tidak diberikan kepada semua role dengan cara yang sama:

1. Karyawan, Magang, dan Manajer mengirim pengajuan dari menu **Pengajuan Izin**.
2. Pengajuan diarahkan ke Manajer atau HRD sesuai pemohon dan konfigurasi approval.
3. Manajer memproses pengajuan anggota timnya.
4. HRD memproses pengajuan yang menjadi kewenangan HRD dan dapat melihat approval organisasi.
5. Sistem menyimpan status, alasan penolakan, catatan admin/manajer, dan notifikasi perubahan.

### Referensi screenshot web — R-SC-12 (Persetujuan Izin/Cuti)

Tempatkan screenshot daftar approval HRD dengan filter jenis, status, tabel karyawan, status,
catatan, lampiran, dan aksi keputusan. Jangan menampilkan lampiran atau data pribadi asli.

- Route yang ditampilkan: `/admin/leaves`
- Template halaman: [`leave-approval.component.html`](../frontend/src/app/features/admin/leave-approval/leave-approval.component.html)
- Logika status dan keputusan: [`leave-approval.component.ts`](../frontend/src/app/features/admin/leave-approval/leave-approval.component.ts)
- Route Manajer untuk scope tim: `/manager/leaves`
- Template approval Manajer: [`manager-leave-approval.component.html`](../frontend/src/app/features/manager/leave-approval/manager-leave-approval.component.html)

## 3.7 Verifikasi akses ditolak

Gunakan akun uji dengan role berbeda untuk memastikan pembatasan bekerja:

1. Login sebagai Karyawan.
2. Buka `/admin/dashboard` secara langsung.
3. Sistem harus mengarahkan ke `/403` atau menolak endpoint terkait.
4. Login sebagai Manajer dan buka data anggota tim.
5. Pastikan data di luar scope tim tidak ikut tampil.
6. Catat hasil pengujian pada checklist UAT jika ada perbedaan.

### Referensi screenshot web — R-SC-13 (Akses Ditolak)

Tempatkan screenshot halaman 403 setelah percobaan membuka route HRD dengan akun non-HRD.

- Route yang ditampilkan: `/403`
- Komponen halaman: [`forbidden.component.ts`](../frontend/src/app/features/errors/forbidden/forbidden.component.ts)
- Guard frontend: [`auth.guard.ts`](../frontend/src/app/core/guards/auth.guard.ts)
- Validasi role backend: [`auth.go`](../backend/internal/middleware/auth.go)

# Bagian IV — Konfigurasi absensi

Bagian ini menggantikan bagian “Konfigurasi Akuntansi” pada PDF contoh. Di Absensi Golan,
HRD tidak mengelola kode akun, tetapi mengatur parameter yang menentukan bagaimana absensi
dicatat: tipe kerja, jadwal, jam kerja, lokasi geofence, hari libur, dan lokasi rumah WFH.

## 4.1 Manajemen tipe kerja/status kehadiran

Halaman **Manajemen Tipe Kerja** mengelola pilihan tipe kerja yang muncul pada alur absensi.
Tipe kerja dapat digunakan untuk membedakan pekerjaan dari kantor, rumah, atau kebutuhan
operasional lain seperti dinas luar.

Elemen yang tersedia:

| Elemen | Keterangan |
| --- | --- |
| Nama Tipe Kerja | Nama yang ditampilkan pada pilihan absensi, misalnya WFO, WFH, atau Dinas Luar. |
| Validasi koordinat rumah | Jika aktif, sistem menandai tipe tersebut sebagai tipe berbasis home base. |
| Edit | Mengubah nama dan aturan home base. |
| Hapus | Menghapus tipe kerja setelah konfirmasi dan validasi backend. |

### Menambah tipe kerja

1. Buka menu **Manajemen Tipe Kerja** pada sidebar HRD.
2. Klik **+ Tambah Tipe Kerja**.
3. Isi nama tipe kerja.
4. Aktifkan **Validasi koordinat rumah** jika tipe tersebut memakai geofence rumah.
5. Klik **Simpan** dan konfirmasi perubahan.
6. Periksa kembali tipe kerja pada daftar.

### Mengubah atau menghapus tipe kerja

1. Klik ikon edit pada baris tipe kerja yang dipilih untuk mengubah data.
2. Klik ikon hapus untuk menghapus data, lalu baca konfirmasi yang ditampilkan.
3. Jangan menghapus tipe kerja yang masih dibutuhkan oleh konfigurasi atau histori absensi.
4. Jika backend menolak penghapusan, pertahankan data dan gunakan tipe kerja lain untuk
   absensi baru.

### Referensi screenshot web — R-SC-14 (Daftar Tipe Kerja)

Tempatkan screenshot daftar tipe kerja yang menampilkan judul halaman, tombol tambah, kolom
nama, status validasi rumah, dan tombol aksi.

- Route yang ditampilkan: `/admin/worktypes`
- Template halaman dan modal: [`worktype-list.component.html`](../frontend/src/app/features/admin/worktype-list/worktype-list.component.html)
- Logika CRUD: [`worktype-list.component.ts`](../frontend/src/app/features/admin/worktype-list/worktype-list.component.ts)
- Endpoint backend: [`worktype.go`](../backend/internal/handlers/worktype.go)

## 4.2 Jadwal kerja dan shift

Halaman **Manajemen Jadwal Kerja / Shift** digunakan untuk mengatur jadwal reguler dan shift
khusus karyawan. Jadwal khusus dapat mengalahkan jadwal global pada tanggal atau karyawan
tertentu.

### Jadwal reguler

Jadwal reguler digunakan oleh karyawan yang tidak memiliki jadwal khusus. Parameter yang
dapat diatur per hari kerja meliputi:

- Hari aktif atau nonaktif.
- Jam mulai kerja.
- Jam selesai kerja.
- Toleransi keterlambatan dalam menit.

Pengaturan jadwal reguler tersedia di menu **Pengaturan Umum**. Karyawan yang memiliki shift
khusus akan mengikuti konfigurasi shift khusus sesuai tanggal berlakunya.

### Menambah shift khusus

1. Buka menu **Jadwal / Shift**.
2. Pada form shift, pilih cakupan global atau karyawan tertentu.
3. Isi nama shift, tanggal berlaku, hari kerja, jam mulai, jam selesai, dan toleransi.
4. Klik **Simpan shift**.
5. Periksa daftar shift dan pastikan karyawan yang dituju muncul pada kolom yang benar.

### Mengubah penempatan shift karyawan

1. Pilih karyawan pada bagian **Atur shift kerja karyawan**.
2. Pilih shift yang tersedia.
3. Klik **Simpan shift karyawan**.
4. Periksa ulang profil atau daftar jadwal karyawan tersebut.

### Referensi screenshot web — R-SC-15 (Jadwal dan Shift)

Tempatkan screenshot halaman jadwal yang menampilkan form shift, pilihan karyawan, filter
tanggal, dan daftar shift. Hindari menampilkan nama/NIK asli pada screenshot.

- Route yang ditampilkan: `/admin/schedules`
- Template halaman: [`admin-management.component.html`](../frontend/src/app/features/admin/admin-management/admin-management.component.html)
- Logika jadwal dan shift: [`admin-management.component.ts`](../frontend/src/app/features/admin/admin-management/admin-management.component.ts)
- Endpoint konfigurasi: [`settings.go`](../backend/internal/handlers/settings.go)

### Referensi screenshot web — R-SC-16 (Jadwal Reguler)

Tempatkan screenshot panel **Jadwal Reguler** dari Pengaturan Umum yang menampilkan hari,
jam masuk, jam pulang, dan toleransi keterlambatan.

- Route yang ditampilkan: `/admin/settings`
- Template pengaturan umum: [`admin-settings.component.html`](../frontend/src/app/features/admin/admin-settings/admin-settings.component.html)
- Logika pengaturan: [`admin-settings.component.ts`](../frontend/src/app/features/admin/admin-settings/admin-settings.component.ts)

## 4.3 Lokasi kantor dan geofence WFO

Lokasi kantor pusat digunakan sebagai acuan validasi absensi **WFO**. Pengaturan ini berada
di **Pengaturan Umum** dan mencakup koordinat, radius toleransi, serta link Google Maps bila
tersedia.

Langkah umum:

1. Buka **Pengaturan Umum**.
2. Cari panel **Lokasi Kantor Pusat (Geofence WFO)**.
3. Masukkan atau perbarui link Google Maps lokasi kantor.
4. Periksa koordinat yang berhasil dibaca sistem.
5. Isi radius toleransi sesuai kebijakan perusahaan.
6. Klik tombol simpan dan pastikan notifikasi berhasil muncul.

Perubahan lokasi kantor memengaruhi validasi absensi berikutnya. Catat perubahan melalui
prosedur operasional HRD dan jangan menggunakan koordinat perkiraan pada lingkungan produksi.

### Referensi screenshot web — R-SC-17 (Geofence Kantor)

Tempatkan screenshot panel lokasi kantor dengan data uji. Koordinat asli kantor dan token
API tidak boleh ditampilkan pada dokumen publik.

- Route yang ditampilkan: `/admin/settings`
- Template panel lokasi: [`admin-settings.component.html`](../frontend/src/app/features/admin/admin-settings/admin-settings.component.html)
- Logika penyimpanan lokasi: [`admin-settings.component.ts`](../frontend/src/app/features/admin/admin-settings/admin-settings.component.ts)
- Resolusi link Maps: [`google_maps.go`](../backend/internal/utils/google_maps.go)

## 4.4 Lokasi rumah karyawan untuk WFH

Halaman **Lokasi Rumah Karyawan (Geofence WFH)** digunakan HRD untuk mengelola lokasi rumah
yang menjadi acuan tipe kerja berbasis home base. Halaman ini memiliki dua area:

- **Lokasi WFH Aktif** — daftar karyawan dengan lokasi rumah yang tersimpan.
- **Pengajuan Perubahan** — permintaan perubahan lokasi yang perlu ditinjau HRD.

### Mengubah lokasi rumah aktif

1. Buka menu **Lokasi Rumah WFH**.
2. Pilih karyawan pada tab **Lokasi WFH Aktif**.
3. Klik ikon edit/atur lokasi rumah.
4. Tempel link Google Maps rumah karyawan.
5. Pastikan latitude dan longitude terisi otomatis.
6. Isi radius meter dan alamat rumah jika diperlukan.
7. Klik **Simpan Lokasi**.

### Memproses pengajuan perubahan lokasi

1. Buka tab **Pengajuan Perubahan**.
2. Buka detail pengajuan untuk memeriksa lokasi lama, lokasi baru, radius, alasan, dan lampiran.
3. Klik **Setujui** jika data valid, atau **Tolak** dan isi alasan penolakan.
4. Pastikan status pengajuan berubah dan daftar lokasi aktif diperbarui.

Lokasi rumah, alamat, koordinat, dan lampiran termasuk data sensitif. Gunakan data dummy
ketika membuat screenshot atau menguji halaman.

### Referensi screenshot web — R-SC-18 (Lokasi Rumah WFH)

Tempatkan screenshot tab **Lokasi WFH Aktif** atau **Pengajuan Perubahan**. Untuk dokumen
yang dibagikan di luar tim HRD, samarkan nama, alamat, koordinat, link Maps, dan lampiran.

- Route yang ditampilkan: `/admin/home-locations`
- Template halaman dan modal: [`admin-management.component.html`](../frontend/src/app/features/admin/admin-management/admin-management.component.html)
- Logika lokasi dan approval: [`admin-management.component.ts`](../frontend/src/app/features/admin/admin-management/admin-management.component.ts)
- Endpoint lokasi rumah: [`admin_directory.go`](../backend/internal/handlers/admin_directory.go)
- Alur pengajuan perubahan: [`home_location_change.go`](../backend/internal/handlers/home_location_change.go)

## 4.5 Hari libur dan parameter umum

Selain jadwal, HRD dapat mengatur hari libur perusahaan dan parameter umum dari menu
**Pengaturan Umum**. Hari libur harus diperiksa sebelum mengubah jadwal atau melakukan
rekap absensi karena tanggal libur memengaruhi kewajiban absensi.

Langkah umum mengelola hari libur:

1. Buka **Pengaturan Umum**.
2. Cari bagian daftar hari libur.
3. Klik tambah atau edit sesuai kebutuhan.
4. Isi tanggal, nama hari libur, dan status yang diperlukan.
5. Klik **Simpan**.

### Referensi screenshot web — R-SC-19 (Pengaturan Umum)

Tempatkan screenshot Pengaturan Umum yang memperlihatkan judul panel, jadwal reguler,
parameter kebijakan, dan daftar hari libur secara proporsional.

- Route yang ditampilkan: `/admin/settings`
- Template halaman: [`admin-settings.component.html`](../frontend/src/app/features/admin/admin-settings/admin-settings.component.html)
- Logika konfigurasi: [`admin-settings.component.ts`](../frontend/src/app/features/admin/admin-settings/admin-settings.component.ts)
- Endpoint pengaturan: [`settings.go`](../backend/internal/handlers/settings.go)

# Bagian V — Konfigurasi kuota izin dan cuti

Bagian ini menggantikan bagian “Konfigurasi Pajak” pada PDF contoh. Di Absensi Golan, HRD
mengelola kuota izin/cuti per karyawan dan kebijakan global yang digunakan saat pengajuan.
Kuota bukan sekadar angka tampilan: backend memeriksa ketersediaan, mencatat hari yang
diproses, dan mengembalikan kuota ketika pengajuan yang sudah memakai kuota dibatalkan atau
ditolak.

## 5.1 Kelola kuota izin/cuti

Halaman **Kuota Cuti** digunakan untuk membuat, melihat, mengubah, dan menghapus kuota
karyawan berdasarkan tahun dan jenis kuota.

Field yang tersedia:

| Field | Keterangan |
| --- | --- |
| Karyawan | Karyawan yang menerima kuota. |
| Tahun kuota | Tahun berlaku, mengikuti tahun pada pengajuan dan rekap. |
| Jenis kuota | Pilihan yang tersedia: Cuti, Sakit, atau Lainnya. |
| Sisa kuota | Jumlah hari yang masih dapat digunakan; nilainya tidak boleh negatif. |

### Menambah atau mengubah kuota

1. Buka menu **Kuota Cuti** pada sidebar HRD.
2. Pilih karyawan.
3. Isi tahun kuota.
4. Pilih jenis kuota.
5. Isi jumlah **Sisa kuota** dalam hari.
6. Klik **Simpan Kuota** dan konfirmasi perubahan.
7. Periksa data pada tabel **Daftar Kuota**.

Untuk mengubah data yang sudah tersimpan, klik ikon edit pada baris kuota, ubah nilai yang
diperlukan, lalu simpan kembali. Ikon lihat menampilkan detail kuota, sedangkan ikon hapus
meminta konfirmasi sebelum data dihapus.

### Aturan pengisian

- Tahun harus merupakan tahun yang valid dan diterima oleh backend.
- Sisa kuota tidak boleh kurang dari nol.
- Pastikan satu karyawan memiliki kuota yang benar untuk setiap tahun dan jenis yang memang
  digunakan oleh kebijakan perusahaan.
- Perubahan kuota langsung dipakai ketika karyawan membuat pengajuan baru.
- Jangan menghapus kuota aktif ketika masih ada pengajuan yang sedang diproses tanpa
  memeriksa dampaknya terlebih dahulu.

### Referensi screenshot web — R-SC-20 (Daftar dan Form Kuota)

Tempatkan screenshot halaman **Kuota Cuti** yang memperlihatkan form Atur Kuota, tahun,
jenis kuota, sisa kuota, tabel data tersimpan, dan tombol aksi. Gunakan nama serta NIK dummy.

- Route yang ditampilkan: `/admin/leave-quotas`
- Template form dan tabel: [`admin-management.component.html`](../frontend/src/app/features/admin/admin-management/admin-management.component.html)
- Logika pemuatan dan penyimpanan: [`admin-management.component.ts`](../frontend/src/app/features/admin/admin-management/admin-management.component.ts)
- Endpoint kuota: [`admin_directory.go`](../backend/internal/handlers/admin_directory.go)

## 5.2 Kebijakan global cuti dan laporan kerja

Panel **Aturan Cuti & Laporan Kerja** pada menu **Pengaturan Umum** mengatur nilai yang
berlaku global untuk Karyawan, Magang, dan Manajer.

| Pengaturan | Fungsi |
| --- | --- |
| Minimum masa kerja untuk Cuti | Menentukan jumlah bulan masa kerja minimum sebelum cuti dapat diajukan/disetujui. |
| Default kuota Cuti | Nilai awal kuota cuti ketika karyawan baru dibuat dan belum memiliki kuota tahun berjalan. |
| Toleransi keterlambatan laporan | Batas waktu setelah checkout ketika laporan kerja masih dianggap dapat dikirim sesuai kebijakan. |

### Mengubah kebijakan global

1. Buka **Pengaturan Umum**.
2. Cari panel **Aturan Cuti & Laporan Kerja**.
3. Ubah nilai minimum masa kerja, default kuota, atau toleransi laporan.
4. Klik **Simpan Aturan**.
5. Periksa notifikasi berhasil dan gunakan data uji untuk memastikan perilaku pengajuan.

Perubahan default kuota tidak otomatis mengubah semua kuota yang sudah tersimpan. Untuk
menyesuaikan karyawan yang telah ada, gunakan halaman **Kuota Cuti** secara terarah.

### Referensi screenshot web — R-SC-21 (Aturan Global)

Tempatkan screenshot panel **Aturan Cuti & Laporan Kerja** dari Pengaturan Umum. Nilai yang
ditampilkan sebaiknya menggunakan data uji atau nilai yang memang boleh dibagikan.

- Route yang ditampilkan: `/admin/settings`
- Template panel: [`admin-settings.component.html`](../frontend/src/app/features/admin/admin-settings/admin-settings.component.html)
- Logika simpan aturan: [`admin-settings.component.ts`](../frontend/src/app/features/admin/admin-settings/admin-settings.component.ts)
- Endpoint pengaturan umum: [`settings.go`](../backend/internal/handlers/settings.go)

## 5.3 Alur penggunaan kuota pada pengajuan

Alur kuota terhubung dengan proses izin/cuti sebagai berikut:

1. Karyawan memilih jenis izin/cuti dan tanggal pengajuan.
2. Sistem menghitung hari kerja berdasarkan jadwal karyawan dan hari libur.
3. Untuk jenis yang menggunakan kuota, sistem memeriksa sisa kuota yang tersedia.
4. Jika kuota tidak cukup atau belum dibuat, pengajuan ditolak dengan pesan yang sesuai.
5. Kuota yang sedang diproses ditandai agar tidak digunakan melebihi saldo.
6. Ketika pengajuan ditolak atau dibatalkan sesuai status yang berlaku, kuota dapat
   dikembalikan oleh sistem.
7. Ketika pengajuan HRD disetujui, periode tersebut disinkronkan ke status absensi sebagai
   Cuti atau Izin sesuai jenis pengajuan.

Catatan kebijakan saat ini:

- Jenis Cuti dan Lainnya termasuk jenis yang dapat menggunakan kuota.
- Sakit tidak diperlakukan sebagai kuota cuti tahunan pada fungsi reservasi kuota.
- Peserta Magang tidak diperbolehkan mengajukan Cuti.
- Nilai minimum masa kerja untuk Cuti mengikuti pengaturan global.

### Referensi screenshot web — R-SC-22 (Pengajuan dan Status Kuota)

Tempatkan screenshot halaman pengajuan izin/cuti yang menampilkan jenis pengajuan, periode,
status, dan ringkasan kuota. Jangan menampilkan alasan pribadi, lampiran medis, nama, atau NIK
asli pada screenshot dokumen publik.

- Route pengguna: `/employee/leaves`
- Route approval HRD: `/admin/leaves`
- Template approval HRD: [`leave-approval.component.html`](../frontend/src/app/features/admin/leave-approval/leave-approval.component.html)
- Logika alur izin/cuti backend: [`leave.go`](../backend/internal/handlers/leave.go)

## 5.4 Verifikasi perubahan kuota

Setelah mengubah kuota, lakukan pemeriksaan terkontrol:

1. Catat nilai kuota sebelum perubahan.
2. Simpan perubahan melalui halaman HRD.
3. Login sebagai pengguna uji dan buka halaman Pengajuan Izin.
4. Pastikan ringkasan kuota mencerminkan data baru.
5. Buat pengajuan uji dengan tanggal dan jenis yang sesuai.
6. Periksa status pengajuan, sisa kuota, dan notifikasi.
7. Jika pengajuan ditolak atau dibatalkan, periksa bahwa pengembalian kuota mengikuti aturan.

Jangan melakukan pengujian pengurangan kuota menggunakan akun atau data produksi.

# Batas implementasi tahap saat ini

Tahap pertama selesai pada dokumentasi dan pemetaan penggunaan berikut:

- Login dan identifikasi role HRD.
- Sidebar dan navigasi HRD.
- Dashboard HRD.
- Kelola karyawan.
- Kelola divisi, jabatan, dan project.
- Konfigurasi tipe kerja, jadwal/shift, geofence kantor, lokasi WFH, dan parameter umum.
- Konfigurasi kuota izin/cuti dan kebijakan global pengajuan.
- Titik screenshot beserta referensi route dan source component.

Bagian III, IV, dan V yang ditambahkan dalam tahap ini mencakup pemetaan role, scope akses,
alur approval, operasional magang/tim, verifikasi halaman 403, konfigurasi absensi, serta
kuota izin/cuti.

Bagian yang sengaja belum dikerjakan secara mendalam pada tahap ini adalah approval cuti,
rekap/export absensi, laporan kerja, audit log, backup, dan modul pengguna
Karyawan/Magang/Manajer. Bagian tersebut akan menjadi tahap lanjutan setelah tahap ini
disetujui.

# Referensi screenshot

Gunakan akun uji dan data dummy ketika mengambil gambar. Format caption yang disarankan:

> **Gambar R-SC-03. Dashboard HRD**  
> Route: `/admin/dashboard` · Sumber: `admin-dashboard.component.html` dan
> `admin-dashboard.component.ts` · Diambil pada: `YYYY-MM-DD`.

Checklist setiap screenshot:

- URL/route dan role terlihat atau dicatat pada caption.
- Tidak ada password, JWT, NIK asli, alamat rumah, koordinat, atau foto pribadi yang terbuka.
- Resolusi cukup untuk membaca label tombol dan kolom.
- Screenshot diambil setelah loading selesai dan memakai data uji yang stabil.
- Caption diletakkan tepat setelah subbagian yang menjelaskan halaman tersebut.

