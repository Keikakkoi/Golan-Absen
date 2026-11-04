# Implementasi Tahap 6 — Profil Lokasi Alternatif

## Cakupan

`ProfileComponent` dipakai bersama oleh Karyawan, MAGANG, dan MANAJER, sehingga
bagian **Lokasi Alternatif** tersedia pada halaman profil ketiga role tersebut.
Implementasi menggunakan card, form control, tabel, modal, alert, tombol, dan
style peta yang sudah digunakan profil serta komponen global yang sudah ada.

## Perilaku UI dan aturan bisnis

- Kuota ditampilkan sebagai `N dari 3 lokasi digunakan`.
- Lokasi `pending` dan `rejected` ditampilkan, tetapi tidak dianggap tersedia
  untuk check-in dan tidak memiliki toggle aktif/nonaktif.
- Lokasi `approved` dapat diaktifkan atau dinonaktifkan. Status awal lokasi
  baru tetap ditentukan backend dan tidak dikirim dari form user.
- Pengajuan `rejected` tetap memakan kuota sampai lokasi tersebut dihapus.
  Tombol pengajuan dinonaktifkan ketika kuota penuh.
- Edit dan hapus selalu meminta konfirmasi. Error 401/403/404 dari backend
  tetap ditampilkan melalui alur error API, meskipun action dapat dibatasi di
  UI berdasarkan status.
- Alasan penolakan ditampilkan pada tabel dan detail.
- Koordinat dapat diisi manual atau dipilih dengan klik pada peta. Validasi
  frontend hanya membantu pengguna; validasi dan ownership tetap ditegakkan
  backend.

## Endpoint yang dipakai

- `GET /api/v1/employee/alternative-locations`
- `POST /api/v1/employee/alternative-locations`
- `PUT /api/v1/employee/alternative-locations/:id`
- `DELETE /api/v1/employee/alternative-locations/:id`
- `PATCH /api/v1/employee/alternative-locations/:id/status`

Payload create/edit hanya mengirim nama, deskripsi, koordinat, radius, dan
metode validasi. Owner, status approval, approved-by, dan alasan penolakan
tidak berasal dari input user.

## Verifikasi

- Test profil: **18/18 lulus**.
- Build Angular production: **lulus**. Warning yang muncul adalah warning
  existing terkait ukuran SCSS dan dependency CommonJS.
- Test backend Go: **lulus** (`go test -count=1 ./...`).
- `git diff --check`: tidak menemukan whitespace error; output hanya warning
  normalisasi line ending pada perubahan repository yang sudah ada.

