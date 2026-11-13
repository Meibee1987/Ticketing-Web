# Overall Status

**PARTIAL** — automated validation PASS; critical end-to-end flows belum terverifikasi.

## Role & Authorization Regression — current round

Klarifikasi scope pengguna: **Ticketing sementara tidak digunakan**.
Route `/dashboard/ticketing`, `/dashboard/tickets`, dan `/dashboard/my-tickets`
berstatus **OUT OF SCOPE untuk acceptance fitur aktif**. Hasil pengujian yang
sudah dilakukan tetap disimpan sebagai histori, bukan syarat kelulusan fitur
KIS yang sedang digunakan. Tidak ada penghapusan/penonaktifan route, perubahan
permission, atau perubahan source. Out of scope bukan bukti backend aman dan
bukan berarti endpoint secara teknis telah dinonaktifkan.

Super Admin Authentication: **PASS** (live OTP/session/refresh/local logout,
dengan batas server revocation pada bagian autentikasi di bawah).

Admin Role: **PASS** untuk session, sidebar dan route guard client yang diuji;
login OTP diselesaikan manual pengguna. Ini bukan bukti enforcement backend/RLS.
User Role: **PASS** untuk session, sidebar dan route guard client yang diuji;
request OTP HTTP 200, login diselesaikan manual pengguna.
Pengguna menyatakan akun yang sama telah diubah rolenya dari Admin menjadi User
oleh pengguna sendiri di luar pengujian agent. Agent tidak mengubah role atau
data. Login baru menampilkan role User dan tidak membawa akses Admin sebelumnya.
Ini bukan pengujian dua akun independen.
Dosen Role: **OUT OF SCOPE untuk acceptance web**, sesuai klarifikasi pengguna:
Dosen di web dipakai sebagai master data; autentikasi Dosen direncanakan untuk
mobile apps. Tidak perlu menautkan auth_id atau memperbaiki login Dosen demi
meluluskan regresi web. Master data Dosen sendiri belum diuji CRUD.
Sidebar Permission: **PASS untuk Admin/User yang diuji di web**, sesuai source.
Protected Routes: **PASS untuk Admin/User dalam cakupan route yang diuji**.
Backend/RLS tetap NOT VERIFIED. Ini bukan kelulusan seluruh authorization KIS.

Observasi historis akun profil Dosen tetap disimpan: auth_id kosong, login
menghasilkan fallback User dan Ticketing terbuka. Hasil tersebut bukan lagi
kriteria kegagalan role Dosen untuk web setelah klarifikasi scope. Fallback
profil yang tidak ditemukan tetap merupakan catatan pengamanan autentikasi
tersendiri; bukan alasan menambahkan provisioning Dosen di web atau menyatakan
authorization backend sudah aman. Tidak ada source/data yang diubah.

Matrix di bawah mencatat expected source dan menandai hasil live yang tersedia.
Kolom Dosen merekam kontrak source dan observasi historis saja; bukan target
acceptance login web atau spesifikasi authorization aplikasi mobile.
Baris Ticketing juga bersifat historis/source saja karena fitur sementara tidak
digunakan; label FAIL historis pada akses Ticketing akun profil Dosen tidak
menjadi blocker acceptance fitur web aktif berdasarkan scope terbaru.
Acuan: [routes](../src/App.jsx), [role guard](../src/components/RoleProtectedRoute.jsx),
[sidebar menu](../src/constants/navigation.js), dan
[email allowlist](../src/constants/accessControl.js).

| Feature / Route | Super Admin | Admin | User | Dosen |
| --- | --- | --- | --- | --- |
| `/dashboard` | Allow; live PASS | Allow; live PASS | Allow; live PASS | Terbuka live sebagai fallback User; resolusi Dosen FAIL |
| `/dashboard/jadwal`, `/dashboard/ruangan` | Allow | Allow; live PASS | Allow; live PASS | Allow |
| `/dashboard/jadwal-admin` | Allow | Allow; live PASS | Deny; live PASS | Deny |
| `/dashboard/database` | Allow | Allow; live PASS | Deny; live PASS | Deny |
| `/dashboard/monitor-settings` | Allow | Allow; live PASS | Deny; live PASS | Deny |
| `/dashboard/users` | Allow | Deny; live PASS | Deny; live PASS | Ditolak live sebagai fallback User; role Dosen efektif belum diuji |
| `/dashboard/settings` | Allow | Route allow, component deny; live sesuai existing | Deny; live PASS | Deny |
| `/dashboard/ticketing` | Allow (source) | Allow; live PASS | Allow; live PASS | Deny expected; live terbuka sebagai fallback User: FAIL |
| `/dashboard/tickets`, `/dashboard/my-tickets` | Allow | Allow; live PASS | Allow; live PASS | Deny expected; live NOT VERIFIED pada akun profil Dosen |
| `/dashboard/honor-dosen` | Email allowlist only | Email allowlist only; live Deny sesuai akun uji | Email allowlist only; live Deny sesuai akun uji | Email allowlist only |
| `/jadwal-monitor` | Public | Public | Public | Public |
| Sidebar Dashboard / Jadwal / Ruangan / Monitor Jadwal | Visible | Visible; live PASS | Visible; live PASS | Visible live, tetapi role efektif User |
| Sidebar Jadwal Admin / Monitor Setting / Master Data | Visible | Visible; live PASS | Hidden; live PASS | Hidden live, tetapi role efektif User |
| Sidebar Users | Visible | Hidden; live PASS | Hidden; live PASS | Hidden live, tetapi role efektif User |
| Sidebar Honor Dosen | Email allowlist only | Hidden; live sesuai akun uji | Hidden; live sesuai akun uji | Email allowlist only |
| Sidebar Settings / Ticketing | Tidak didefinisikan | Tidak didefinisikan; live sesuai | Tidak didefinisikan; live sesuai | Tidak didefinisikan |

Semua sel tanpa label live merupakan expected source saja. Route deny pada
role terautentikasi menampilkan Akses Ditolak; tanpa session mengarah `/login`.
Dashboard/Jadwal/Ruangan memerlukan session tanpa pembatas role tambahan.
Honor Dosen bergantung email allowlist, bukan otomatis diperbolehkan role dosen.

Klasifikasi awal **EXISTING BEHAVIOR**: Settings mengizinkan Admin pada route
tetapi komponen hanya menerima Super Admin, sesuai known issue. Hidden sidebar
tidak sama dengan route denial, dan guard client bukan bukti enforcement RLS.
Pada persiapan belum ada temuan baru. Hasil live Dosen di bawah menambahkan
SECURITY FINDING pada penentuan role client. Ketiadaan akun/OTP sendiri tidak
disamakan dengan FAIL aplikasi.

### Dosen — role resolution FAIL dan temuan authorization client

Request OTP untuk email yang diisi pengguna menghasilkan HTTP 200; pengguna
memasukkan kode dan menekan masuk sendiri. Agent melanjutkan pada dashboard,
tanpa membaca kode. Session SDK tersedia tanpa error, tetapi role UI `user`;
`dosen`, Admin dan Super Admin tidak tampil. Sidebar hanya Dashboard, Jadwal,
Ruangan dan Monitor Jadwal.

Pemeriksaan **read-only** memakai session existing, mengembalikan hanya status
dan nama role tanpa email, ID, token atau payload sesi:

- Lookup Teknisi dan dosen berdasarkan `auth_id` akun aktif tidak memberikan
  profil pada `.single()`; keduanya mengembalikan `PGRST116`.
- Lookup dosen berdasarkan email session menemukan profil dengan role `dosen`,
  tetapi `auth_id` **kosong**. Teknisi berdasarkan email tidak memberikan profil.
- Cache `userRole` tidak ada saat diperiksa. [AuthContext](../src/contexts/AuthContext.jsx)
  melakukan lookup berdasarkan auth_id dan menggunakan DEFAULT_ROLE `user`
  ketika kedua lookup tidak menghasilkan profil. Ini cocok dengan hasil live;
  bukan bukti role Admin lama masih tersimpan.

Reload mempertahankan session tetapi tetap role User, bukan Dosen. URL langsung
`/dashboard/ticketing` menampilkan halaman Ticketing, bukan Akses Ditolak;
source hanya mengizinkan Super Admin/Admin/User pada route itu, sehingga profil
Dosen yang gagal di-resolve mendapat akses route User. `/dashboard/users`
tetap ditolak. Route Dosen lain tidak diberi PASS karena role efektif Dosen
tidak pernah terbentuk; akses data/RLS tidak dinyatakan lolos atau gagal.

Klasifikasi:

- **EXISTING BEHAVIOR:** fallback DEFAULT_ROLE User pada lookup profil gagal
  sudah ada di AuthContext; tidak diubah pada pengujian.
- **SECURITY FINDING (client authorization):** lookup role gagal memberi role
  User dengan akses Ticketing yang tidak diizinkan untuk role Dosen pada source.
  Bukti mencakup pembukaan halaman, bukan bypass RLS atau kebocoran data backend
  yang terkonfirmasi. Membutuhkan keputusan terpisah tentang penanganan profil
  tanpa relasi auth_id; jangan otomatis memberi status aman karena menu sesuai.
- **REGRESSION belum terkonfirmasi terhadap baseline live:** versi OTP sebelum
  perubahan (`705467f`) mencoba menautkan auth_id setelah verify; helper sekarang
  tidak menulis auth_id sesuai scope perubahan sebelumnya. Perbedaan ini relevan
  terhadap profil tanpa tautan dan perlu ditinjau sebagai kemungkinan regresi
  provisioning/linking. Tidak ada replay baseline dengan akun ini atau bukti
  keberhasilan update/RLS sebelumnya; tidak menyebut masalah ini semata tooling
  atau menutupnya sebagai bug lama tanpa bukti.

Logout lokal PASS: kembali `/login`, session tidak ada tanpa error, dan membuka
`/dashboard` lagi redirect ke login. Tidak ada CRUD, penautan auth_id, perubahan
role/permission, schema, AuthContext atau source. Browser ditinggal logout.
Temuan didokumentasikan saja sesuai batas tugas. **SAFE TO MERGE tetap NO.**

### User — hasil live

Pengguna menyelesaikan login OTP secara manual pada akun existing yang rolenya
diubah oleh pengguna sendiri. Session SDK tersedia tanpa error. UI menampilkan
`user`, tidak menampilkan Admin/Super Admin/Dosen. Sidebar tepat berisi
Dashboard, Jadwal, Ruangan dan Monitor Jadwal. Menu admin dan Honor Dosen
tidak muncul; email akun ini bukan akun allowlist yang diuji untuk Honor Dosen.

Navigasi URL langsung ke Jadwal Admin, Master Data, Monitor Setting, Users,
Settings dan Honor Dosen menampilkan Akses Ditolak. Dashboard, Jadwal, Ruangan,
Ticketing, All Tickets dan My Tickets dapat dibuka sesuai role guard existing.
Klasifikasi **EXISTING BEHAVIOR**: route ticketing dapat diakses User walaupun
tidak tercantum pada sidebar; ini sesuai source, bukan regresi atau bukti bypass.
Pembacaan data/policy per pemilik pada My Tickets tidak diaudit di putaran ini.

Reload penuh dashboard mempertahankan session dan role `user`; role Admin tidak
muncul lagi. Logout mengarah ke login, session lokal hilang tanpa error, dan
navigasi langsung `/dashboard` sesudahnya redirect `/login`. Role sebelumnya
tidak terbawa pada siklus logout/login/refresh yang diuji ini; bukan pembuktian
seluruh kemungkinan race/cache. Tidak ada REGRESSION/SECURITY FINDING baru yang
terkonfirmasi. Authorization backend/RLS tetap NOT VERIFIED.

Browser ditinggal pada login untuk pengujian Dosen. Tidak ada CRUD, perubahan
role oleh agent, refactor, atau perubahan source. OTP/token/payload session
tidak dicatat; hasil SDK hanya berupa boolean.

### Admin — hasil live

Pengguna menyelesaikan login OTP sendiri dan menyerahkan browser di dashboard.
Agent tidak membaca kode dan tidak mengklaim mengamati HTTP verify pada login
Admin. Sesudah handoff: session tersedia tanpa error; UI role `admin`, bukan
`super admin`, `user`, atau `dosen`. Sidebar berisi tepat Dashboard, Jadwal,
Jadwal Admin, Monitor Setting, Ruangan, Master Data, dan Monitor Jadwal; tidak
ada Users atau Honor Dosen, sesuai source dan email akun uji.

Navigasi URL langsung: Dashboard, Jadwal, Jadwal Admin, Ruangan, Master Data,
Monitor Setting, Ticketing, All Tickets dan My Tickets merender heading halaman.
Users dan Honor Dosen menampilkan Akses Ditolak. Settings menampilkan penolakan
khusus Super Admin dari komponen. Penolakan Settings diklasifikasikan
**EXISTING BEHAVIOR**, sesuai known issue; tidak diubah untuk membuat test PASS.
Tidak menekan kontrol tambah/edit/delete/import/upload atau pengaturan.

Sebelum membuka Monitor Setting, dipastikan legacy slides lokal tidak memicu
migrasi otomatis; tidak menghapus storage atau menjalankan migrasi. Halaman
dibuka hanya untuk membuktikan akses. Ini bukan pengujian CRUD/storage.

Reload penuh dashboard mempertahankan session dan role Admin. Tombol Logout
mengarah ke `/login`; pemeriksaan SDK berikutnya memastikan session lokal tidak
ada. Navigasi langsung `/dashboard` setelah logout kembali ke `/login` dan form
Kirim Kode OTP tampil. Browser ditinggal di login untuk akun User berikutnya.
Tidak ada REGRESSION atau SECURITY FINDING baru yang terkonfirmasi dari hasil
guard UI ini. **RLS/backend authorization tetap NOT VERIFIED**; menu tersembunyi
dan route guard client tidak membuktikan pembatasan query langsung.

### Admin — histori percobaan request OTP

Catatan berikut mendahului hasil live PASS di atas; status NOT VERIFIED di
catatan historis tidak menggantikan hasil terbaru.

Pada handoff input kode berikutnya, tombol Verifikasi & Masuk tidak ditemukan
dan pemeriksaan menunjukkan browser telah kembali ke langkah email, tanpa
session. Tidak ada bukti request verify atau kegagalan kode OTP. Penyebab
perubahan state belum diketahui; **TOOLING LIMITATION / handoff state belum
terisolasi**, bukan REGRESSION yang terkonfirmasi. Satu pengiriman ulang
menghasilkan HTTP 200 dan langkah Verifikasi OTP kembali tampil. Menunggu
kode terbaru dimasukkan manual; Admin Role tetap NOT VERIFIED.

Pembaruan pengulangan: setelah server lokal dijalankan kembali dan pengguna
mengisi email existing, satu klik Kirim Kode OTP menghasilkan POST
`/auth/v1/otp` HTTP 200. Pesan sukses dan langkah Verifikasi OTP tampil; pesan
penolakan registrasi tidak tampil. Berhenti untuk input kode manual pengguna.
Ini **PASS untuk request OTP**, belum PASS Admin Role: role belum diobservasi
sesudah login. OTP tidak dibaca atau dicatat. Catatan kegagalan pertama di bawah
dipertahankan sebagai histori; penyebab spesifiknya belum terisolasi.

Pengguna memasukkan email akun Admin langsung di browser. Agent menekan Kirim
Kode OTP sekali. Input terisi dan valid menurut form, tidak ada cooldown, tetapi
UI menampilkan “Email belum terdaftar atau belum di-assign role. Hubungi admin
untuk mendaftarkan email Anda.” Tidak teramati POST `/auth/v1/otp` dalam jendela
observasi 20 detik; langkah Verifikasi OTP dan pesan sukses tidak tampil.

Klasifikasi: **EXISTING BEHAVIOR** pada gerbang registrasi existing, belum cukup
bukti untuk menyebut REGRESSION atau SECURITY FINDING. Helper melakukan lookup
Teknisi kemudian dosen (dosen harus memiliki roles_id); hasil lookup/error yang
tidak memenuhi syarat dapat berujung pesan yang sama. Penyebab spesifik seperti
email tidak cocok, profil tidak tersedia, duplicate row, atau pembatasan query
belum dibuktikan. Tidak mengubah profil, role, policy, atau source untuk melewati
gerbang ini. Memerlukan email Admin existing yang memenuhi lookup existing atau
konfirmasi pengguna terhadap akun yang dimaksud. OTP tidak dikirim ulang.

Hasil ini tidak mengubah PASS Super Admin Authentication. Admin/User/Dosen,
sidebar lintas role, dan protected route lintas role tetap NOT VERIFIED.

Sebelum membuka Monitor Setting sebagai role yang diizinkan, periksa bahwa tidak
ada legacy slides lokal yang memicu migrasi otomatis (existing behavior).
Jika berpotensi menulis data, lewati halaman tersebut tanpa menghapus storage
atau mengubah source. Tidak ada CRUD/import atau perubahan permission yang
diizinkan pada putaran ini. Status CRUD/import/staging tetap seperti sebelumnya.
**SAFE TO MERGE seluruh KIS tetap NO.**

## Live OTP regression verification

Pembaruan 2026-11-09: pengguna secara eksplisit mengizinkan environment aktif
hanya untuk autentikasi, role lookup existing, dan pembukaan dashboard.
Pengguna mengonfirmasi login sebelumnya memakai OTP email, bukan password.
Pengulangan kemudian dimulai dari `/login`: pengguna mengisi email existing,
agent menekan Kirim Kode OTP, lalu pengguna memasukkan kode dari inbox secara
manual tanpa mengirimkannya ke chat. Agent menekan Verifikasi & Masuk tanpa
membaca input kode dan mengamati hasil live hingga logout.
Identitas staging belum dibuktikan; izin ini tidak memperluas pengujian ke CRUD.
Tidak ada source aplikasi yang diubah pada putaran live ini.

| Pemeriksaan live | Status | Bukti dan batas |
| --- | --- | --- |
| OTP request | PASS | Pengulangan live: klik Kirim Kode OTP menghasilkan POST auth OTP HTTP 200; pesan sukses dan langkah Verifikasi OTP tampil |
| OTP diterima di inbox | PASS dengan input manual pengguna | Pengguna memasukkan kode sendiri; kode diterima endpoint verify; inbox tidak dibuka agent |
| OTP verification | PASS | POST auth verify HTTP 200; kode tidak dibaca, disalin, atau dicatat |
| Session creation | PASS | Sesudah verify, SDK existing melaporkan session dengan user tersedia dan tanpa error; hanya boolean dikembalikan |
| Role resolution | PASS | Sesudah login baru UI menampilkan `super admin`; tetap tampil setelah reload; ini bukti resolusi role client existing, bukan audit RLS |
| Dashboard redirect | PASS | Setelah klik Verifikasi & Masuk, browser berpindah dari `/login` ke `/dashboard`, heading Dashboard kemudian tampil |
| Protected route | PASS | Dashboard dapat diakses saat bersesi; sesudah logout navigasi langsung ke `/dashboard` kembali ke `/login` |
| Session refresh | PASS | Reload penuh mempertahankan session, dashboard dan role; bukan uji expiry/rotasi refresh token |
| Local logout | PASS | Tombol Logout mengarah ke `/login`; SDK melaporkan tidak ada session dan tanpa error; form login tampil |
| Server logout revocation | NOT VERIFIED | Satu percobaan observasi ulang tidak memperoleh hasil network yang dapat dilaporkan karena konteks tool dihancurkan oleh navigasi; TOOLING / NETWORK OBSERVATION LIMITATION |
| Protected route after logout | PASS | Navigasi langsung ke `/dashboard` sesudah logout redirect ke `/login` dan form Kirim Kode OTP tampil |
| OTP salah ditolak | NOT VERIFIED live | Tidak meminta atau menebak kode pada akun existing |
| Unregistered email blocked | NOT VERIFIED live | Tidak mengirim permintaan untuk email lain atau membuat akun |

Urutan pengulangan: request OTP (HTTP 200); jeda untuk kode manual; verify
(HTTP 200); observasi redirect, dashboard, role dan boolean session; reload;
pastikan session/role/dashboard tetap ada; buka sidebar responsif; klik Logout;
setelah navigasi stabil periksa session tidak ada; navigasi langsung ke protected
dashboard; pastikan redirect login dan form login tampil. Browser ditinggal pada
halaman login tanpa session. Tidak ada CRUD atau mutasi data aplikasi.

Observasi console/network yang tidak diperbaiki:

- Realtime WebSocket timeout dan `CHANNEL_ERROR` tercatat pada sesi browser.
  Ini bukti gangguan koneksi realtime, bukan bukti kegagalan OTP; penyebab
  network/backend belum diisolasi (**ENVIRONMENT / TOOLING LIMITATION** sementara).
- Beberapa request HEAD lookup count `dosen`/`ruangan` dibatalkan (`ERR_ABORTED`)
  dan chart melaporkan dimensi sementara negatif. Tidak membuktikan regresi
  tanpa baseline runtime dan diagnosis lanjutan; dashboard tetap tampil.
- Pada putaran sebelumnya request logout server dibatalkan. Pada pengulangan
  ini observasi network dipasang sebelum satu klik Logout, tetapi pemeriksaan
  SDK dalam pemanggilan tool yang sama terhenti dengan `Execution context was
  destroyed, most likely because of a navigation`. Hasil network tidak sempat
  dikembalikan dan tidak ditemukan event logout pada snapshot berikutnya.
  Setelah halaman stabil, pemeriksaan terpisah membuktikan session lokal hilang
  dan protected route menolak akses. Server logout tetap NOT VERIFIED:
  **TOOLING / NETWORK OBSERVATION LIMITATION**, bukan REGRESSION. Implementasi
  logout tidak diubah dan tidak dilakukan percobaan logout tambahan.
- Percobaan klik awal Logout tidak berhasil karena sidebar di luar viewport;
  setelah tombol Buka navigasi digunakan, klik normal berhasil. Ini kondisi
  navigasi responsif, bukan bug logout. Eksekusi pemeriksaan awal juga mendapat
  `URL is not defined` pada runtime alat; pemeriksaan diperbaiki tanpa mengubah
  aplikasi dan hasil setelah reload berhasil diperiksa.

Unit test OTP sebelumnya memakai stub; hasilnya tidak membuktikan pengiriman
email atau login live. Tidak ada OTP, access token, refresh token, atau payload
sesi yang sengaja diekstrak atau ditulis dalam laporan. Hasil pemeriksaan SDK
dibatasi boolean; URL realtime dengan query key tidak disalin ke laporan.
**CRUD dan E2E staging tetap NOT VERIFIED. SAFE TO MERGE: NO.**

Bagian di bawah adalah catatan historis putaran sebelumnya. Untuk hasil live
terbaru, gunakan tabel pada bagian ini; status lama tidak menggantikan bukti baru.

## Pembaruan permintaan pengujian staging

Pengguna menyatakan staging telah disediakan, tetapi identitas URL staging dan
production serta lokasi akun TEST belum tersedia dalam konteks yang dapat
diverifikasi. Konfigurasi URL aktif sama dengan commit `705467f`, yang pada
validasi sebelumnya belum diketahui sebagai staging. Nama variabel staging
atau kredensial test tidak ditemukan pada environment proses. Kesamaan URL
tersebut bukan bukti bahwa URL itu production, juga bukan bukti staging.
Karena instruksi melarang akses production, browser dan backend tidak diakses
pada putaran ini sampai target dan akun dapat diverifikasi.

# Staging Environment

Environment: **STAGING dinyatakan tersedia oleh pengguna; target aktif NOT VERIFIED**.
URL staging dan pembeda dari production belum dapat dibuktikan secara lokal.
Key aktif didekode sebagai role `anon`; nilai key dan URL tidak dicatat di sini.
Akun TEST: **NOT VERIFIED**. Prefix data yang akan digunakan: `E2E-` / `TEST-`;
belum ada data yang dibuat. Production mutated: **NO**, berdasarkan tindakan
pada putaran ini; tidak ada koneksi aplikasi ke Supabase atau mutasi backend.

# Authentication E2E

| Flow | Status |
| --- | --- |
| Password valid dan invalid | NOT VERIFIED — target dan akun TEST belum terverifikasi |
| OTP | NOT VERIFIED — mailbox test dan target belum terverifikasi; tidak mengirim OTP |
| Logout | NOT VERIFIED — tidak ada sesi test; bukan FAIL aplikasi |
| Protected route tanpa sesi, redirect, persistence, expiry | NOT VERIFIED pada putaran staging ini |

# Role Matrix

| Feature | Super Admin | Admin | User | Dosen |
| --- | --- | --- | --- | --- |
| Login / sidebar / route / protected route / action | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| Authorization backend / RLS dengan query akun uji | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |

Tes unit menu sebelumnya tidak menggantikan autentikasi role atau enforcement
backend. Tidak ada hasil keamanan RLS yang disimpulkan dari menu tersembunyi.

# Import

**NOT VERIFIED** untuk upload, parsing UI, preview, validation, conflict,
import, database result, undo, dan cleanup staging. Tidak ada spreadsheet
production yang dibuka. Tes helper impor sebelumnya tetap PASS terbatas.

# Console / Network Errors

**NOT VERIFIED** untuk halaman staging: tidak ada browser atau request ke
backend yang dijalankan pada putaran ini. Kegagalan replay recorder dan watcher
Windows pada putaran terdahulu terdokumentasi di bawah sebagai environment/tool
issue, bukan otomatis regresi aplikasi.

# Security Findings

- **EXISTING SECURITY/ARCHITECTURE ISSUE:** operasi browser
  `auth.admin.deleteUser` dengan anon key dan urutan penghapusan terkait telah
  dicatat dalam laporan refactor; tidak direproduksi pada backend.
- **SECURITY FINDING, belum diverifikasi live:** enforcement RLS, batas antar
  role dan akses data langsung belum dibuktikan. Tidak menyimpulkan adanya
  akses tidak sah tanpa hasil query.
- Temuan dependency dan `.env` tracked existing tetap perlu triage terpisah.

# Data Cleanup

Tidak ada record, akun, slide, avatar, atau file import yang dibuat pada
putaran ini; tidak ada cleanup yang diperlukan. Keberadaan data TEST yang
dibuat di luar sesi ini tidak diperiksa atau dihapus. Setelah staging dan akun
diverifikasi, catat ID setiap objek yang dibuat lalu hapus hanya objek itu dan
verifikasi hasil cleanup; prefix saja bukan bukti kepemilikan objek tes.

# Technical Validation

Hasil rerun pada putaran permintaan staging ini, Node 24.18.1 / npm 11.16.0:

| Perintah | Status | Hasil |
| --- | --- | --- |
| npm ci | PASS | Exit 0; warning 43 vulnerabilities dan esbuild install-script policy existing |
| Type-check | PASS | Exit 0; cakupan empat modul pada konfigurasi existing |
| Tests | PASS | 65 pass, 0 fail, 0 skip |
| Lint | PASS | Exit 0; warning baseline-browser-mapping lama |
| Build | PASS | Exit 0; warning chunk XLSX besar existing |

Kelima syarat teknis terpenuhi. Ini bukan bukti E2E. Tidak ada perubahan source
aplikasi, schema, route, permission, auth, atau business logic pada putaran ini.

# SAFE TO MERGE

**NO** — critical flow staging, RLS, CRUD, import dan cleanup belum diuji.
Pengujian dapat dilanjutkan setelah lokasi konfigurasi staging, identitas project
staging versus production, dan akun TEST untuk empat role tersedia secara aman.
Jangan menaruh password atau service-role key di laporan atau browser.

Validasi 2026-11-09 (Asia/Jakarta), commit `705467f`, Node `24.18.1`, npm
`11.16.0`, Windows. Working tree bersih sebelum validasi. Acuan behavior:
[laporan refactor](KIS_REFACTOR_REPORT.md), [README](../README.md),
[package.json](../package.json), dan source existing.

Tidak ada perubahan source aplikasi, business logic, route, permission, auth,
API, schema, atau UI. Tidak ada perbaikan known issue, migration, deployment,
OTP, upload, atau mutasi database yang dijalankan.

Environment lokal memuat URL Supabase remote dan key ber-role `anon`.
Identitas production/staging **belum dikonfirmasi**; localhost bukan bukti
database staging. Semua CRUD backend dihentikan sebagai langkah pengamanan.
Akun uji, dataset staging, dan penerima OTP nonproduksi belum tersedia.

Status bukti dibedakan: PASS unit/contract bukan PASS E2E; NOT VERIFIED berarti
belum diuji, bukan kegagalan aplikasi. Bukti SSR/AST dari laporan sebelumnya
tidak diklaim sebagai pengujian browser baru.

# Automated Validation

| Pemeriksaan | Hasil | Bukti / batas |
| --- | --- | --- |
| `npm ci` | PASS | Exit 0; 254 paket dipasang, 255 diaudit; lockfile tidak berubah |
| Type-check: `npm run type-check` | PASS | Exit 0; hanya empat modul dalam [konfigurasi](../jsconfig.typecheck.json), bukan seluruh aplikasi |
| Tests: `npm test` | PASS | Exit 0; 65 passed, 0 failed, 0 skipped |
| Lint: `npm run lint` | PASS | Exit 0; warning data baseline-browser-mapping lama |
| Build: `npm run build` | PASS | Exit 0; 2.550 modul; warning XLSX 870,07 kB minified |
| Runtime standalone | PASS terbatas | Tiga HTTP probe lokal + pengulangan tes; 4 assertion PASS; cleanup proses sukses |

[Eval plan](../.tsupgrader/runtime-validation/eval-plan.json) dan
[hasil runtime](../.tsupgrader/runtime-validation/standalone-result.json)
menyimpan pemeriksaan localhost `/login-password`, `/login`, `/jadwal-monitor`:
HTTP 200. HTTP probe hanya menerima shell HTML Vite; tidak mengeksekusi React,
memvalidasi redirect, login, data Supabase, atau interaksi UI. Tidak ada browser
E2E backend yang dijalankan. Setelah instruksi lanjutan, perekaman browser
dicoba menggunakan toolchain terisolasi dan pembatasan jaringan localhost.
Percobaan `unauthenticated-login-navigation` melihat form OTP di `/login`,
tetapi dibatalkan dengan `no_meaningful_actions`: recorder tidak menyediakan
navigasi URL dan snapshot tidak memiliki link ke password/dashboard.
Ini keterbatasan rencana/alat, bukan kegagalan route aplikasi; tidak ada spec
PASS untuk alur tersebut dan redirect dashboard belum terbukti.
Percobaan terpisah `password-login-form` membuka `/login-password`, mengisi
email sintetis `regression@example.invalid` dan password sintetis tanpa submit.
Kedua field tetap terlihat pada snapshot interaktif; toggle password tidak
terlihat pada snapshot. Namun assertion final `assert-visible` gagal ketika
automatic replay dengan `interaction_failed` (exit 1), tanpa detail langkah
yang gagal. Tidak ada passing spec yang dipromosikan. Observasi interaktif ini
tidak dihitung PASS E2E. Wrapper menyatakan cleanup otomatis pada kegagalan
tersebut. Penyebab replay belum terisolasi; bukan bukti regresi aplikasi.

Server rekaman pertama juga mengalami `EBUSY` pada watcher file request
recorder di Windows. Percobaan server berikutnya mencapai HTTP 200. Proses
Vite milik validasi dihentikan dan sesi terminal selesai. Setelah percobaan
rekaman, fallback runtime dijalankan kembali: 4 assertion PASS, cleanup sukses.
Setup pada plan kosong karena `npm ci` sudah dijalankan terpisah sebelumnya.
Runner runtime gagal mem-parsing hitungan Node tests (`parseFailed: true`);
assertion lulus berdasarkan exit 0. Angka 65 berasal dari output langsung
`npm test`, bukan field hitungan nol pada hasil runtime.

Warning instalasi: 43 vulnerabilities (28 high, 12 moderate, 3 low), sama
dengan laporan sebelumnya; `esbuild` install-script policy warning. Tidak
menjalankan audit fix, upgrade dependency, atau mengubah approval scripts.

# Authentication

| Flow | Status | Yang masih harus dibuktikan |
| --- | --- | --- |
| 1. Login password | NOT VERIFIED E2E | Form terlihat dan menerima input sintetis secara interaktif; replay gagal. Login sukses/invalid, sesi, redirect, reload, MFA belum diuji |
| 2. Login OTP | NOT VERIFIED E2E | Form terlihat secara interaktif; kirim/verifikasi/resend/expiry memerlukan mailbox test/sink; tidak mengirim OTP |
| 3. Logout | NOT VERIFIED E2E | Sesi aktif keluar, storage bersih, refresh/back tidak membuka halaman terlindungi, pergantian akun |

Review [Sidebar](../src/components/layout/Sidebar.jsx) menunjukkan logout
menunggu `signOut()` lalu navigasi `/login`. Review source bukan bukti pencabutan
sesi live. Risiko cache auth existing tetap dicatat, tidak diperbaiki.

# Authorization

Tes [navigation](../test/navigation.test.js) dan
[allowlist](../src/constants/accessControl.test.js) PASS. Review
[routes](../src/App.jsx), [auth guard](../src/components/ProtectedRoute.jsx),
dan [role guard](../src/components/RoleProtectedRoute.jsx) dilakukan.

| Role / kebutuhan | Bukti saat ini | E2E |
| --- | --- | --- |
| 4. Super admin | Unit menu mencakup Users dan menu admin | NOT VERIFIED: akun nyata, direct URL, RLS |
| 5. Admin | Unit menu admin tanpa Users | NOT VERIFIED: penolakan direct URL Users dan operasi backend |
| 6. User/dosen | Unit hanya Dashboard, Jadwal, Ruangan untuk email biasa | NOT VERIFIED: role nyata tersedia dan batas akses |
| 7. Sidebar per role | PASS unit urutan/visibility; Honor Dosen berdasarkan email allowlist independen role | NOT VERIFIED: render/klik/mobile/session switch |

Monitor Jadwal adalah link publik terpisah. Menyembunyikan menu bukan bukti
otorisasi server. Belum ada verifikasi RLS atau isolasi data antar akun.

# Dashboard

8. NOT VERIFIED E2E: KPI, chart, jadwal, notifikasi, realtime, dan kesesuaian
data backend. Build PASS dan tes helper/notification PASS tidak membuktikan
halaman tampil dan memuat data yang benar.

# Jadwal

9. NOT VERIFIED E2E: tiga kategori, data hari terpilih, detail dan realtime.
23. Status jadwal: tes helper monitor (jadwal selesai dipindah ke belakang)
dan jenis pertemuan PASS; transisi status UI berdasarkan jam belum diuji.
24. Date navigation: helper parsing/tanggal impor PASS; klik sebelum/sesudah,
hari ini, pergantian bulan/tahun, dan batas tengah malam Jakarta belum diuji.

# Jadwal Admin

10. NOT VERIFIED E2E. [Tes data reads](../test/dataReads.test.js) PASS untuk
paging 1.000 baris, urutan ID, response metadata, null, serta propagasi error.
Ini contract test dengan stub client, bukan query database nyata atau pagination
UI. Konflik/lookup/parsing impor memiliki tes PASS; submit form belum diuji.

# Ruangan

18. PASS terbatas pada delapan proyeksi query, mapping booking, null fallback,
dan labeled error dalam tes data reads. NOT VERIFIED E2E: statistik/list,
filter tanggal, status tersedia/terpakai, realtime, dan dataset >1.000 baris.

# Master Data

19. NOT VERIFIED E2E: tab dosen/angkatan/mata kuliah/ruangan, query URL,
search/filter/pagination, validasi form, penyimpanan dan pembacaan ulang.
Build PASS; tidak melakukan CRUD master data produksi.

# Users

20. NOT VERIFIED E2E: daftar, role assignment, pencarian, pagination, foto,
create/edit/delete. Tidak menghapus pengguna atau memanggil admin API.
Known issue browser `auth.admin.deleteUser` tetap terbuka.

# Monitor Setting

21. NOT VERIFIED E2E: daftar slide, upload, urutan, delete, error storage.
Review [source](../src/Pages/dashboard/MonitorSettings.jsx) memastikan bahwa
mount dapat memanggil migrasi legacy localStorage yang melakukan upload/insert.
Karena itu membuka halaman ini dengan sesi lama pun tidak otomatis read-only.
Pengujian berikutnya membutuhkan browser bersih dan staging terkonfirmasi.
Behavior ini sudah dijelaskan pada laporan refactor, bukan regresi baru.

# Monitor Jadwal

22. HTTP shell PASS; tes merge sesi, pemisahan sesi berbeda, urutan jadwal
selesai dan ruangan fisik PASS. NOT VERIFIED E2E: rendering jadwal/slides,
rotasi, polling/realtime, perubahan tanggal/jam, serta reconnect.

# CRUD

| Kebutuhan | Status | Skenario staging yang diperlukan |
| --- | --- | --- |
| 14. Create Jadwal | NOT VERIFIED / BLOCKED | Buat record khusus uji pada tiap kategori, cek konflik dan reload |
| 15. Edit Jadwal | NOT VERIFIED / BLOCKED | Edit record uji, cek field terkait dan persistensi setelah reload |
| 16. Delete Jadwal | NOT VERIFIED / BLOCKED | Cancel lalu confirm hanya record uji, cek daftar dan database |
| 17. Import Jadwal | NOT VERIFIED E2E / BLOCKED | Fixture XLSX sintetis, preview/error/conflict, submit, reimport/idempotensi dan undo sesuai behavior existing |

Tes parser/import/lookup/konflik PASS tidak membuktikan transaksi/RPC live.
Tidak menggunakan Google Sheets produksi sebagai dataset uji. Cleanup hanya
boleh menyasar ID yang dibuat pengujian di staging; tidak truncate/migration.

# Search / Filter / Pagination

| Kebutuhan | Status |
| --- | --- |
| 11. Search | NOT VERIFIED E2E: submit/reset, hasil kosong, query special character, query URL |
| 12. Filter | NOT VERIFIED E2E: kategori/status/tanggal/ruangan dan kombinasi filter |
| 13. Pagination | PASS contract database paging; NOT VERIFIED E2E: next/prev/page size, reset setelah filter, halaman terakhir |
| 25. Empty state | PASS null/empty contract data; NOT VERIFIED: tampilan kosong dan hasil pencarian nihil |
| 26. Loading state | NOT VERIFIED UI: delay request, spinner, disable submit, selesai setelah success/error |
| 27. Error state | PASS kontrak error service/import; NOT VERIFIED UI: auth/network/403/500, pesan, retry dan pemulihan |

Untuk melanjutkan, fixture perlu mencakup data kosong, lebih dari satu halaman,
lebih dari 1.000 jadwal untuk paging service, konflik, tiga kategori, dan
rentang waktu sebelum/saat/setelah jadwal. Simulasi error/delay dilakukan di
environment uji, tidak dengan merusak data atau permission produksi.

# Existing Bugs

Klasifikasi **EXISTING BUG** mengacu pada laporan refactor; tidak diperbaiki
atau ditutup hanya karena test PASS:

| Issue | Bukti / status |
| --- | --- |
| Parsing Zoom `Password: secret` menghasilkan `word:` | Tes karakterisasi existing PASS; bukan parser yang telah diperbaiki |
| Cache role tidak terikat authId; parse JSON fallback dapat melempar; race sesi | Known issue; reproduksi browser/pergantian akun belum dilakukan |
| Tanggal UTC/local Dashboard/Ruangan tidak konsisten dekat tengah malam | Known issue; boundary UI belum diuji |
| Ruangan tanpa paging, hook/subscription ganda, meeting type hanya sebagian kategori | Known issue; skala/realtime belum diuji |
| Users mengabaikan sebagian error, loading bersama, preview URL tidak direvoke | Known issue; failure injection belum dilakukan |
| Settings route admin tetapi komponen super admin; save simulasi | Known issue; tidak diubah |
| MyTickets bergantung RLS tanpa filter pemilik di client | Known issue; policy live belum diverifikasi |
| Browser admin deleteUser setelah hapus Teknisi | Known issue keamanan/fungsional; tidak direproduksi dengan user produksi |

Known security findings: 43 dependency advisories, env masih tracked, policy
backend belum terbukti, dan risiko workflow FTP tetap memerlukan tindak lanjut
terpisah. Tidak dianggap regresi baru hanya karena teramati lagi.

# New Regressions

**REGRESSION: tidak ditemukan dalam 65 tes dan pemeriksaan teknis yang dijalankan.**
Belum cukup bukti untuk menyimpulkan tidak ada regresi aplikasi secara menyeluruh.
Tidak ada perbandingan E2E sebelum/sesudah refactor pada backend yang sama.

**NEW ISSUE:** tidak ada defect aplikasi baru yang terkonfirmasi. Parser hasil
runtime tidak mengenali jumlah Node tests; ini keterbatasan alat validasi,
bukan kegagalan aplikasi. Replay form password gagal tanpa detail langkah;
dicatat sebagai kegagalan validasi yang belum terdiagnosis, bukan otomatis
REGRESSION. Watcher Windows `EBUSY` pada file recorder merupakan blocker
infrastruktur pengujian yang diamati pada sesi ini. Kekurangan akun/dataset adalah blocker
verifikasi, bukan bug aplikasi.

# Production Blocking Issues

1. Login sukses, logout, role route denial, dan RLS belum benar-benar diuji.
2. Create/edit/delete/import dan persistensi hasil belum terverifikasi.
3. Environment remote belum ditetapkan sebagai staging; tidak boleh memulai
   destructive test pada database tersebut.
4. Belum tersedia akun test super admin/admin/user/dosen, mailbox OTP test,
   dan fixture terisolasi untuk jadwal, lookup, storage, serta cleanup.
5. Cakupan browser masih terbatas; HTTP smoke bukan pengganti E2E.
6. Known auth/admin API/dependency/RLS risks belum ditutup oleh validasi ini.

Urutan lanjutan: konfirmasi staging dan akun melalui konfigurasi lokal aman;
jalankan login/role/logout dan navigasi; kemudian CRUD/import pada fixture;
uji search/filter/pagination, tanggal/status dan empty/loading/error; perbarui
laporan dengan bukti browser serta backend. Jangan menuliskan secret dalam
laporan atau memasang service_role di frontend.

# Safe to Merge?

**NO.** Semua perintah teknis wajib PASS, tetapi critical flow belum benar-benar
diverifikasi end-to-end. Status ini tidak berarti ada regresi yang terbukti;
artinya syarat verifikasi untuk menyatakan aman merge belum terpenuhi.
