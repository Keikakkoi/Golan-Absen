# Prompt Perbaikan Dark Mode Detail Pengajuan Izin / Cuti Admin

~~~text
Perbaiki tampilan mode gelap pada modal "Detail Pengajuan Izin / Cuti" di
Dashboard Admin aplikasi Absensi Golan Digital Kreatif.

Konteks implementasi saat ini:
- Fitur berada pada modul approval admin.
- Template modal utama:
  `frontend/src/app/features/admin/leave-approval/leave-approval.component.html`
- Style modal utama:
  `frontend/src/app/features/admin/leave-approval/leave-approval.component.scss`
- Style global dan kompensasi zoom modal admin:
  `frontend/src/styles.scss`
- Komponen TypeScript:
  `frontend/src/app/features/admin/leave-approval/leave-approval.component.ts`
- Modal dibuka melalui `selectedRequest` dan menggunakan class utama
  `.leave-detail-modal`.

Gunakan screenshot yang diberikan user sebagai acuan visual. Screenshot
menunjukkan modal detail pengajuan pada dark mode dengan bagian berikut:
header modal, identitas pengaju, status approval, grid informasi pengajuan,
alasan, dokumen lampiran, scrollbar internal, dan tombol Tutup.

## Tujuan

Jadikan seluruh modal konsisten, mudah dibaca, dan nyaman digunakan pada dark
mode. Perbaiki kontras elemen yang masih memakai warna light/default, terutama
background putih, teks gelap, border pucat, badge, kartu lampiran, tombol, dan
scrollbar.

Light mode yang sudah ada harus tetap berfungsi dan tidak berubah secara visual
di luar kebutuhan selector yang memang ditujukan untuk dark mode.

## Aturan implementasi

1. Audit terlebih dahulu seluruh style `.leave-detail-modal` dan element
   turunannya. Cari hard-coded color seperti `#fff`, `#ffffff`, `#0f172a`,
   `#f8fafc`, `#e2e8f0`, dan warna light lain yang menyebabkan kontras buruk
   ketika dark mode aktif.
2. Identifikasi selector/class dark mode yang benar-benar digunakan aplikasi
   (misalnya `.dark-mode`, `.dark-theme`, `.admin-theme`, class pada `body`,
   atau CSS variable yang sudah tersedia). Gunakan mekanisme dark mode yang
   sudah ada; jangan membuat toggle atau sistem tema baru.
3. Tambahkan override dark mode yang scoped hanya ke modal approval ini,
   misalnya dengan pola selector:
   `.dark-mode .leave-detail-modal` atau selector aktual yang ditemukan pada
   repository. Jangan membuat override global yang merusak modal atau halaman
   lain.
4. Bila repository sudah memiliki design token/CSS variable warna, gunakan
   variable tersebut. Jika belum ada token yang sesuai, buat variable lokal
   atau warna fallback yang jelas di scope `.leave-detail-modal`.
5. Pertahankan struktur HTML, binding Angular, data, status label, aksi
   approval, URL lampiran, dan perilaku modal kecuali perubahan markup kecil
   memang diperlukan untuk aksesibilitas atau styling.
6. Jangan menghapus scrollbar internal. Pastikan hanya body modal yang scroll,
   header dan footer tetap stabil, dan isi tidak terpotong pada layar pendek.
7. Pertahankan kompensasi zoom yang sudah ada di `styles.scss`. Jangan
   mengubah nilai skala desktop besar tanpa alasan yang dapat diverifikasi.

## Target visual dark mode

Sesuaikan tampilan dengan prinsip berikut:

- Overlay tetap cukup gelap untuk memisahkan modal dari halaman, tetapi tidak
  membuat konten modal tampak buram.
- Background modal menggunakan warna surface dark yang solid dan konsisten.
- Header, body, dan footer modal memiliki pemisahan visual yang jelas melalui
  border atau surface layer, bukan melalui warna putih.
- Judul "Detail Pengajuan Izin / Cuti" menggunakan teks utama berkontras
  tinggi.
- Ref ID, label field, teks metadata, dan teks bantuan menggunakan warna
  sekunder yang tetap terbaca.
- Tombol close memiliki background, icon, hover, focus, dan active state yang
  cocok untuk dark mode.
- Kartu identitas pengaju memakai surface dark sekunder; foto/avatar, nama,
  NIK, jabatan/divisi, dan status tidak boleh tenggelam atau terlalu redup.
- Badge jenis pengajuan seperti Sakit, Cuti, dan Lainnya tetap memiliki
  pembeda warna yang jelas, tetapi tidak menyilaukan pada dark mode.
- Badge status Menunggu Persetujuan Admin, Approved, Rejected, dan status lain
  mempertahankan arti warna, border, dan dot status dengan kontras yang baik.
- Kartu Total Durasi, Tanggal Mulai, dan Tanggal Selesai menggunakan surface
  dark sekunder yang sama atau harmonis.
- Reason box, rejection reason, notes manager, dan notes admin memakai
  background dark yang berbeda secukupnya dari surface induknya. Teks panjang
  harus wrap dan tidak menyebabkan horizontal overflow.
- Kartu lampiran tidak boleh tetap menjadi blok putih terang seperti pada
  tampilan light mode. Gunakan surface dark/aksen yang konsisten, teks utama
  terang, teks sekunder yang terbaca, icon attachment yang jelas, serta tombol
  "Buka File" dengan hover/focus state yang terlihat.
- Secara khusus, komponen/kartu yang menampilkan teks **"Dokumen Pendukung /
  Surat Keterangan"** tidak boleh memiliki background putih ketika dark mode
  aktif. Temukan class atau selector aktual komponen tersebut di template dan
  ubah background-nya menjadi hitam atau dark surface yang sangat gelap,
  misalnya `#0f172a` atau token dark equivalent yang sudah digunakan aplikasi.
  Pastikan teks judul tetap menggunakan warna terang, teks bantuan tetap
  terbaca, dan perubahan hanya berlaku pada dark mode.
- Jika kartu tersebut memiliki background light yang berasal dari selector
  umum, utility class, CSS variable, atau style inline, override sumber warna
  tersebut secara scoped di bawah selector dark mode modal. Jangan mengubah
  warna kartu lampiran pada light mode.
- Empty state lampiran juga harus memiliki background, border, icon, dan teks
  yang sesuai dark mode.
- Preview gambar lampiran harus tetap memiliki batas yang terlihat dan tidak
  merusak ukuran modal.
- Scrollbar internal harus terlihat secukupnya pada dark mode, dengan track dan
  thumb yang tidak menyatu dengan background.
- Footer dan tombol "Tutup" harus tetap jelas, memiliki focus ring, dan tidak
  hilang saat body modal digulir.

## Responsivitas dan aksesibilitas

- Desktop mengikuti proporsi screenshot dan tetap menghormati max-height modal.
- Pada lebar tablet/mobile, header tidak overflow, judul dapat wrap, status
  dapat turun ke baris berikutnya, dan grid detail berubah menjadi satu kolom
  bila diperlukan.
- Kartu lampiran dan tombol "Buka File" tidak keluar dari lebar modal.
- Jangan mengandalkan warna saja untuk menyampaikan status; pertahankan label
  teks dan dot/status indicator yang sudah ada.
- Pastikan semua tombol memiliki focus-visible state yang jelas.
- Pertahankan `aria-label` pada tombol close dan tambahkan label yang sesuai
  jika ada element interaktif baru.
- Pastikan kontras teks dan kontrol memenuhi minimal WCAG AA sejauh dapat
  diterapkan pada design system aplikasi.
- Hormati `prefers-reduced-motion` bila modal memiliki animation dan jangan
  menambahkan animasi dekoratif yang tidak perlu.

## Batasan penting

- Jangan mengubah warna atau layout seluruh Dashboard Admin.
- Jangan mengubah alur approval, endpoint, hak akses, status, atau data
  pengajuan.
- Jangan mengganti komponen modal dengan library baru.
- Jangan menghapus fitur preview atau tombol pembukaan lampiran.
- Jangan menambahkan inline style baru jika style component/global yang
  terorganisir dapat digunakan.
- Jangan menggunakan `!important` kecuali diperlukan untuk mengalahkan style
  zoom/global yang memang sudah ada; setiap penggunaan harus scoped dan diberi
  komentar singkat.
- Hindari duplikasi selector dark mode yang bertabrakan. Gabungkan dengan
  aturan dark mode yang sudah ada bila memungkinkan.

## Acceptance criteria

1. Saat admin memakai dark mode dan membuka detail pengajuan, tidak ada panel
   putih yang tidak disengaja pada modal, termasuk header, kartu profil, grid,
   reason box, notes, lampiran, empty state, footer, dan scrollbar.
2. Semua teks utama, teks sekunder, label, badge, status, icon, border, dan
   tombol dapat dibaca dengan jelas.
3. Kartu yang memuat teks "Dokumen Pendukung / Surat Keterangan" tidak lagi
   berwarna putih pada dark mode; background-nya menjadi hitam/dark surface,
   sedangkan judul, teks bantuan, ikon, dan tombol "Buka File" tetap terlihat
   jelas dan konsisten tanpa kehilangan affordance untuk membuka file.
4. Status Menunggu Persetujuan Admin, Approved, dan Rejected tetap mudah
   dibedakan dan label status tetap benar.
5. Modal dapat discroll secara internal pada konten panjang; header/footer
   tidak terpotong dan tidak terjadi horizontal overflow.
6. Tampilan light mode tidak mengalami regresi.
7. Tampilan desktop, tablet, dan mobile tetap rapi.
8. Keyboard focus pada close, Buka File, tombol approval, dan Tutup terlihat
   jelas.
9. Tidak ada error Angular/TypeScript, warning template baru, atau error
   console ketika modal dibuka, ditutup, dan lampiran dibuka.

## Pengujian wajib

1. Login sebagai Admin/HRD, aktifkan dark mode, buka halaman approval izin,
   lalu buka detail pengajuan dengan status pending.
2. Periksa modal berisi foto pengaju, NIK, jabatan, status, jenis Sakit/Cuti,
   durasi, tanggal, alasan, lampiran, dan tombol Tutup.
3. Uji pengajuan tanpa lampiran, dengan lampiran gambar, dan dengan lampiran
   dokumen non-gambar.
4. Uji status pending, approved, dan rejected termasuk rejection reason serta
   catatan approval bila tersedia.
5. Isi atau tampilkan catatan panjang dan pastikan wrapping, scrollbar, serta
   footer tetap benar.
6. Uji light mode setelah perubahan dan bandingkan bahwa layout serta warna
   light mode tidak rusak.
7. Uji viewport desktop dan mobile, termasuk layar dengan tinggi pendek.
8. Navigasikan modal menggunakan keyboard dan pastikan focus state terlihat.
9. Jalankan lint, unit/component test yang relevan, dan build frontend.

Setelah selesai, tampilkan ringkasan file yang diubah, selector dark mode yang
digunakan, alasan pemilihan warna/surface, serta hasil pengujian.
~~~
