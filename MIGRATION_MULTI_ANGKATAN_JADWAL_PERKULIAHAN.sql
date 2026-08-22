-- Satu jadwal perkuliahan dapat ditampilkan untuk maksimal tiga angkatan.
-- Kolom id_angkatan tetap dipertahankan sebagai angkatan utama agar relasi lama
-- dan join yang sudah ada tidak terganggu.

ALTER TABLE public.jadwal_perkuliahan
  ADD COLUMN IF NOT EXISTS id_angkatans JSONB;

-- Data lama tetap dapat ditampilkan sebagai satu angkatan.
UPDATE public.jadwal_perkuliahan
SET id_angkatans = jsonb_build_array(id_angkatan)
WHERE id_angkatans IS NULL AND id_angkatan IS NOT NULL;

ALTER TABLE public.jadwal_perkuliahan
  ADD CONSTRAINT jadwal_perkuliahan_id_angkatans_max_tiga
  CHECK (id_angkatans IS NULL OR jsonb_array_length(id_angkatans) BETWEEN 1 AND 3);

-- Memuat ulang cache skema PostgREST/Supabase.
NOTIFY pgrst, 'reload schema';
