# KIS REFACTOR REPORT

## Overall Status

**PARTIAL — refactor aman pada batas yang teruji selesai; kesiapan produksi
seluruh aplikasi belum dapat dinyatakan PASS.** Audit lokal dimulai 2026-11-08,
dilanjutkan 2026-11-09, baseline Git `730b6f0`.

Tidak ada perubahan route, autentikasi, permission, schema, API payload,
perhitungan honor/status, aturan validasi, atau desain UI. Tidak ada migrasi,
deployment, pengiriman OTP, atau mutasi database langsung yang dijalankan.
Temuan yang memerlukan perubahan behavior/backend menjadi pekerjaan lanjutan.

## Architecture Before

React 19/JavaScript, React Router 7, Vite 7, Tailwind 4, Supabase JS 2, Recharts,
Lucide, SheetJS dan xlsx-js-style. Baseline tidak memiliki TypeScript compiler;
test runner Node sudah tersedia. Entry [main.jsx](../src/main.jsx) → error boundary
→ [App.jsx](../src/App.jsx) → AuthProvider → Suspense/lazy routes → layout → pages.
Dashboard mempunyai data layer; halaman lain mencampur query, mapping, form,
state, dan JSX. Auth/notification memakai context; server/form/UI state lainnya
terutama dikelola per halaman.

Audit AST seluruh 77 file JS/JSX menemukan 66 file reachable dari entry runtime,
5 file tes di sumber, dan 6 file tidak reachable. Tidak ditemukan circular import
statis. Batas pemeriksaan adalah import statis/dynamic literal, bukan pembuktian
seluruh kondisi runtime. Enam calon cleanup tidak dihapus:
[TwoFADebug](../src/components/TwoFADebug.jsx),
[Pagination UI](../src/components/ui/Pagination.jsx),
[CreateTicketPage](../src/Pages/dashboard/CreateTicketPage.jsx),
[DashboardLayout](../src/Pages/dashboard/DashboardLayout.jsx),
[DashboardTicketPage](../src/Pages/dashboard/DashboardTicketPage.jsx),
[OverviewPage](../src/Pages/dashboard/OverviewPage.jsx).

### Route, data flow, dan modul yang diaudit

| Route/modul | Kontrak dan observasi yang dipertahankan |
| --- | --- |
| `/login`, `/login-password` | OTP/password → Supabase Auth; lookup Teknisi lalu dosen; cooldown lokal, MFA, redirect existing |
| `/dashboard` | Data layer untuk KPI, grafik, jadwal dan notifikasi; tiga kategori jadwal |
| `/dashboard/jadwal` | Tiga tab read-only; rentang tanggal lokal `[awal hari, awal hari berikutnya)` dan realtime |
| `/dashboard/jadwal-admin` | Admin/super admin; CRUD, search eksplisit, filter, pagination, konflik, impor/ekspor; paging DB 1.000 baris |
| Import jadwal | File/Google Sheets → parsing/lookup → validasi/konflik → insert/update atau RPC `sync_jadwal_perkuliahan_import`; undo/audit fields existing |
| `/dashboard/honor-dosen` | Dua email allowlist; periode 1–15/16–akhir bulan, strata dan kalkulasi existing; parser CSV khusus |
| `/dashboard/ruangan` | Delapan pembacaan → booking → filter tanggal → statistik/list; parameter URL `filter` |
| `/dashboard/database` | Dosen/angkatan/mata kuliah/ruangan; tab, q, status, page, pageSize pada URL; role dosen/user |
| `/dashboard/users` | Super admin; Teknisi/dosen, assignment role, CRUD, upload foto |
| `/dashboard/monitor-settings` | Admin/super admin; metadata/storage, migrasi data lokal existing, cleanup upload |
| `/jadwal-monitor` | Publik; tanggal lokal, ruangan fisik, merge sesi, jadwal selesai di belakang, rotasi/polling |
| `/dashboard/ticketing`, `/dashboard/tickets` | Super admin/admin/user; masih memiliki data contoh dan kontrol belum terhubung |
| `/dashboard/my-tickets` | Role sama; ticket/category_divisi/status_ticket/kasubag; CRUD/search |
| `/dashboard/settings` | Route mengizinkan admin/super admin, komponen hanya super admin; save simulasi, setup 2FA memakai Supabase |
| `/`, `*` | Redirect login dan NotFound tetap |

Entitas: tiga tabel jadwal merujuk dosen, ruangan, angkatan, mata_kuliah,
agenda_karya_akhir; ID tambahan sebagian berupa array/JSON. Teknisi/dosen terkait
Auth melalui `auth_id` dan roles melalui `roles_id`. Monitor memakai
`monitor_slides`/bucket `monitor-slides`; foto memakai `user-photos`; view konflik
adalah `view_jadwal_union`. Nama case-sensitive `Teknisi` tetap.

Auth menggunakan PKCE, token sessionStorage dengan metadata expiry lokal 24 jam,
role cache satu jam, fallback role `user`, dan logout timeout dua detik.
Interval, channel, dan cleanup realtime/polling tidak diubah.

## Architecture After

Struktur existing tetap. Batas baru:

- Sidebar → [navigation](../src/constants/navigation.js), dengan icon, label,
  urutan, exact matching, role dan email existing.
- RuanganPage → [useRuanganData](../src/hooks/useRuanganData.js) →
  [roomReads](../src/services/roomReads.js) → client Supabase existing.
- Jadwal admin/import → [scheduleReads](../src/services/scheduleReads.js).
  Error response admin dan exception import sengaja tetap berbeda.
- Lima parser spreadsheet → [scheduleImportParsing](../src/utils/scheduleImportParsing.js).
- Tiga parser array identik → [parseIdList](../src/utils/parseIdList.js).

Form/mutasi besar tidak dipindahkan massal. Hook ruangan tetap dipanggil dua kali
oleh stats/list; perubahan lifecycle request memerlukan tes tersendiri.

## Files Changed

- [.gitignore](../.gitignore), [package.json](../package.json), [package-lock.json](../package-lock.json), [README.md](../README.md).
- [Sidebar.jsx](../src/components/layout/Sidebar.jsx), [accessControl.js](../src/constants/accessControl.js).
- [dashboard.js](../src/data/dashboard.js), [JadwalMonitor.jsx](../src/Pages/JadwalMonitor.jsx).
- [JadwalPageAdmin.jsx](../src/Pages/dashboard/JadwalPageAdmin.jsx), [ImportJadwal.jsx](../src/components/ImportJadwal.jsx).
- [RuanganPage.jsx](../src/Pages/dashboard/RuanganPage.jsx), [UsersPage.jsx](../src/Pages/dashboard/UsersPage.jsx).

## Files Created

- [.env.example](../.env.example), [jsconfig.typecheck.json](../jsconfig.typecheck.json), laporan ini.
- [navigation.js](../src/constants/navigation.js), [parseIdList.js](../src/utils/parseIdList.js), [scheduleImportParsing.js](../src/utils/scheduleImportParsing.js).
- [useRuanganData.js](../src/hooks/useRuanganData.js), [roomReads.js](../src/services/roomReads.js), [scheduleReads.js](../src/services/scheduleReads.js).
- [navigation.test.js](../test/navigation.test.js), [parseIdList.test.js](../test/parseIdList.test.js), [scheduleImportParsing.test.js](../test/scheduleImportParsing.test.js), [dataReads.test.js](../test/dataReads.test.js).

## Files Removed

Tidak ada. Attachment read-only, SQL, env existing, deployment, dan perubahan
pengguna dalam `.vscode` tidak diedit.

## Major Refactors

Query/mapping ruangan dipindahkan utuh, mempertahankan delapan proyeksi, fallback
null, urutan hasil, error label/cause, dan shape booking. Client menjadi parameter
service agar tes tidak perlu database. Paging admin/import mempertahankan rentang
inclusive 0–999, 1000–1999, dan seterusnya; request halaman akhir, metadata response,
filter tanggal, dan kegagalan sama. Regex/coercion/timezone parser tidak diubah.
Sebanyak 14 debug log Users/Import/Jadwal Admin dihapus; error logging tetap.

## Duplication Removed

Tiga parser JSON-array identik menjadi satu. Identitas array, urutan, duplikasi,
dan tipe elemen tetap. Parser Honor Dosen menerima CSV sehingga tidak digabung.
Helper tanggal UTC/lokal dan dua pagination dengan kontrak berbeda juga tetap.

## Type Safety Improvements

TypeScript 5.9.3 ditambahkan sebagai devDependency untuk strict `checkJs` tanpa
emit. Empat modul tercakup: accessControl, navigation, parseIdList,
scheduleImportParsing. JSDoc menggunakan `unknown` untuk input dan
NavigationItem/LucideIcon untuk metadata menu. Ini **bukan** type safety seluruh
aplikasi atau generated Supabase schema. Tidak ada upgrade dependency existing.

## Performance Improvements

Tidak ada klaim peningkatan latency. Debug logging dan parser duplikat berkurang.
Query count, polling, subscription dan lazy loading tetap. Chunk XLSX sekitar
870 kB minified masih memicu warning; batas warning tidak dinaikkan.

## Security Findings

**Critical:** tidak teridentifikasi pada audit lokal; bukan jaminan keamanan backend.

| Severity | Location | Risk | Recommended fix / disposition |
| --- | --- | --- | --- |
| High | [UsersPage](../src/Pages/dashboard/UsersPage.jsx) | API `auth.admin.deleteUser` dari browser dengan key anon akan gagal; Teknisi dihapus lebih dahulu | Pindahkan operasi ke backend berotorisasi. Jangan gunakan service-role di browser. Ditunda karena perubahan API/auth |
| High, perlu verifikasi backend | [RoleProtectedRoute](../src/components/RoleProtectedRoute.jsx), [AuthContext](../src/contexts/AuthContext.jsx) | Role cache/hide-show bukan enforcement; policy lengkap pengguna/jadwal/honor/tenant tidak terbukti dari frontend | Audit RLS di staging; SQL monitor memuat policy, penerapan live belum diverifikasi |
| High | [package-lock.json](../package-lock.json) | npm audit baseline: 43 paket terdampak (28 high, 12 moderate, 3 low, 0 critical), termasuk xlsx/router/Vite/transitif | Triage dependency terpisah berdasarkan konteks browser/dev/SSR; tidak menjalankan audit fix/major upgrade |
| Medium — ditangani | [UsersPage](../src/Pages/dashboard/UsersPage.jsx), [ImportJadwal](../src/components/ImportJadwal.jsx), [JadwalPageAdmin](../src/Pages/dashboard/JadwalPageAdmin.jsx) | Logging row dosen/contoh spreadsheet mengungkap data pribadi | 14 debug log dihapus; query/filter/error logging tetap |
| Medium | [AuthContext](../src/contexts/AuthContext.jsx) | Cache `userRole` tidak dikunci ke authId; callback role tertunda dapat bersaing dengan pergantian sesi | Kaitkan cache/request dengan user dan uji logout/pergantian akun; ditunda karena auth flow |
| Medium | [deploy.yml](../.github/workflows/deploy.yml) | FTP, `dangerous-clean-slate: true`, dan tanpa gate test menambah risiko | Tinjau FTPS/SFTP/penghapusan; pin runtime dan tambah gate PR; tidak mengubah deployment |
| Low | [.gitignore](../.gitignore), env existing | `.env` sudah tracked; ignore tidak menghapus history | Template/ignore ditambahkan. Key yang diperiksa ber-role anon, bukan service_role; untracking/env CI perlu koordinasi |

SheetJS advisory: [prototype pollution](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)
dan [ReDoS](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9). Tidak ditemukan
`dangerouslySetInnerHTML`/`innerHTML` pada scan sumber. Validasi upload UI tetap;
enforcement storage live, seluruh Git history, dan penetrasi tidak diuji.

## Existing Bugs Found

Semua temuan berikut dipertahankan dan memerlukan perubahan terpisah.

| Location | Current behavior | Expected behavior / recommended fix | Impact |
| --- | --- | --- | --- |
| [parseZoomInfo](../src/utils/scheduleImportParsing.js), semula ImportJadwal | `Password: secret` menghasilkan `word:` karena alternatif `Pass` lebih dulu | Urutkan token panjang dahulu/beri batas token dalam bug fix tersendiri | Password Zoom import dapat salah; tes mengunci baseline |
| [AuthContext](../src/contexts/AuthContext.jsx) | JSON.parse cache pada catch bisa melempar lagi untuk cache rusak | Tangani parse fallback dan ikat cache ke authId | Role/loading dapat gagal pulih |
| [NewOverviewPage](../src/Pages/dashboard/NewOverviewPage.jsx), [RuanganPage](../src/Pages/dashboard/RuanganPage.jsx) | Input date UTC melalui toISOString, label/filter lain lokal | Sepakati semantik lokal dan uji dekat tengah malam | Potensi perbedaan hari Asia/Jakarta |
| [roomReads](../src/services/roomReads.js), semula RuanganPage | Seluruh jadwal tanpa paging; hook stats/list dua kali dengan nama channel sama; jenis pertemuan hanya dipetakan pada perkuliahan | Uji >1.000 baris, satu sumber state, dan aturan daring semua kategori | Data terpotong, request/subscription duplikat, status tak konsisten |
| [UsersPage](../src/Pages/dashboard/UsersPage.jsx) | Beberapa fetch mengabaikan error/berbagi loading; object URL preview tidak direvoke | Ownership loading, feedback error, lifecycle preview teruji | Loading kurang akurat, potensi kebocoran memori |
| [SettingsPage](../src/Pages/dashboard/SettingsPage.jsx) | Route mengizinkan admin, komponen menolak; save simulasi | Konfirmasi permission/persistence terpisah | Akses tidak konsisten, preferensi tidak persisten |
| [MyTicketsPage](../src/Pages/dashboard/MyTicketsPage.jsx) | Query tidak memfilter pemilik di client | Verifikasi RLS sebelum memilih filter | Makna my tickets bergantung policy backend |

## Regression Check

PASS di bawah hanya untuk bukti yang disebutkan. NOT VERIFIED tidak disamakan
dengan PASS/FAIL UI. Sesi test dan dataset staging tidak tersedia dalam pekerjaan
ini; CRUD produksi tidak dijadikan tes.

| Modul | Bukti otomatis | End-to-end |
| --- | --- | --- |
| Sidebar | PASS: SSR identik 192 kombinasi; tes menu | NOT VERIFIED: klik/browser |
| Dashboard | PASS: parser/helper dan build | NOT VERIFIED: KPI/grafik live |
| Jadwal | PASS: helper status/label, build | NOT VERIFIED: tab/tanggal/realtime |
| Jadwal Admin | PASS: paging, error contract, parsing, lookup/konflik/import helpers | NOT VERIFIED: CRUD/import/export lengkap |
| Monitor Setting | Build PASS, source tidak berubah | NOT VERIFIED: upload/delete/storage |
| Ruangan | PASS: query, booking shape/order, null/error | NOT VERIFIED: statistik/filter/realtime live |
| Master Data | Build PASS, source tidak berubah | NOT VERIFIED: CRUD/search/filter/pagination |
| Users | Build PASS, hanya debug log dihapus | NOT VERIFIED: CRUD/role/upload |
| Monitor Jadwal | PASS: parser, merge sesi, jadwal selesai | NOT VERIFIED: rotasi/polling browser |
| Authentication | Source tidak berubah; build PASS | NOT VERIFIED: OTP/password/MFA/logout |
| Authorization | PASS: allowlist/menu | NOT VERIFIED: route/RLS live |
| Honor Dosen | PASS: strata/periode/perhitungan | NOT VERIFIED: export/akses live |
| CRUD / Search / Filter | Query dan JSX yang dipindahkan dipertahankan | NOT VERIFIED: interaksi penuh |
| Ticketing / Settings / Notifications | Notification tests PASS; build/route tetap | NOT VERIFIED: interaksi/persistence |

## Technical Validation

| Check | Baseline | Sesudah refactor |
| --- | --- | --- |
| Type-check | NOT AVAILABLE | PASS, empat modul JSDoc sesuai konfigurasi |
| Lint | PASS | PASS |
| Build | PASS | PASS; warning chunk XLSX tetap |
| Tests | PASS, 48 | PASS, 65 |
| Ekivalensi kode | Snapshot baseline | PASS: delapan definisi/blok query memiliki AST executable identik |
| Sidebar SSR | Snapshot baseline | PASS: markup identik pada 192 kombinasi |
| Dependency security | npm audit exit 1, 43 temuan | Tidak diperbaiki dalam refactor ini |

Tes memakai node:test existing dan stub query, tanpa framework baru. Expectation
awal tes Zoom gagal; kode baseline membuktikan bug lama, sehingga expectation
karakterisasi disesuaikan tanpa mengganti parser.

## Behavior Regression

**NO KNOWN BUSINESS LOGIC REGRESSION** dalam cakupan tes/pemeriksaan sumber.
Bukan klaim zero regression untuk seluruh operasi produksi. Tidak ada E2E yang
diklaim PASS tanpa dijalankan.

## Recommended Future Improvements

1. **P0/P1:** triage advisory dependency, RLS dan backend admin. Jangan menambah
   secret browser sebagai workaround.
2. **P1:** dataset staging dan tes login/role/CRUD/search/filter/pagination,
   tanggal, import/undo dan monitor; perbaikan auth dalam scope terpisah.
3. **P1:** pecah form/mutasi/import besar setelah baseline interaksi tersedia.
   Jangan menyatukan query/mapping yang berbeda untuk merapikan kode.
4. **P2:** perluas strict checking dan generate Supabase types dari schema nyata;
   jangan menebak kolom atau menutupi masalah dengan any.
5. **P2:** verifikasi cleanup react-icons (tanpa import sumber) dan dependency
   langsung react-router (kode mengimpor react-router-dom). xlsx dan xlsx-js-style
   dipakai untuk import/export berbeda; tidak dihapus otomatis.
6. **P3:** ukur duplicate fetch/dashboard/ruangan dan beban workbook sebelum
   caching/chunking; belum ada benchmark latency.
7. **CI/CD:** job PR terpisah: checkout, setup Node yang dipin, npm ci, type-check,
   lint, test, build. Audit FTP cleanup dan env sebelum mengubah deployment.
8. **SaaS:** tenant isolation, provisioning, audit trail dan server authorization
   memerlukan desain backend/schema; tidak menambah migration, tenant filter,
   microservices atau framework kompleks pada refactor ini.
