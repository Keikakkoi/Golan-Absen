# Tahap 4 — Implementasi UI Laporan Kerja MAGANG

## Hasil

Halaman aktif user `MAGANG` sekarang memakai komponen canonical `features/employee/work-report/`.

- Route utama: `/employee/work-report`.
- Guard route mengizinkan `Karyawan`, `MANAJER`, dan `MAGANG`; endpoint tetap membatasi data berdasarkan user yang terautentikasi.
- Sidebar MAGANG menampilkan `Laporan Kerja`, bukan `Logbook Harian`.
- `/intern/logbooks` dipertahankan sebagai compatibility bookmark dan diarahkan ke `/employee/work-report`; route tersebut tidak lagi memuat komponen logbook lama.
- Dashboard dan statistik MAGANG membaca alias canonical `work_reports_submitted` dan `work_reports_approved`, dengan fallback response legacy saat backend lama masih digunakan.
- Chart status MAGANG memakai `report_status` dan tidak lagi menampilkan label logbook.

## Kontrak UI

Halaman canonical mendukung:

1. membuat laporan kerja;
2. validasi field wajib di frontend dan backend;
3. menyimpan draft;
4. mengedit draft atau laporan yang masih diizinkan backend;
5. mengajukan laporan;
6. melihat status pengisian dan status validasi;
7. membuka detail laporan;
8. melihat catatan review dan alasan penolakan;
9. menambah, menghapus, dan melihat lampiran sesuai kontrak endpoint;
10. pagination, filter periode, refresh, dan export.

Status UI dinormalisasi melalui `normalizeWorkReportContract`. Record `legacy_logbook` tetap dapat dibaca, tetapi tidak diberi aksi edit/hapus dari halaman canonical. Status draft tidak dihitung sebagai laporan yang sudah diajukan pada read model dashboard.

## Verifikasi

- `go test -count=1 ./...` — lulus.
- `npm run build` — lulus; hanya warning budget stylesheet dan dependency CommonJS yang sudah ada.
- Test targeted frontend komponen laporan kerja dan utility kontrak — 6 test lulus.

## Checklist uji manual penerimaan

- buka `/employee/work-report` sebagai `MAGANG`;
- buat draft dan uji validasi field wajib;
- edit draft, ajukan, reload, dan pastikan status tetap tersimpan;
- buka detail laporan, lampiran, catatan review, serta alasan penolakan;
- uji pagination, filter bulan, export, dan tampilan layar kecil;
- pastikan URL atau tampilan aktif tidak mengarahkan user MAGANG ke `/intern/logbooks`.
