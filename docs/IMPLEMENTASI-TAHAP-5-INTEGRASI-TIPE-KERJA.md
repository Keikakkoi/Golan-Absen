# Implementasi Tahap 5 — Integrasi Pengaturan Umum Tipe Kerja

## Kontrak canonical

- `wfo` ditampilkan sebagai Kantor/WFO.
- `wfh` ditampilkan sebagai Rumah/WFH.
- `alternative_location` ditampilkan sebagai **Lokasi Alternatif**.
- `field_location` ditampilkan sebagai **Lokasi Lapangan**.
- Nilai legacy seperti `tanpa_validasi` tetap dibaca melalui adapter agar data lama tidak rusak.

Default WFO, WFH, dan Lokasi Alternatif dipastikan tersedia saat startup. Baris existing diperbaiki pada field canonical/default tanpa mengubah histori absensi.

## Sumber lokasi lapangan

Mode `field_location` wajib membawa `field_location_id` dari master `field_locations` yang aktif. Endpoint menolak ID kosong, ID lokasi inactive/arsip, dan referensi lokasi lapangan pada mode non-lapangan. Tidak ada payload untuk menyimpan alamat/koordinat lapangan bebas pada tipe kerja.

UI Pengaturan Tipe Kerja memuat dropdown master lokasi lapangan aktif dari Manajemen Lokasi. Lokasi existing yang sudah inactive tetap ditampilkan sebagai konfigurasi lama/nonaktif agar histori dan konfigurasi dapat dibaca, tetapi tidak dapat dipilih sebagai lokasi baru dan backend menolak penyimpanan ulang sampai dikonfigurasi dengan lokasi aktif.

## Histori dan check-in

Edit tipe kerja hanya mengubah konfigurasi tipe kerja saat ini. Referensi/snapshot pada histori absensi tetap tersimpan. Check-in tetap memvalidasi status aktif lokasi lapangan di server, sehingga lokasi yang dinonaktifkan tidak dapat dipakai untuk check-in baru meskipun masih direferensikan tipe kerja lama.

## Verifikasi

- Backend test mencakup canonical label, adapter legacy, penolakan referensi lokasi pada mode non-lapangan, ID nol, dan master lapangan aktif/inaktif.
- Test komponen work type mencakup label Lokasi Alternatif/Lokasi Lapangan, dropdown master, payload canonical, dan preservasi mode legacy.
- `go test ./...` lulus.
- `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/features/admin/worktype-list/worktype-list.component.spec.ts` lulus.
- `npm run build` lulus dengan warning budget/dependency existing.
