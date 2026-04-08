-- ================================================================================
-- MIGRATION: Tambah kolom-kolom baru sesuai Spreadsheet Jadwal Akademik SB-IPB
-- ================================================================================
-- Tanggal: 7 April 2026
-- Deskripsi: Menambahkan kolom-kolom yang ada di spreadsheet Google Sheets
--            tapi belum ada di database Supabase
-- ================================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. TABEL: jadwal_perkuliahan (Kuliah S1 & S2)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Kolom A: Kegiatan (kode program studi/batch, contoh: SB81, SB80)
ALTER TABLE public.jadwal_perkuliahan
ADD COLUMN IF NOT EXISTS kegiatan VARCHAR(20);

-- Kolom D: Paralel (nomor kelas paralel, contoh: 1, 2, 3)
ALTER TABLE public.jadwal_perkuliahan
ADD COLUMN IF NOT EXISTS paralel INTEGER;

-- Kolom E: Kelas (jenis kelas: REG = Reguler, INT = Internasional, RES = Reserved)
ALTER TABLE public.jadwal_perkuliahan
ADD COLUMN IF NOT EXISTS kelas VARCHAR(10);

-- Kolom F: Quota (jumlah kuota mahasiswa per kelas)
ALTER TABLE public.jadwal_perkuliahan
ADD COLUMN IF NOT EXISTS quota INTEGER;

-- Kolom G: Real Perkuliahan (jumlah pertemuan yang sudah terlaksana)
ALTER TABLE public.jadwal_perkuliahan
ADD COLUMN IF NOT EXISTS real_perkuliahan INTEGER;

-- Kolom K: Petugas Zoom (nama operator zoom)
ALTER TABLE public.jadwal_perkuliahan
ADD COLUMN IF NOT EXISTS petugas_zoom TEXT;

-- Kolom R: Moderator
ALTER TABLE public.jadwal_perkuliahan
ADD COLUMN IF NOT EXISTS moderator TEXT;

-- Kolom N,O,P: Dosen tambahan (saat ini hanya dosen_id untuk 1 dosen)
-- Menggunakan dosen_ids JSONB untuk menyimpan array multi-dosen (maks 4)
ALTER TABLE public.jadwal_perkuliahan
ADD COLUMN IF NOT EXISTS dosen_ids JSONB DEFAULT '[]'::jsonb;

-- Kolom S,T: Penguji 1 dan 2
ALTER TABLE public.jadwal_perkuliahan
ADD COLUMN IF NOT EXISTS penguji_ids JSONB DEFAULT '[]'::jsonb;

-- Kolom U: Pintang/SPs (Pembimbing Tamu / Sarjana Per Semester)
ALTER TABLE public.jadwal_perkuliahan
ADD COLUMN IF NOT EXISTS pintang_sps TEXT;

-- Komentar dokumentasi
COMMENT ON COLUMN public.jadwal_perkuliahan.kegiatan IS 'Kode kegiatan/program studi (contoh: SB81, SB80)';
COMMENT ON COLUMN public.jadwal_perkuliahan.paralel IS 'Nomor kelas paralel (1, 2, 3, dst)';
COMMENT ON COLUMN public.jadwal_perkuliahan.kelas IS 'Jenis kelas: REG (Reguler), INT (Internasional), RES (Reserved)';
COMMENT ON COLUMN public.jadwal_perkuliahan.quota IS 'Kuota maksimal mahasiswa per kelas';
COMMENT ON COLUMN public.jadwal_perkuliahan.real_perkuliahan IS 'Jumlah pertemuan yang sudah terlaksana';
COMMENT ON COLUMN public.jadwal_perkuliahan.petugas_zoom IS 'Nama petugas/operator Zoom meeting';
COMMENT ON COLUMN public.jadwal_perkuliahan.moderator IS 'Nama moderator perkuliahan';
COMMENT ON COLUMN public.jadwal_perkuliahan.dosen_ids IS 'Array ID dosen tambahan (dosen 2, 3, 4) dalam format JSONB. Dosen utama tetap di kolom dosen_id';
COMMENT ON COLUMN public.jadwal_perkuliahan.penguji_ids IS 'Array ID penguji (penguji 1, penguji 2) dalam format JSONB';
COMMENT ON COLUMN public.jadwal_perkuliahan.pintang_sps IS 'Info Pembimbing Tamu / SPs';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. TABEL: jadwal_karya_akhir (Sidang Komisi, Ujian Tesis, Prelim Lisan)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Kolom K: Petugas Zoom
ALTER TABLE public.jadwal_karya_akhir
ADD COLUMN IF NOT EXISTS petugas_zoom TEXT;

-- Kolom R: Moderator
ALTER TABLE public.jadwal_karya_akhir
ADD COLUMN IF NOT EXISTS moderator TEXT;

-- Kolom S,T: Penguji (terpisah dari dosen pembimbing)
-- dosen_ids sudah ada untuk menyimpan semua dosen panel
-- Tambah penguji_ids untuk penguji khusus
ALTER TABLE public.jadwal_karya_akhir
ADD COLUMN IF NOT EXISTS penguji_ids JSONB DEFAULT '[]'::jsonb;

-- Kolom U: Pintang/SPs
ALTER TABLE public.jadwal_karya_akhir
ADD COLUMN IF NOT EXISTS pintang_sps TEXT;

-- Komentar dokumentasi
COMMENT ON COLUMN public.jadwal_karya_akhir.petugas_zoom IS 'Nama petugas/operator Zoom meeting';
COMMENT ON COLUMN public.jadwal_karya_akhir.moderator IS 'Nama moderator sidang';
COMMENT ON COLUMN public.jadwal_karya_akhir.penguji_ids IS 'Array ID penguji (penguji 1, penguji 2) dalam format JSONB, terpisah dari dosen pembimbing di dosen_ids';
COMMENT ON COLUMN public.jadwal_karya_akhir.pintang_sps IS 'Info Pembimbing Tamu / SPs';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. TABEL: jadwal_lain_lain
-- ═══════════════════════════════════════════════════════════════════════════════

-- Kolom K: Petugas Zoom
ALTER TABLE public.jadwal_lain_lain
ADD COLUMN IF NOT EXISTS petugas_zoom TEXT;

-- Komentar dokumentasi
COMMENT ON COLUMN public.jadwal_lain_lain.petugas_zoom IS 'Nama petugas/operator Zoom meeting';


-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFIKASI MIGRASI
-- ═══════════════════════════════════════════════════════════════════════════════
-- Jalankan query berikut untuk memverifikasi semua kolom baru:

-- Cek kolom baru di jadwal_perkuliahan:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'jadwal_perkuliahan' 
-- AND column_name IN ('kegiatan', 'paralel', 'kelas', 'quota', 'real_perkuliahan', 
--                      'petugas_zoom', 'moderator', 'dosen_ids', 'penguji_ids', 'pintang_sps');

-- Cek kolom baru di jadwal_karya_akhir:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'jadwal_karya_akhir' 
-- AND column_name IN ('petugas_zoom', 'moderator', 'penguji_ids', 'pintang_sps');

-- Cek kolom baru di jadwal_lain_lain:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'jadwal_lain_lain' 
-- AND column_name IN ('petugas_zoom');


-- ═══════════════════════════════════════════════════════════════════════════════
-- CONTOH PENGGUNAAN
-- ═══════════════════════════════════════════════════════════════════════════════

-- Insert jadwal perkuliahan lengkap:
-- INSERT INTO jadwal_perkuliahan (
--   kegiatan, dosen_id, ruangan_id, id_angkatan, id_mata_kuliah,
--   paralel, kelas, quota, real_perkuliahan,
--   mulai_jadwal, akhir_jadwal, jenis_pertemuan,
--   petugas_zoom, zoom_id, zoom_password,
--   dosen_ids, moderator, penguji_ids, pintang_sps, note
-- ) VALUES (
--   'SB81', 1, 2, 1, 3,
--   1, 'REG', 60, 10,
--   '2026-04-07 09:00:00', '2026-04-07 11:00:00', 'luring',
--   'Petugas A', NULL, NULL,
--   '[2, 3]', 'Dr. Moderator', '[4, 5]', 'PIN: 123456', 'Catatan contoh'
-- );

-- Insert jadwal karya akhir (Sidang Komisi):
-- INSERT INTO jadwal_karya_akhir (
--   nama_ruangan, nama_mahasiswa, agenda_jadwal_karya_akhir,
--   mulai_jadwal, akhir_jadwal, jenis_pertemuan,
--   dosen_ids, penguji_ids, petugas_zoom, moderator,
--   zoom_id, zoom_password, pintang_sps, note
-- ) VALUES (
--   1, 'Nama Mahasiswa', 1,
--   '2026-04-07 10:00:00', '2026-04-07 12:00:00', 'hybrid',
--   '[1, 2]', '[3, 4]', 'Petugas B', 'Dr. Moderator',
--   '912 3072 7899', 'abc123', NULL, 'Sidang Komisi 1'
-- );
