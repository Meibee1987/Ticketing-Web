-- HANYA setelah test/perkuliahanSync.sql pada database sementara/kosong.
-- Seluruh perubahan fixture dibatalkan di akhir pengujian.
BEGIN;
SET LOCAL statement_timeout = '8s';
UPDATE public."Teknisi" SET roles_id = 1;
DELETE FROM public.perkuliahan_import_review;
DELETE FROM public.perkuliahan_import_batches;
DELETE FROM public.jadwal_perkuliahan;
DELETE FROM public.jadwal_karya_akhir;
DELETE FROM public.jadwal_lain_lain;
DO $$
DECLARE rows jsonb; template jsonb; result jsonb; started timestamptz := clock_timestamp();
BEGIN
  template := '{"id_mata_kuliah":101,"id_angkatan":1,"id_angkatans":[1],
    "dosen_id":11,"dosen_ids":[],"penguji_ids":[],"ruangan_id":3,
    "jenis_pertemuan":"luring","kelas":"REG","paralel":1}';
  SELECT jsonb_agg(template || jsonb_build_object(
    'source_key','load-' || n, 'import_key','load-' || n, 'real_perkuliahan',n,
    'mulai_jadwal', timestamp '2027-01-01 09:00' + n * interval '1 day',
    'akhir_jadwal', timestamp '2027-01-01 10:00' + n * interval '1 day'
  )) INTO rows FROM generate_series(1,500) n;
  rows := rows || jsonb_build_array(
    template || '{"source_key":"conflict-a","real_perkuliahan":501,"mulai_jadwal":"2028-07-01 09:00","akhir_jadwal":"2028-07-01 10:00"}',
    template || '{"source_key":"conflict-b","real_perkuliahan":502,"mulai_jadwal":"2028-07-01 09:30","akhir_jadwal":"2028-07-01 10:30"}',
    template || '{"source_key":"invalid-time","real_perkuliahan":503,"mulai_jadwal":"tanggal salah","akhir_jadwal":"2028-07-01 10:00"}'
  );
  result := public.sync_jadwal_perkuliahan_review_import(rows,'2026-11-10','load-first');
  ASSERT result->>'inserted'='500' AND result->>'pending'='3', result::text;
  ASSERT (SELECT count(*)=2 FROM perkuliahan_import_review WHERE status='conflict');
  ASSERT (SELECT status='invalid' FROM perkuliahan_import_review WHERE source_key='invalid-time');
  RAISE NOTICE '503-row initial import completed in % ms', EXTRACT(MILLISECONDS FROM clock_timestamp()-started);
  started := clock_timestamp();
  result := public.sync_jadwal_perkuliahan_review_import(rows,'2026-11-10','load-repeat');
  ASSERT result->>'updated'='500' AND result->>'pending'='3', result::text;
  ASSERT (SELECT count(*)=500 FROM jadwal_perkuliahan);
  RAISE NOTICE '503-row repeat import completed in % ms', EXTRACT(MILLISECONDS FROM clock_timestamp()-started);
END;
$$;
ROLLBACK;
