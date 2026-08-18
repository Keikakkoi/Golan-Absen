# SEO dan deployment Absensi Golan

## Konfigurasi brand dan domain

Edit `frontend/src/environments/environment.ts` untuk build production. Nilai yang tersedia adalah `appName`, `companyName`, `publicSiteUrl`, `logoUrl`, `socialImageUrl`, `contactEmail`, dan `contactPhone`. Untuk development, gunakan `environment.development.ts`. Default production sengaja memakai `https://domain-anda-nanti.com` sampai domain resmi dibeli.

Nama aplikasi dapat diganti dari `Absensi Golan Digital Kreatif` menjadi `Absensi Golan` di file environment. Setelah mengganti logo atau social image, perbarui URL yang sama pada konfigurasi tersebut. `social-share.svg` adalah placeholder 1200×630 dan dapat diganti aset brand final.

## Route publik dan private

Route yang boleh diindeks hanya `/`. `/home` adalah alias yang mengarah ke `/`. Login, reset password, dashboard, data karyawan, absensi, laporan, dan seluruh route ber-role diberi `noindex, nofollow` oleh Angular dan diblokir di `robots.txt`. Robots bukan pengaman data: autentikasi dan otorisasi backend tetap wajib.

Proyek saat ini adalah SPA Angular 18 tanpa SSR/prerendering. Metadata diperbarui saat navigasi oleh `SeoService`, tetapi HTML awal untuk crawler masih berasal dari `index.html`. Untuk SEO maksimal, aktifkan Angular SSR/prerender pada deployment setelah konfigurasi hosting siap; jangan mengekspos data internal dalam HTML hasil render.

## Build dan deploy

```powershell
cd frontend
npm ci
npm run build
```

Deploy isi `frontend/dist/frontend/browser` (atau folder output browser yang dihasilkan CLI) ke hosting static. Web server harus mengembalikan `index.html` sebagai fallback untuk route Angular, tetap menyajikan `robots.txt`, `sitemap.xml`, dan asset tanpa fallback, serta menggunakan HTTPS. Contoh aturan Nginx:

```nginx
location / { try_files $uri $uri/ /index.html; }
location = /robots.txt { try_files $uri =404; }
location = /sitemap.xml { try_files $uri =404; }
```

Sebelum deploy domain final, ganti domain pada `environment.ts`, `frontend/public/robots.txt`, dan `frontend/public/sitemap.xml`. Jika ada kontak bisnis yang memang dipublikasikan, isi hanya data yang benar.

## Google Search Console

1. Beli domain dan hubungkan DNS ke hosting.
2. Aktifkan HTTPS dan pastikan versi canonical (misalnya HTTPS tanpa `www`) konsisten.
3. Tambahkan properti domain di Google Search Console dan verifikasi melalui DNS.
4. Kirim `https://DOMAIN-RESMI/sitemap.xml`.
5. Gunakan URL Inspection untuk `/`, lalu minta pengindeksan jika sudah siap.
6. Uji route internal tanpa login: harus diarahkan ke login atau ditolak, bukan menampilkan data.
7. Pantau coverage/indexing, Core Web Vitals, dan error crawl.
8. Google Business Profile hanya dibuat bila perusahaan memiliki data bisnis publik yang benar; jangan mengisi alamat, telepon, rating, atau ulasan fiktif.

## Checklist setelah hosting aktif

- Domain production sudah menggantikan placeholder.
- HTTPS, canonical, Open Graph image, favicon, robots, dan sitemap tidak 404.
- `curl https://DOMAIN-RESMI/` mengembalikan halaman publik dan refresh route tidak 404.
- Login dan semua route internal tetap terlindungi.
- Tidak ada token, credential, data karyawan, atau data absensi di HTML publik.
- Uji metadata dan JSON-LD dengan validator Google/Schema.org.
- Kompresi HTTP, cache asset hashed, dan lazy loading gambar non-kritis aktif.
- Tinjau bundle awal yang saat ini sekitar 2,21 MB; pertimbangkan lazy loading area admin dan penggantian library CommonJS untuk perbaikan Core Web Vitals.

Nama domain seperti `absensigolan.com`, `absensigolandigital.com`, `golandigital.com`, `golandigital.id`, atau `absensi-golan.id` masih berupa ide. Ketersediaan dan status merek harus diverifikasi langsung melalui registrar sebelum pembelian.
