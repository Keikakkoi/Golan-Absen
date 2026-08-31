# Prompt Pengembangan Dashboard Role dan Lonceng Notifikasi

Kembangkan aplikasi absensi PT. Golan Digital Kreatif berbasis Angular untuk tampilan PC/desktop dengan tiga role pengguna: MAGANG, KARYAWAN, dan MANAJER.

## Tujuan

Tambahkan lonceng notifikasi di kanan atas halaman check-in/check-out dan dashboard MAGANG serta MANAJER. Desain dan perilakunya harus konsisten dengan lonceng notifikasi yang sudah ada pada dashboard admin.

## Ketentuan UI desktop

- Gunakan layout desktop dengan sidebar tetap di sebelah kiri dan konten utama di sebelah kanan.
- Letakkan lonceng di sisi kanan header halaman, sejajar dengan area identitas pengguna jika tersedia.
- Gunakan ikon lonceng SVG dari `assets/sidebar-icons.svg#bell`.
- Tampilkan badge merah berisi jumlah notifikasi yang belum dibaca. Sembunyikan badge jika jumlahnya nol.
- Saat lonceng diklik, tampilkan dropdown selebar kurang lebih 320px berisi judul `Notifikasi`, daftar notifikasi terbaru, waktu notifikasi, dan tautan `Lihat semua notifikasi`.
- Notifikasi yang belum dibaca memiliki latar berbeda dari notifikasi yang sudah dibaca.
- Dropdown memiliki batas tinggi dan scroll jika jumlah notifikasi banyak.
- Pertahankan warna, radius, border, shadow, tipografi, dan spacing yang mengikuti desain dashboard admin.
- Pastikan dropdown tidak tertutup oleh kartu check-in, peta, kamera, atau elemen dashboard lainnya.
- Tombol wajib memiliki `aria-label`, state `aria-expanded`, dan dapat digunakan dengan keyboard.

## Ketentuan fungsi

- Ambil data dari endpoint notifikasi yang sudah digunakan aplikasi: `GET /api/v1/notifications`.
- Tandai notifikasi sebagai sudah dibaca melalui endpoint yang sudah tersedia: `PUT /api/v1/notifications/{id}/read`.
- Gunakan token autentikasi aktif pengguna.
- Perbarui jumlah unread dan isi dropdown ketika menerima event realtime dari WebSocket `/ws/dashboard`.
- Jangan membuat implementasi notifikasi terpisah untuk setiap halaman. Gunakan komponen reusable, misalnya `NotificationBellComponent`.
- Tautan `Lihat semua notifikasi` untuk MAGANG, KARYAWAN, dan MANAJER diarahkan ke `/employee/notifications`.
- Pastikan lifecycle WebSocket dibersihkan ketika komponen dihancurkan.
- Jika endpoint gagal, halaman tetap dapat digunakan dan tampilkan state kosong yang aman.

## Halaman yang wajib dipasang

1. Dashboard MAGANG: tampilkan lonceng pada header dashboard, tanpa mengubah kartu statistik, kalender, event, atau chart.
2. Dashboard KARYAWAN: pertahankan lonceng yang sudah ada dan samakan perilakunya dengan komponen reusable.
3. Dashboard MANAJER: tampilkan lonceng pada header dashboard, tanpa mengubah data approval, statistik tim, kalender, event, atau chart.
4. Halaman Check-in/Check-out: tampilkan lonceng di kanan atas header, tetap terlihat jelas di atas area punch button, peta lokasi, dan kamera selfie.

## Validasi

- Pastikan seluruh komponen standalone mengimpor komponen lonceng yang digunakan.
- Pastikan tidak ada error Angular template atau TypeScript.
- Uji badge unread, buka/tutup dropdown, mark-as-read, tautan semua notifikasi, dan refresh realtime untuk ketiga role.
- Uji pada resolusi desktop minimal 1280px dan pastikan tidak mengganggu fungsi check-in, GPS, kamera, maupun navigasi sidebar.
