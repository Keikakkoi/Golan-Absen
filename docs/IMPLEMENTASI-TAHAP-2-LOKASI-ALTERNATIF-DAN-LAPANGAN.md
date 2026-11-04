# Implementasi Tahap 2 — Model, Migration, dan Kontrak Backend

## Kontrak data

- Tipe kerja canonical: `wfo`, `wfh`, `alternative_location`, `field_location`.
- Status pengajuan lokasi alternatif: `pending`, `approved`, `rejected`.
- Status penggunaan lokasi: `active`, `inactive`.
- `alternative_locations` menyimpan owner user, metadata lokasi, koordinat numerik, radius/metode validasi, status approval/aktif, alasan penolakan, actor approval/rejection, timestamp, dan `deleted_at`.
- `field_locations` adalah master terpisah yang dikelola HRD/Admin dan menyimpan metadata lokasi, koordinat numerik, radius/metode validasi, status aktif, actor create/update, timestamp, dan `deleted_at`.
- Nama dibatasi 100 karakter setelah trim. Koordinat menolak NaN/Inf, rentang di luar bumi, dan titik `0,0`. Radius dibatasi 1–10.000 meter.

## Aturan lifecycle

- Pengajuan `pending`, `approved`, dan `rejected` dapat diedit oleh owner. Setiap edit mengembalikan status ke `pending` dan `inactive` agar perubahan koordinat/identitas lokasi ditinjau ulang.
- Ketiga status tersebut dapat dihapus oleh owner melalui soft delete. Dengan begitu lokasi yang sudah direferensikan histori absensi tidak menghilangkan referensi atau snapshot histori.
- Hanya lokasi alternatif `approved` yang boleh diaktifkan/nonaktifkan. Check-in mensyaratkan `approved` dan `active`.
- Lokasi lapangan yang `inactive` atau soft-deleted tidak dapat dipakai check-in.
- Pengajuan yang ditolak tetap dihitung dalam batas maksimal tiga lokasi sampai owner mengarsipkannya. Penghapusan soft-delete membebaskan slot.
- Nama alternatif unik per owner untuk row yang belum diarsipkan. Nama lokasi lapangan unik secara global untuk row yang belum diarsipkan; perbandingan trim dan tidak peka huruf besar/kecil.

## Kompatibilitas dan migrasi

- Kolom tipe kerja dan referensi lokasi ditambahkan secara additive. Nilai legacy tidak diubah massal; adapter `CanonicalWorkType` tetap membaca label lama.
- Kolom baru pada histori absensi menyimpan ID lokasi dan snapshot nama/alamat/koordinat/radius. Row histori lama tetap valid karena kolom nullable.
- Migration menggunakan `IF NOT EXISTS`, foreign key/index terarah, constraint koordinat/status/metode, dan tidak menghapus tabel maupun histori absensi.
- Model lokasi memakai GORM soft delete. Startup AutoMigrate dan SQL migration standalone menjaga kontrak yang sama.

## Verifikasi

- Unit test model/validator mencakup nama, NaN/Inf, rentang koordinat, radius, method, owner, status, canonical mapping, lifecycle, quota tiga lokasi, normalisasi nama duplikat, dan soft-delete reference histori.
- Migration contract test memeriksa tabel/index/foreign key/constraint additive dan memastikan tidak ada operasi `DROP TABLE`, `DELETE FROM attendance_records`, atau `TRUNCATE attendance_records`.
- Baseline backend: `go test ./...` lulus.
