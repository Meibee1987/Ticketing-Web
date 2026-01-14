-- ================================================================================
-- MIGRATION: Add jenis_pertemuan column to all jadwal tables
-- ================================================================================
-- Tanggal: 14 Januari 2026
-- Deskripsi: Menambahkan kolom jenis_pertemuan untuk menyimpan informasi
--            apakah jadwal dilaksanakan secara daring, luring, atau hybrid
-- ================================================================================

-- Tambahkan kolom jenis_pertemuan ke tabel jadwal_perkuliahan
ALTER TABLE public.jadwal_perkuliahan
ADD COLUMN IF NOT EXISTS jenis_pertemuan TEXT DEFAULT 'luring';

-- Tambahkan kolom jenis_pertemuan ke tabel jadwal_karya_akhir
ALTER TABLE public.jadwal_karya_akhir
ADD COLUMN IF NOT EXISTS jenis_pertemuan TEXT DEFAULT 'luring';

-- Tambahkan kolom jenis_pertemuan ke tabel jadwal_lain_lain
ALTER TABLE public.jadwal_lain_lain
ADD COLUMN IF NOT EXISTS jenis_pertemuan TEXT DEFAULT 'luring';

-- Tambahkan constraint untuk memastikan nilai valid
ALTER TABLE public.jadwal_perkuliahan
ADD CONSTRAINT jadwal_perkuliahan_jenis_pertemuan_check 
CHECK (jenis_pertemuan IN ('daring', 'luring', 'hybrid'));

ALTER TABLE public.jadwal_karya_akhir
ADD CONSTRAINT jadwal_karya_akhir_jenis_pertemuan_check 
CHECK (jenis_pertemuan IN ('daring', 'luring', 'hybrid'));

ALTER TABLE public.jadwal_lain_lain
ADD CONSTRAINT jadwal_lain_lain_jenis_pertemuan_check 
CHECK (jenis_pertemuan IN ('daring', 'luring', 'hybrid'));

-- Tambahkan komentar untuk dokumentasi
COMMENT ON COLUMN public.jadwal_perkuliahan.jenis_pertemuan IS 'Jenis pertemuan: daring (online), luring (offline), atau hybrid';
COMMENT ON COLUMN public.jadwal_karya_akhir.jenis_pertemuan IS 'Jenis pertemuan: daring (online), luring (offline), atau hybrid';
COMMENT ON COLUMN public.jadwal_lain_lain.jenis_pertemuan IS 'Jenis pertemuan: daring (online), luring (offline), atau hybrid';

-- ================================================================================
-- VERIFIKASI MIGRASI
-- ================================================================================
-- Jalankan query berikut untuk memverifikasi kolom sudah ditambahkan:
-- SELECT table_name, column_name, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_name IN ('jadwal_perkuliahan', 'jadwal_karya_akhir', 'jadwal_lain_lain') 
-- AND column_name = 'jenis_pertemuan';

-- ================================================================================
-- CONTOH PENGGUNAAN
-- ================================================================================
-- Insert dengan jenis_pertemuan:
-- INSERT INTO jadwal_perkuliahan (dosen_id, ruangan_id, id_angkatan, id_mata_kuliah, mulai_jadwal, akhir_jadwal, jenis_pertemuan)
-- VALUES (1, 2, 1, 1, '2026-01-15 09:00:00', '2026-01-15 11:00:00', 'daring');

-- Update jenis_pertemuan:
-- UPDATE jadwal_perkuliahan SET jenis_pertemuan = 'hybrid' WHERE id = 1;

-- Query berdasarkan jenis_pertemuan:
-- SELECT * FROM jadwal_perkuliahan WHERE jenis_pertemuan = 'daring';
