Saya ingin meningkatkan SEO website aplikasi ini agar ketika orang mencari nama perusahaan atau nama website di Google, website dapat muncul di hasil pencarian, idealnya di posisi pertama.

Konteks proyek:

- Nama perusahaan: PT. Golan Digital Kreatif
- Nama website sementara:
  1. Absensi Golan Digital Kreatif
  2. Absensi Golan
- Nama website belum final, jadi gunakan konfigurasi/konstanta agar mudah diganti nanti.
- Domain belum dibeli.
- Website belum di-hosting dan saat ini masih dikembangkan secara lokal.
- Kemungkinan frontend menggunakan Angular. Silakan periksa struktur proyek terlebih dahulu sebelum melakukan perubahan.
- Aplikasi ini adalah sistem absensi, sehingga halaman dashboard, login, data karyawan, dan data internal tidak boleh diindeks Google.

Tujuan utama:

1. Membuat halaman publik website yang SEO-friendly.
2. Membuat Google memahami bahwa website ini berkaitan dengan PT. Golan Digital Kreatif.
3. Mengoptimalkan website agar bisa muncul ketika pengguna mencari:
   - PT. Golan Digital Kreatif
   - Golan Digital Kreatif
   - Absensi Golan
   - Absensi Golan Digital Kreatif
   - Sistem Absensi Golan
   - Aplikasi Absensi PT. Golan Digital Kreatif
4. Website harus siap dihubungkan dengan domain resmi setelah domain dibeli.
5. Jangan menjanjikan posisi nomor satu karena ranking Google tidak dapat dijamin, tetapi lakukan seluruh optimasi teknis dan konten yang diperlukan.

Tugas yang harus dilakukan:

A. Audit proyek terlebih dahulu

Periksa:

- Framework dan versi yang digunakan.
- Struktur routing.
- Halaman publik dan halaman internal.
- Sistem autentikasi.
- Struktur build dan deployment.
- Apakah sudah menggunakan Angular SSR, prerendering, atau hanya SPA.
- File index.html, app component, routing, konfigurasi environment, dan konfigurasi web server.
- Library UI dan struktur styling yang sudah ada.

Sebelum mengubah file, jelaskan secara singkat file apa saja yang akan diubah dan alasannya.

B. Buat halaman publik SEO-friendly

Jika belum tersedia, buat landing page publik untuk perusahaan dengan route:

/ atau /home

Isi minimal:

- Nama perusahaan: PT. Golan Digital Kreatif
- Nama produk: Absensi Golan Digital Kreatif
- Penjelasan bahwa aplikasi merupakan sistem absensi digital.
- Keunggulan aplikasi.
- Fitur utama.
- Informasi perusahaan.
- Call-to-action menuju halaman login.
- Kontak atau informasi bisnis jika tersedia.
- Tampilan profesional, responsif, cepat, dan sesuai desain aplikasi yang sudah ada.

Jangan menampilkan data absensi, data karyawan, atau informasi internal pada halaman publik.

Gunakan Bahasa Indonesia yang natural dan tidak melakukan keyword stuffing.

C. Optimasi title dan meta description

Buat title halaman yang jelas dan mudah diganti, misalnya:

Absensi Golan Digital Kreatif | Sistem Absensi Digital PT. Golan Digital Kreatif

Meta description:

Absensi Golan Digital Kreatif adalah sistem absensi digital untuk membantu PT. Golan Digital Kreatif mengelola kehadiran karyawan secara mudah, cepat, dan terintegrasi.

Pastikan:

- Setiap halaman memiliki title unik.
- Setiap halaman publik memiliki meta description.
- Meta description memiliki panjang yang wajar.
- Tidak ada title duplikat.
- Tidak ada meta description duplikat.
- Gunakan canonical URL.
- Tambahkan meta robots yang sesuai.
- Halaman internal yang membutuhkan login menggunakan:
  noindex, nofollow
- Halaman publik menggunakan:
  index, follow

D. Tambahkan Open Graph dan social sharing metadata

Tambahkan metadata:

- og:title
- og:description
- og:type
- og:url
- og:image
- og:site_name
- twitter:card
- twitter:title
- twitter:description
- twitter:image

Siapkan gambar social sharing dengan ukuran ideal 1200x630 piksel. Jika belum ada aset final, buat struktur konfigurasi agar gambar dapat diganti setelah logo dan branding final tersedia.

E. Tambahkan structured data/schema.org

Tambahkan JSON-LD yang sesuai, minimal:

1. Organization

- Nama: PT. Golan Digital Kreatif
- URL website menggunakan environment variable
- Logo
- Deskripsi
- Kontak jika tersedia

2. WebSite

- Nama website yang dapat dikonfigurasi
- URL website

3. SoftwareApplication jika sesuai

- Nama aplikasi: Absensi Golan Digital Kreatif
- Kategori: BusinessApplication
- Deskripsi aplikasi
- Operating system: Web

Jangan memasukkan informasi yang tidak benar atau mengarang alamat, nomor telepon, email, rating, review, harga, maupun data perusahaan.

F. Buat sitemap.xml

Buat sitemap.xml yang hanya berisi halaman publik, misalnya:

- /
- /home
- /tentang
- /kontak
- halaman publik lain jika memang tersedia

Jangan masukkan:

- /login
- /dashboard
- /admin
- /pegawai
- /absensi
- route internal lainnya

Sitemap harus menggunakan domain dari environment variable agar mudah diganti setelah domain resmi tersedia.

G. Buat robots.txt

Buat robots.txt yang:

- Mengizinkan crawler mengakses halaman publik.
- Memblokir route internal dan route autentikasi.
- Menyertakan lokasi sitemap.xml.
- Tidak memblokir asset penting seperti CSS, JavaScript, dan gambar.

Contoh struktur:

User-agent: \*
Allow: /
Disallow: /login
Disallow: /dashboard
Disallow: /admin
Disallow: /pegawai
Disallow: /absensi

Sitemap: https://DOMAIN-RESMI/sitemap.xml

Gunakan placeholder atau environment variable untuk DOMAIN-RESMI.

H. Optimasi routing dan Angular SEO

Jika proyek menggunakan Angular SPA:

- Pastikan route publik dapat dirender dengan benar.
- Evaluasi penggunaan Angular SSR atau prerendering.
- Jika memungkinkan, implementasikan SSR/prerendering untuk halaman publik.
- Jangan merusak proses autentikasi dan route internal.
- Pastikan halaman publik memiliki HTML yang dapat dibaca crawler.
- Gunakan Angular Meta dan Title service jika sesuai dengan versi Angular.
- Pastikan metadata berubah sesuai route.
- Tambahkan fallback routing pada server agar URL publik tidak menghasilkan 404 ketika diakses langsung.

I. Optimasi konten SEO

Buat konten yang relevan dengan keyword berikut secara natural:

Keyword utama:

- PT. Golan Digital Kreatif
- Absensi Golan Digital Kreatif
- Absensi Golan

Keyword pendukung:

- sistem absensi digital
- aplikasi absensi karyawan
- aplikasi absensi perusahaan
- absensi online
- sistem kehadiran karyawan
- manajemen absensi digital

Gunakan keyword pada:

- H1
- beberapa H2
- paragraf pembuka
- title
- meta description
- alt text gambar
- structured data jika relevan

Aturan:

- Hanya gunakan satu H1 di setiap halaman.
- Gunakan struktur heading yang benar.
- Jangan menumpuk keyword secara berlebihan.
- Konten harus terdengar profesional dan alami.
- Jangan membuat klaim yang tidak bisa dibuktikan.

J. Optimasi gambar dan aksesibilitas

Pastikan:

- Setiap gambar memiliki alt text deskriptif.
- Logo memiliki alt text yang benar.
- Gambar dikompresi.
- Gunakan format WebP jika memungkinkan.
- Lazy loading digunakan untuk gambar non-kritis.
- Hindari gambar penting yang hanya dapat dibaca melalui JavaScript.
- Warna dan kontras tetap mudah dibaca.
- Website dapat digunakan melalui keyboard.
- Gunakan semantic HTML seperti header, main, nav, section, footer, dan article jika sesuai.

K. Optimasi performa dan Core Web Vitals

Periksa dan optimalkan:

- Largest Contentful Paint.
- Cumulative Layout Shift.
- Interaction to Next Paint.
- Ukuran bundle JavaScript.
- CSS yang tidak digunakan.
- Ukuran gambar.
- Font loading.
- Lazy loading.
- Cache asset.
- Compress response.
- Penggunaan preload hanya untuk resource penting.

Jangan menambahkan library besar jika tidak diperlukan.

L. Konfigurasi environment dan domain

Buat konfigurasi yang mudah diganti:

APP_NAME
COMPANY_NAME
PUBLIC_SITE_URL
LOGO_URL
SOCIAL_IMAGE_URL
CONTACT_EMAIL
CONTACT_PHONE

Untuk sementara gunakan placeholder yang aman, misalnya:

APP_NAME=Absensi Golan Digital Kreatif
COMPANY_NAME=PT. Golan Digital Kreatif
PUBLIC_SITE_URL=https://domain-anda-nanti.com

Jangan mengunci domain ke localhost di metadata produksi.

Pisahkan konfigurasi development dan production.

M. Google Search Console dan Google Business

Tambahkan dokumentasi deployment yang menjelaskan:

1. Membeli domain.
2. Menghubungkan domain ke hosting.
3. Mengaktifkan HTTPS.
4. Mendaftarkan domain di Google Search Console.
5. Melakukan verifikasi domain melalui DNS.
6. Mengirim sitemap.xml.
7. Memeriksa URL publik dengan URL Inspection.
8. Memastikan halaman internal tidak terindeks.
9. Memantau error indexing dan Core Web Vitals.
10. Jika perusahaan memiliki lokasi dan informasi bisnis publik, membuat Google Business Profile dengan data yang benar.

Jangan membuat Google Business Profile dengan data fiktif.

N. Strategi nama website dan domain

Gunakan nama aplikasi berikut sebagai default:

Absensi Golan Digital Kreatif

Namun buat agar mudah diubah menjadi:

Absensi Golan

Berikan rekomendasi domain yang singkat dan relevan, misalnya:

- absensigolan.com
- absensigolandigital.com
- golandigital.com
- golandigital.id
- absensi-golan.id

Sebelum merekomendasikan domain final, periksa ketersediaan domain melalui registrar ketika proses pembelian dilakukan. Jangan mengklaim domain tersedia jika belum diverifikasi.

Prioritaskan:

- Mudah dieja.
- Mudah diingat.
- Tidak terlalu panjang.
- Sesuai nama perusahaan atau produk.
- Menggunakan HTTPS.
- Konsisten dengan nama brand.

O. Keamanan indexing

Karena aplikasi berisi data internal, pastikan:

- Halaman dashboard tidak dapat diakses tanpa login.
- Data karyawan dan data absensi tidak muncul di HTML publik.
- Route internal menggunakan noindex.
- Endpoint API tidak terekspos melalui sitemap.
- Jangan mengandalkan robots.txt sebagai pengaman data.
- Gunakan autentikasi dan otorisasi yang benar.
- Pastikan halaman error tidak membocorkan data sensitif.
- Jangan menampilkan token, credential, atau konfigurasi rahasia di frontend.

P. Testing

Setelah implementasi:

- Jalankan build production.
- Jalankan test yang tersedia.
- Pastikan tidak ada error TypeScript, lint, atau build.
- Uji semua route publik.
- Uji route internal tanpa login.
- Uji redirect login.
- Periksa title dan meta tag pada setiap halaman.
- Validasi sitemap.xml.
- Validasi robots.txt.
- Validasi JSON-LD.
- Periksa canonical URL.
- Uji responsive mobile dan desktop.
- Uji halaman saat direfresh langsung.
- Pastikan asset tidak 404.
- Pastikan halaman publik tetap dapat dibaca ketika JavaScript belum selesai dimuat jika menggunakan SSR/prerendering.

Q. Dokumentasi hasil

Buat dokumentasi singkat yang menjelaskan:

- File yang diubah.
- Cara mengganti nama website.
- Cara mengganti domain.
- Cara mengganti logo dan gambar social sharing.
- Cara menjalankan build production.
- Cara melakukan deploy.
- Cara mendaftarkan website ke Google Search Console.
- Route yang boleh diindeks.
- Route yang harus tetap private.
- Checklist setelah domain dan hosting aktif.

Batasan penting:

- Jangan menjanjikan website pasti berada di posisi pertama Google.
- Ranking pertama membutuhkan domain, hosting, HTTPS, konten berkualitas, backlink, reputasi brand, dan waktu indexing.
- Jangan melakukan keyword stuffing.
- Jangan membuat review, rating, alamat, nomor telepon, atau informasi perusahaan palsu.
- Jangan mengubah fungsi utama sistem absensi.
- Jangan merusak login, role, permission, atau keamanan data.
- Pertahankan perubahan yang sudah ada di project.
- Jika terdapat konflik dengan struktur project saat ini, jelaskan masalahnya dan gunakan solusi yang paling aman.

Output yang saya inginkan:

1. Implementasikan optimasi SEO teknis dan halaman publik.
2. Tampilkan daftar file yang diubah.
3. Tampilkan ringkasan perubahan.
4. Tampilkan hasil build dan testing.
5. Tampilkan hal-hal yang masih harus dilakukan setelah domain dan hosting tersedia.
