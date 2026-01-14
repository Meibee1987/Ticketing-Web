-- ================================================================================
-- MIGRATION: Add dosen_ids column to jadwal_karya_akhir table
-- ================================================================================
-- Tanggal: 14 Januari 2026
-- Deskripsi: Menambahkan kolom dosen_ids untuk menyimpan array ID dosen penguji
--            (maksimal 8 dosen per jadwal karya akhir)
-- ================================================================================

-- Tambahkan kolom dosen_ids sebagai JSONB untuk menyimpan array ID dosen
ALTER TABLE public.jadwal_karya_akhir
ADD COLUMN IF NOT EXISTS dosen_ids JSONB DEFAULT '[]'::jsonb;

-- Tambahkan komentar untuk dokumentasi
COMMENT ON COLUMN public.jadwal_karya_akhir.dosen_ids IS 'Array of dosen IDs (max 8) for Karya Akhir examination panel';

-- ================================================================================
-- VERIFIKASI MIGRASI
-- ================================================================================
-- Jalankan query berikut untuk memverifikasi kolom sudah ditambahkan:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'jadwal_karya_akhir' AND column_name = 'dosen_ids';

-- ================================================================================
-- CONTOH PENGGUNAAN
-- ================================================================================
-- Insert dengan dosen_ids:
-- INSERT INTO jadwal_karya_akhir (nama_angkatan, nama_ruangan, agenda_jadwal_karya_akhir, mulai_jadwal, akhir_jadwal, dosen_ids)
-- VALUES (1, 2, 3, '2026-01-15 09:00:00', '2026-01-15 11:00:00', '[1, 2, 3]');

-- Update dosen_ids:
-- UPDATE jadwal_karya_akhir SET dosen_ids = '[1, 2, 3, 4]' WHERE id = 1;

-- Query dengan join ke tabel dosen (untuk mendapatkan nama dosen):
-- SELECT 
--   jka.*,
--   (
--     SELECT json_agg(d.nama_dosen)
--     FROM dosen d
--     WHERE d.id = ANY(ARRAY(SELECT jsonb_array_elements_text(jka.dosen_ids)::int))
--   ) as nama_dosen_list
-- FROM jadwal_karya_akhir jka;
