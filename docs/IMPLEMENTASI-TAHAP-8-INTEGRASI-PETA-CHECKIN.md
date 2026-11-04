# Implementasi Tahap 8 — Integrasi Peta Lokasi Real-time dan Check-in

## Cakupan

Integrasi check-in/check-out sekarang menggunakan vocabulary canonical berikut:

| Tipe | Canonical | Sumber geofence |
| --- | --- | --- |
| WFO | `wfo` | master kantor lama |
| WFH | `wfh` | lokasi rumah user |
| Lokasi Alternatif | `alternative_location` | lokasi milik user yang `approved` dan `active` |
| Lokasi Lapangan | `field_location` | master lapangan `active` yang direferensikan tipe kerja |

Nilai tipe kerja lama tetap dibaca melalui adapter backend dan fallback frontend.
Tidak ada perubahan massal terhadap histori attendance lama.

## Perubahan alur pengguna

`CheckinComponent` memuat lokasi alternatif dari endpoint milik user dan master
lokasi lapangan aktif. Data yang masuk ke pilihan peta difilter lagi di frontend
untuk mencegah lokasi pending, rejected, inactive, deleted, atau lokasi user
lain tampil. Tipe kerja lapangan hanya ditampilkan bila referensi master-nya
aktif dan tersedia.

Saat tipe kerja dipilih, komponen menampilkan nama lokasi, deskripsi/alamat,
koordinat, radius, marker, dan lingkaran geofence pada peta. Validasi radius
yang ditampilkan menggunakan koordinat user, radius lokasi, dan batas toleransi
akurasi GPS yang sama dengan alur existing. Lokasi alternatif dapat dipilih
user; lokasi lapangan mengikuti satu referensi yang dikonfigurasi admin.

## Kontrak payload

`AttendanceService` tetap mengirim `tipe_kerja` lama untuk kompatibilitas, dan
menambahkan field berikut bila tersedia:

- `tipe_kerja_canonical`;
- `alternative_location_id` untuk lokasi alternatif;
- `field_location_id` untuk lokasi lapangan.

Field ID tidak diambil dari owner bebas pada client. Backend mengambil user dari
JWT/session dan memverifikasi ulang ownership, status approval, status aktif,
referensi master pada tipe kerja, serta koordinat terhadap radius sebelum
menulis attendance.

## Proteksi backend

Resolver bersama pada `attendance.go` dipakai check-in dan check-out:

- lokasi alternatif harus dimiliki user yang sedang login, approved, active,
  dan berada dalam radius;
- lokasi lapangan harus dikonfigurasi pada tipe kerja, ID client tidak boleh
  berbeda dari referensi konfigurasi, master harus active, dan posisi harus
  berada dalam radius;
- koordinat invalid, lokasi tidak tersedia, status tidak sah, referensi palsu,
  dan posisi di luar radius ditolak;
- histori tetap menyimpan canonical type, referensi lokasi, serta snapshot
  nama/alamat/radius sehingga perubahan master tidak menghapus konteks lama.

## File utama

- `frontend/src/app/features/employee/checkin/checkin.component.ts`
- `frontend/src/app/features/employee/checkin/checkin.component.html`
- `frontend/src/app/features/employee/checkin/checkin.component.scss`
- `frontend/src/app/core/services/attendance.service.ts`
- `backend/internal/handlers/attendance.go`
- `backend/internal/handlers/worktype.go`
- `backend/internal/handlers/attendance_location_selection_test.go`

## Baseline dan hasil verifikasi

- `npx ng test --no-watch --no-progress --browsers=ChromeHeadless --include=src/app/core/services/attendance.service.spec.ts --include=src/app/features/employee/checkin/checkin.component.spec.ts` — **12 SUCCESS**.
- `npm run build` — **berhasil**. Warning yang tersisa adalah budget/style dan dependency CommonJS existing, bukan error kompilasi Tahap 8.
- `go test ./... -count=1` — **berhasil** pada seluruh package.

Test backend mencakup ownership mismatch, status lokasi yang tidak memenuhi
approved/active, lokasi alternatif di luar radius, tipe lapangan tanpa master,
referensi lapangan yang ditukar, serta lokasi lapangan aktif di dalam radius.
