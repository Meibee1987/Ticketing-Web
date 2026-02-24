-- ================================================================
-- MIGRATION: Tambah kolom created_by dan updated_by di tabel jadwal
-- Deskripsi: Menyimpan info siapa yang membuat dan mengedit jadwal
--            langsung di tabel jadwal yang sudah ada.
-- ================================================================

-- ═══════ JADWAL PERKULIAHAN ═══════
ALTER TABLE public.jadwal_perkuliahan
  ADD COLUMN IF NOT EXISTS created_by text NULL,
  ADD COLUMN IF NOT EXISTS updated_by text NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NULL;

-- ═══════ JADWAL KARYA AKHIR ═══════
ALTER TABLE public.jadwal_karya_akhir
  ADD COLUMN IF NOT EXISTS created_by text NULL,
  ADD COLUMN IF NOT EXISTS updated_by text NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NULL;

-- ═══════ JADWAL LAIN-LAIN ═══════
ALTER TABLE public.jadwal_lain_lain
  ADD COLUMN IF NOT EXISTS created_by text NULL,
  ADD COLUMN IF NOT EXISTS updated_by text NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NULL;
