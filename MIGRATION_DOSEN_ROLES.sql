-- Migration: Add roles_id column to dosen table
-- Purpose: Integrate Master Data Dosen with User Management

-- 1. Add roles_id column to dosen table (foreign key to roles table)
-- Note: Gunakan IF NOT EXISTS untuk menghindari error jika kolom sudah ada
ALTER TABLE dosen 
ADD COLUMN IF NOT EXISTS roles_id bigint REFERENCES roles(id);

-- 2. auth_id column sudah ada di tabel dosen
-- Jika belum ada, jalankan query berikut:
-- ALTER TABLE dosen ADD COLUMN IF NOT EXISTS auth_id uuid;

-- 3. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_dosen_roles_id ON dosen(roles_id);
CREATE INDEX IF NOT EXISTS idx_dosen_auth_id ON dosen(auth_id);

-- 4. Add comment for documentation
COMMENT ON COLUMN dosen.roles_id IS 'Role ID from roles table - assigned in User Management';
COMMENT ON COLUMN dosen.auth_id IS 'Auth ID from Supabase Auth - populated on first login';

-- ============================================
-- JIKA ERROR "column already exists":
-- Jalankan query ini saja:
-- 
-- ALTER TABLE dosen ADD COLUMN IF NOT EXISTS roles_id bigint REFERENCES roles(id);
-- 
-- Atau jika tidak support IF NOT EXISTS:
-- 
-- DO $$ 
-- BEGIN
--     IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
--                    WHERE table_name='dosen' AND column_name='roles_id') THEN
--         ALTER TABLE dosen ADD COLUMN roles_id bigint REFERENCES roles(id);
--     END IF;
-- END $$;
-- ============================================
