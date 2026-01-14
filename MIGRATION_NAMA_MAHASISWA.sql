-- ================================================================================
-- MIGRATION: Add nama_mahasiswa column to jadwal_karya_akhir table
-- ================================================================================
-- Tanggal: 14 Januari 2026
-- Deskripsi: Menambahkan kolom nama_mahasiswa untuk menyimpan nama mahasiswa
--            yang mengikuti ujian karya akhir, menggantikan referensi ke tabel angkatan
-- ================================================================================

-- Tambahkan kolom nama_mahasiswa sebagai TEXT
ALTER TABLE public.jadwal_karya_akhir
ADD COLUMN IF NOT EXISTS nama_mahasiswa TEXT;

-- Tambahkan komentar untuk dokumentasi
COMMENT ON COLUMN public.jadwal_karya_akhir.nama_mahasiswa IS 'Nama mahasiswa yang mengikuti ujian karya akhir';

-- ================================================================================
-- MIGRASI DATA (OPSIONAL)
-- ================================================================================
-- Jika Anda ingin mengisi nama_mahasiswa dari data angkatan yang ada:
-- UPDATE jadwal_karya_akhir jka
-- SET nama_mahasiswa = a.nama_angkatan
-- FROM angkatan a
-- WHERE jka.nama_angkatan = a.id;

-- ================================================================================
-- VERIFIKASI MIGRASI
-- ================================================================================
-- Jalankan query berikut untuk memverifikasi kolom sudah ditambahkan:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'jadwal_karya_akhir' AND column_name = 'nama_mahasiswa';

-- ================================================================================
-- CATATAN
-- ================================================================================
-- Kolom nama_angkatan masih tetap ada di tabel untuk backward compatibility.
-- Jika ingin menghapus kolom nama_angkatan setelah migrasi data selesai:
-- ALTER TABLE public.jadwal_karya_akhir DROP COLUMN IF EXISTS nama_angkatan;
