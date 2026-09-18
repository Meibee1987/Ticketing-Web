-- Pisahkan keterangan jadwal lain-lain dari nama user.
ALTER TABLE public.jadwal_lain_lain
ADD COLUMN IF NOT EXISTS keterangan text;

COMMENT ON COLUMN public.jadwal_lain_lain.keterangan IS
  'Keterangan bebas yang ditampilkan pada kolom informasi jadwal lain-lain.';

-- Minta PostgREST memuat ulang metadata tabel setelah migrasi dijalankan.
NOTIFY pgrst, 'reload schema';
