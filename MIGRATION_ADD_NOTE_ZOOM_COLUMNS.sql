-- =====================================================
-- MIGRATION: Menambahkan kolom note, zoom_id, dan zoom_password
-- Tanggal: 28 Januari 2026
-- Deskripsi: Menambahkan kolom untuk catatan/permintaan dan info zoom
--            di tabel jadwal_perkuliahan, jadwal_karya_akhir, dan jadwal_lain_lain
-- =====================================================

-- 1. Tambahkan kolom di tabel jadwal_perkuliahan
ALTER TABLE jadwal_perkuliahan
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS zoom_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS zoom_password VARCHAR(255);

-- 2. Tambahkan kolom di tabel jadwal_karya_akhir
ALTER TABLE jadwal_karya_akhir
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS zoom_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS zoom_password VARCHAR(255);

-- 3. Tambahkan kolom di tabel jadwal_lain_lain
ALTER TABLE jadwal_lain_lain
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS zoom_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS zoom_password VARCHAR(255);

-- =====================================================
-- SELESAI
-- Kolom note, zoom_id, dan zoom_password sudah ditambahkan
-- ke semua tabel jadwal
-- =====================================================
