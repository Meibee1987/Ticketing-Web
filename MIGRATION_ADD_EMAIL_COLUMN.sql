-- ===================================================
-- MIGRATION: Tambah Kolom Email ke Tabel Teknisi
-- ===================================================
-- Jalankan SQL ini di Supabase SQL Editor
-- Dashboard Supabase -> SQL Editor -> New Query

-- 1. Tambah kolom email dengan constraint UNIQUE
ALTER TABLE "Teknisi" 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- 2. Buat index untuk performa lookup email
CREATE INDEX IF NOT EXISTS idx_teknisi_email 
ON "Teknisi"(email);

-- 3. Verify kolom berhasil ditambahkan
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Teknisi'
ORDER BY ordinal_position;

-- 4. (Optional) Jika ada data existing tanpa email, bisa update manual:
-- UPDATE "Teknisi" SET email = 'user@example.com' WHERE id = 1;

-- 5. Check data setelah migration
SELECT id, email, nama_teknisi, roles_id 
FROM "Teknisi" 
ORDER BY id;
