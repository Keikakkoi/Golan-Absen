# Tahap 8 — Verifikasi, UAT, dan Laporan Akhir

Tanggal verifikasi: **3 Oktober 2026**  
Status: **verifikasi otomatis lulus; UAT berbasis akun nyata tertunda karena kredensial runtime belum tersedia**.

## Ringkasan hasil

Fondasi dan alur canonical Laporan Kerja berhasil dibangun untuk `KARYAWAN`, `MANAJER`, dan `MAGANG`. Build serta test otomatis lulus. Endpoint canonical dan endpoint kompatibilitas tetap terlindungi authorization.

Pekerjaan belum boleh dinyatakan sebagai UAT selesai penuh karena smoke test interaktif untuk empat role tidak dapat login ke instance runtime. Kredensial seed yang dicoba ditolak `401`; password atau data user tidak diubah untuk memaksa UAT lulus.

## Verifikasi toolchain

| Pemeriksaan | Perintah/bukti | Hasil |
|---|---|---|
| Backend unit/integration test | `go test -count=1 ./...` | Lulus seluruh package |
| Backend static analysis | `go vet ./...` | Lulus |
| Format Go | `gofmt -l .` | File yang disentuh sudah terformat; masih ada 7 file lama di luar scope yang belum terformat |
| Frontend unit/component test | `npx ng test --watch=false --browsers=ChromeHeadless` | **111 SUCCESS, 0 FAILED** |
| Test fokus laporan kerja | employee, admin inbox, manager team report, contract normalizer | Lulus; sebelumnya 20 test fokus juga lulus |
| Type-check aplikasi | `npx tsc -p tsconfig.app.json --noEmit` | Lulus |
| Type-check spec | `npx tsc -p tsconfig.spec.json --noEmit` | Lulus |
| Frontend build | `npm run build` | Lulus |
| Diff hygiene | `git diff --check` | Lulus; output hanya warning normal konversi LF/CRLF Git |
| Lint | `frontend/package.json` | Tidak tersedia sebagai script proyek; tidak dilewati secara diam-diam |
| Staticcheck | tool/script proyek | Tidak dikonfigurasi; `go vet`, TypeScript, dan build dipakai sebagai pemeriksaan statis yang tersedia |

Build frontend masih menghasilkan warning budget SCSS dan dependency CommonJS (`sweetalert2`, `leaflet`, `canvg`, dan dependency terkait). Warning tersebut tidak menyebabkan build gagal dan tidak diubah dengan pengecualian baru.

## Pemeriksaan migration dan database

Migration yang menjadi sumber kompatibilitas adalah [`20261002_work_report_compatibility.sql`](<C:/laragon/www/Absensi Golan/backend/migrations/20261002_work_report_compatibility.sql:1>). Pemeriksaan SQL dijalankan dalam transaksi `BEGIN … ROLLBACK` menggunakan PostgreSQL container, sehingga verifikasi ini tidak mengubah data.

Hasil schema read-only pada database runtime:

- kolom `report_kind`, `status_laporan`, `status_logbook`, dan `status_sesuai` tersedia;
- `report_kind=legacy_logbook`: **391** baris;
- `report_kind=work_report`: **1515** baris;
- migration bersifat additive: tidak melakukan `DROP`, `DELETE`, atau `TRUNCATE`.

Kolom dan backfill kompatibilitas yang sudah ada dipertahankan oleh [`database.go`](<C:/laragon/www/Absensi Golan/backend/config/database.go:70>). Tidak ada migration destruktif yang dijalankan pada verifikasi Stage 8.

## Smoke test dan UAT

| Skenario | Bukti | Status |
|---|---|---|
| MAGANG membuka Laporan Kerja | route `/employee/work-report`, guard role, component test | Otomatis terverifikasi; login browser tertunda |
| MAGANG membuat dan menyimpan draft | contract/status/handler test dan component flow | Otomatis terverifikasi; UAT akun nyata tertunda |
| MAGANG mengajukan laporan | status transition dan validation test | Otomatis terverifikasi; UAT akun nyata tertunda |
| Laporan MAGANG masuk inbox admin | admin component test mengidentifikasi tiga role pelapor | Otomatis terverifikasi; data runtime belum diuji lewat UI |
| Filter role/status/periode/detail/lampiran | admin component test dan canonical query | Otomatis terverifikasi |
| Admin memproses sesuai permission | route role guard, backend status/permission test | Terverifikasi tanpa token menghasilkan `401`; UAT HRD tertunda |
| Status, alasan penolakan, notifikasi, audit log | contract, status, notification/realtime code dan test | Otomatis terverifikasi; observasi event runtime tertunda |
| MAGANG hanya membaca miliknya | owner-scope test dan handler authorization | Lulus pada test backend |
| KARYAWAN dan MANAJER tetap berjalan | employee/manager component serta full backend/frontend suite | Lulus |
| Route lama aman | request tanpa token menghasilkan `401`; frontend redirect diverifikasi statically | Lulus untuk protection; perlu UAT bookmark dengan kredensial |
| Tidak ada istilah lama pada UI aktif | scan dan review template; route lama frontend redirect | Lulus untuk entry point aktif; referensi kompatibilitas tetap terdokumentasi |

Endpoint berikut diuji tanpa token dan seluruhnya mengembalikan `401`: `/api/v1/work-reports/`, `/api/v1/internship/logbooks`, `/api/v1/admin/internship/logbooks`, `/api/v1/manager/team/reports`, `/api/v1/manager/team/logbooks/1/review`, dan `/api/v1/admin/reports/`.

## Mapping data historis dan kompatibilitas

| Data/route lama | Padanan canonical | Perlakuan |
|---|---|---|
| `status_logbook` / `StatusLogbook` | `draft`, `submitted`, `approved`, `rejected` | Dibaca oleh adapter; status aktif dinormalisasi ke kontrak laporan kerja |
| `status_sesuai` | validation/review status | Tetap dibaca untuk histori dan dipetakan ke label canonical |
| `report_kind=legacy_logbook` | laporan historis | Tetap dapat dibaca; tidak diberi aksi edit/hapus canonical secara sembarangan |
| `logbook_pending` | `work_reports_pending` | Alias response hanya di boundary kompatibilitas |
| `/intern/logbooks` | `/employee/work-report` | Redirect frontend |
| `/api/v1/internship/logbooks` | `/api/v1/work-reports/` | Endpoint lama diproteksi dan diberi header deprecation/successor |
| `/api/v1/admin/internship/logbooks` | `/api/v1/admin/reports` dan inbox `/admin/work-reports` | Jalur lama dipertahankan untuk histori; tidak menjadi menu aktif |
| `/api/v1/manager/team/logbooks/:id/review` | `/api/v1/manager/team/reports/:id/review` | Alias protected untuk client lama |

Data backup, fixture, migration, model, dan test kontrak yang menyebut nama lama tidak dihapus karena diperlukan untuk pembacaan dan rollback histori. Komponen `intern-logbook` tidak lagi dirouting; entry point MAGANG aktif adalah `features/employee/work-report/`.

## Perubahan file dan area

Perubahan Stage 8 menambahkan laporan ini, memperbaiki fixture provider pada spec frontend yang sebelumnya tidak menyediakan `HttpClient`/router, dan memperkuat mock `AuthService`/`ThemeService` pada [`profile.component.spec.ts`](<C:/laragon/www/Absensi Golan/frontend/src/app/features/employee/profile/profile.component.spec.ts:18>). Teks panel aktif pada [`role-operations.component.html`](<C:/laragon/www/Absensi Golan/frontend/src/app/features/admin/role-operations/role-operations.component.html:13>) juga dinetralkan agar tidak menampilkan istilah lama.

Perubahan lintas Tahap 2–7 yang diverifikasi meliputi:

- backend: route/handler `work_report.go`, `report.go`, `internship.go`, `manager.go`, `admin_role_operations.go`, model/contract, permission, notification/realtime, dan database compatibility layer;
- frontend: route/guard, sidebar, dashboard, employee work report, manager team reports, admin work-report inbox, role operations, chart, export, notification, dan normalizer contract;
- test: authorization owner scope, validation, status transition, legacy mapping, admin three-role inbox, attachments, rejection reason, pagination/filter, dan component flow;
- dokumentasi: desain target, backend, UI MAGANG, integrasi admin, pembersihan duplikasi, audit istilah, dan laporan ini.

Daftar lengkap perubahan lokal dapat diperiksa dengan `git status --short`; perubahan dari tahap sebelumnya sengaja tidak di-reset atau dihapus.

## Temuan yang belum selesai

1. UAT interaktif empat role (`MAGANG`, `KARYAWAN`, `MANAJER`, `HRD`) belum dapat dijalankan karena instance runtime tidak menerima kredensial seed yang tersedia. Diperlukan akun UAT yang valid atau reset kredensial melalui prosedur operasional resmi.
2. Warning budget SCSS dan CommonJS masih ada. Keduanya tidak memblokir build, tetapi sebaiknya ditangani pada pekerjaan quality/performance terpisah.
3. Tujuh file Go lama masih terdeteksi oleh `gofmt -l`: `cmd/fix_db/main.go`, `config/redis.go`, `internal/middleware/auth.go`, `internal/models/work_schedule_days.go`, `internal/models/work_schedule_days_test.go`, `internal/utils/audit_test.go`, dan `pkg/jwt/jwt.go`. File-file ini tidak disentuh karena tidak terkait migrasi laporan kerja.
4. Endpoint legacy tetap ada untuk kompatibilitas. Deprecation dan rencana penghapusan harus dipertahankan sampai seluruh client lama bermigrasi dan backup histori tervalidasi.

## Rollback aman

1. Hentikan deployment baru dan arahkan frontend ke build sebelumnya bila ditemukan regresi runtime.
2. Backup database dan object storage sebelum rollback aplikasi.
3. Jangan menghapus `report_kind`, `status_logbook`, `status_sesuai`, atau baris `legacy_logbook`; kolom tersebut dibutuhkan untuk membaca histori dan memulihkan response lama.
4. Rollback kode dengan commit/deployment sebelumnya, lalu pertahankan migration additive. Jangan menjalankan `DROP COLUMN`, `DELETE`, atau reset data sebagai bagian rollback.
5. Jika bookmark lama perlu dipulihkan sementara, aktifkan kembali route compatibility yang sama-sama memakai guard; setelah cutover ulang, arahkan kembali ke `/employee/work-report` dan `/admin/work-reports`.

## Kesimpulan

Build, test otomatis, authorization boundary, migration check, dan pemeriksaan istilah aktif sudah lulus. Status akhir yang jujur adalah **siap untuk UAT dengan akun valid**, bukan klaim bahwa UAT manual empat role telah selesai. Gate terakhir sebelum release adalah menjalankan ulang skenario interaktif di atas dan menyimpan bukti status, notifikasi, audit log, filter, export, serta akses ownership dari instance yang terautentikasi.
