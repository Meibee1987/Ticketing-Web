# KIS — Sistem Informasi Jadwal

Frontend React 19 + Vite 7 untuk jadwal, ruangan, master data, pengguna, honor dosen,
dan monitor publik. Supabase menyediakan database, auth, realtime, dan storage.
Route ticketing/settings juga tersedia; sebagian masih memakai data contoh.

## Development

Gunakan Node yang didukung Vite 7 (20.19+ atau 22.12+). Refactor divalidasi dengan
Node 24.18.1 dan npm 11.16.0.

```sh
npm ci
npm run dev
```

Untuk checkout baru, salin [.env.example](./.env.example) menjadi `.env`, lalu isi
`VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dengan kredensial browser.
Jangan gunakan service-role/secret key: semua `VITE_*` masuk bundle frontend.
Variabel Google Sheets opsional; nilai kosong mempertahankan default existing.
File `.env` existing masih tracked di Git. Aturan ignore tidak menghapus file
tracked/history; perubahan penyediaan env deployment perlu dikoordinasikan.

## Commands

| Command | Fungsi |
| --- | --- |
| `npm run dev` | Development server |
| `npm run type-check` | Strict JSDoc checking pada empat modul dalam [konfigurasi](./jsconfig.typecheck.json), belum seluruh aplikasi |
| `npm run lint` | ESLint dan aturan Prettier existing |
| `npm test` | Node test runner, tanpa layanan eksternal |
| `npm run build` | Build produksi |
| `npm run preview` | Preview build lokal |
| `npm run format:check` | Pemeriksaan format sumber |

## Struktur dan konvensi

- [App.jsx](./src/App.jsx): route, guard, dan lazy loading.
- [Pages](./src/Pages): halaman, form, dan state UI.
- [components](./src/components): layout, UI bersama, dan import.
- [hooks](./src/hooks): lifecycle React, termasuk data ruangan.
- [services](./src/services): query bertahap jadwal dan pembacaan/mapping ruangan.
  Client diterima sebagai parameter agar kontrak dapat dites tanpa database.
- [data/dashboard.js](./src/data/dashboard.js): data layer dashboard existing.
- [contexts](./src/contexts): auth/role dan notification realtime.
- [constants](./src/constants): konfigurasi navigasi dan allowlist.
- [utils](./src/utils): parsing, formatting, perhitungan, dan import.
- [supabaseClient.js](./src/supabaseClient.js): satu client dan storage sesi existing.
- [test](./test) serta `*.test.js` dalam sumber: unit/contract tests.
- [legacy](./legacy): implementasi lama, tidak dipindahkan/dihapus oleh refactor ini.

Pemisahan layer masih bertahap. Saat memisahkan service, pertahankan query,
payload, field, error contract, filter, dan semantik tanggal. Parser CSV/array
serta helper UTC/lokal tidak selalu setara. Visibilitas sidebar dan route guard
bukan pengganti RLS. Perubahan auth/permission/schema dikerjakan terpisah.

## Validasi dan deployment

Jalankan type-check, lint, test, dan build sebelum menggabungkan perubahan.
[Workflow deployment](./.github/workflows/deploy.yml) existing menggunakan FTP
pada branch `master`; refactor tidak mengubah atau menjalankannya. Rekomendasi:
job PR terpisah dengan Node yang dipin, `npm ci`, dan empat pemeriksaan tersebut.

Lihat [KIS Refactor Report](./docs/KIS_REFACTOR_REPORT.md) untuk audit, bukti
regresi, temuan keamanan, keterbatasan validasi, dan tindak lanjut.
