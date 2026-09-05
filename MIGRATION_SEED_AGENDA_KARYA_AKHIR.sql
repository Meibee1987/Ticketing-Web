-- Menambahkan agenda karya akhir. Aman dijalankan ulang: agenda yang sudah ada
-- (tanpa membedakan huruf besar/kecil) tidak akan ditambahkan kembali.

INSERT INTO public.agenda_karya_akhir (agenda_karya_akhir)
SELECT agenda
FROM (
  VALUES
    ('Presentasi Proposal'),
    ('Sidang Komisi'),
    ('Kolokium'),
    ('Seminar Hasil'),
    ('Ujian Tesis'),
    ('Presentasi Bisnis'),
    ('Prelim Lisan'),
    ('Ujian Skripsi'),
    ('Ujian Tertutup'),
    ('Promosi Terbuka')
) AS daftar(agenda)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.agenda_karya_akhir existing
  WHERE LOWER(TRIM(existing.agenda_karya_akhir)) = LOWER(TRIM(daftar.agenda))
);

NOTIFY pgrst, 'reload schema';
