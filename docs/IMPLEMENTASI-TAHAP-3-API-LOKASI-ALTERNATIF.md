# Implementasi Tahap 3 — API Lokasi Alternatif User

## Endpoint

Resource utama berada di `/employee/alternative-locations`. Alias kompatibilitas juga tersedia di `/employee/profile/alternative-locations`.

- `GET /` — daftar lokasi milik user yang sedang login, dengan `used` dan `limit`.
- `GET /:id` — detail lokasi milik user.
- `POST /` — membuat pengajuan baru.
- `PUT /:id` — mengubah lokasi milik user dan mengembalikannya ke `pending`/`inactive`.
- `DELETE /:id` — soft-delete/archive lokasi milik user.
- `PATCH /:id/status` — mengubah aktif/nonaktif, hanya untuk lokasi `approved`.

Semua route mengambil `user_id` dari JWT/session middleware. Query detail, update, delete, dan toggle selalu memakai pasangan `id` dan `user_id`, sehingga ID milik user lain menghasilkan `404`.

## Role dan aturan input

Karyawan, `MAGANG`, dan `MANAJER` dapat mengelola lokasi alternatif miliknya sendiri. HRD/Admin tidak memakai API owner ini; HRD menangani review melalui endpoint admin.

Payload user hanya menerima nama, deskripsi, koordinat, radius, dan metode validasi. `user_id`, `status_approval`, `status_aktif`, `approved_by`, `rejected_by`, timestamp approval, dan alasan penolakan tidak dapat ditentukan client.

Setiap POST selalu dibuat sebagai `pending` dan `inactive`. Pengajuan `rejected` tetap dihitung dalam batas tiga lokasi sampai dihapus/archive. Keputusan ini konsisten antara validator backend, response `used/limit`, dan dokumentasi UI.

Response owner mempertahankan field lama dan menambahkan `id`, `created_at`, `updated_at`, `label`, `status`, `status_label`, `status_aktif_label`, `rejection_reason`, serta capability flags `can_edit`, `can_delete`, dan `can_toggle`.

## Verifikasi

Test mencakup tiga role employee, penolakan HRD pada owner API, status pending/approved/rejected, input field sensitif, ownership lintas user, dan penolakan lokasi keempat. Baseline `go test -count=1 ./...` lulus.
