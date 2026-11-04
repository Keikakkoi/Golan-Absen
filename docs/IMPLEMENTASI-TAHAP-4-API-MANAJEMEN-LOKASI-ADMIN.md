# Implementasi Tahap 4 — API Manajemen Lokasi Admin

## Resource dan endpoint

Semua endpoint berikut berada di bawah middleware `Protected` dan `RequireRoles(HRD)`:

- `/admin/locations/alternative-requests`: daftar paginated, filter `status`, pencarian nama user/nama lokasi, sort whitelist, detail, approve, dan reject.
- `/admin/locations/field`: daftar paginated, filter `status`, pencarian nama/deskripsi, sort whitelist, detail, tambah, edit, aktif/nonaktif, dan soft-delete/archive.

Response daftar mengembalikan `data`, `page`, `limit`, `total`, dan `total_pages`.

## Approval dan keamanan

- Review hanya dapat dilakukan pada status `pending`.
- Approve mengubah status menjadi `approved`/`active`; reject mengubah status menjadi `rejected`/`inactive` dan mewajibkan alasan maksimal 1000 karakter.
- Review mengambil row lock dalam transaction sehingga dua keputusan bersamaan tidak dapat memproses pengajuan yang sama.
- Actor dan timestamp keputusan disimpan pada row lokasi, lalu perubahan dicatat melalui audit log.
- Ringkasan owner admin hanya memuat ID, nama, email, dan role. Password hash, token reset, dan field sensitif lain tidak dikembalikan.

## Master lokasi lapangan

Admin dapat menentukan status pada create/update maupun endpoint toggle. Query sort memakai whitelist field dan arah `asc`/`desc`; nilai sort/order yang tidak dikenal ditolak. List juga mendukung filter status dan pencarian nama/deskripsi.

Penghapusan selalu soft-delete agar referensi histori absensi dan snapshot lokasi tetap aman. Semua create, edit, status, dan archive dicatat ke audit log.

## Verifikasi

Test mencakup role HRD versus role employee, sort injection/invalid order, metadata pagination, response tanpa secret user, actor/waktu/alasan approval-rejection, penolakan review ulang secara transactional, dan seluruh backend melalui `go test -count=1 ./...`.
