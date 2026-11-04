# Implementasi Tahap 7 — Manajemen Lokasi Admin

## Halaman dan akses

- Route frontend: `/admin/locations`.
- Route memakai `authGuard` dan `roleGuard` dengan role `HRD`.
- Menu **Manajemen Lokasi** hanya dirender pada blok sidebar HRD.
- Endpoint backend yang dipakai berada di bawah `/api/v1/admin/locations` dan
  sudah memakai `Protected()` serta `RequireRoles(RoleHRD)`.

## Pengajuan Lokasi Alternatif

Halaman menyediakan tabel paginated dengan pencarian user/lokasi, filter
`pending`, `approved`, dan `rejected`, metadata total, loading, empty state,
detail, approval, serta rejection dengan alasan melalui dialog textarea.

Setiap keputusan me-refresh daftar. Keputusan ulang terhadap pengajuan yang
sudah diproses tetap ditolak oleh UI dan backend. Error 401/403/404/error API
ditampilkan melalui alur alert halaman.

## Daftar Lokasi Lapangan

Halaman menyediakan list paginated, pencarian, filter aktif/nonaktif, tambah,
detail, edit, toggle On/Off, dan arsip soft delete. Form memvalidasi nama,
koordinat bumi, radius, metode validasi, dan status sebelum request. Payload
memakai master lokasi lapangan; tidak ada input lokasi bebas untuk tipe kerja.

Tabel memakai `golan-table` dan `golan-table-responsive`, sedangkan pagination
memakai `app-pagination`. CSS halaman hanya mengatur layout, ukuran minimum
tabel, action group, dan breakpoint agar overflow tabel tetap tertangani oleh
wrapper yang sudah ada.

## Verifikasi

- Test halaman admin: **6/6 lulus**.
- Test profil lokasi alternatif: **18/18 lulus**.
- Build Angular production: **lulus**; warning yang muncul adalah warning
  existing mengenai ukuran SCSS dan dependency CommonJS.
- Test backend: **lulus** dengan `go test -count=1 ./...`.

