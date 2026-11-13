-- HANYA setelah test/perkuliahanSync.sql pada database PostgreSQL sementara.
-- Tiap statement process mewakili satu request API dengan batas waktu 8 detik.
BEGIN;
SET LOCAL statement_timeout='8s';
UPDATE public."Teknisi" SET roles_id=1;
DELETE FROM public.perkuliahan_import_review;
DELETE FROM public.perkuliahan_import_batches;
DELETE FROM public.jadwal_perkuliahan;
DELETE FROM public.jadwal_karya_akhir;
DELETE FROM public.jadwal_lain_lain;
-- Riwayat lama tidak boleh membuat pemeriksaan tiap kandidat memindai semua sesi.
INSERT INTO public.jadwal_perkuliahan(id_mata_kuliah,id_angkatan,id_angkatans,dosen_id,dosen_ids,penguji_ids,
  ruangan_id,jenis_pertemuan,mulai_jadwal,akhir_jadwal,created_by)
SELECT 101,1,'[1]',11,'[]','[]',3,'luring',timestamp '2020-01-01'+n*interval '1 hour',
  timestamp '2020-01-01 01:00'+n*interval '1 hour','manual-history' FROM generate_series(1,10000) n;
ANALYZE public.jadwal_perkuliahan;
CREATE TEMP TABLE incremental_results(result JSONB,elapsed INTERVAL);
DO $$
DECLARE rows JSONB; template JSONB; result JSONB; started TIMESTAMPTZ:=clock_timestamp();
BEGIN
  template:='{"id_mata_kuliah":101,"id_angkatan":1,"id_angkatans":[1],"dosen_id":11,
    "dosen_ids":[],"penguji_ids":[],"ruangan_id":3,"jenis_pertemuan":"luring","kelas":"REG","paralel":1}';
  SELECT jsonb_agg(template || jsonb_build_object('source_key','load-'||n,'import_key','load-'||n,
    'real_perkuliahan',n,'mulai_jadwal',timestamp '2027-01-01 09:00'+n*interval '1 day',
    'akhir_jadwal',timestamp '2027-01-01 10:00'+n*interval '1 day')) INTO rows FROM generate_series(1,1500) n;
  -- Konflik lintas kelompok: baris pertama dan terakhir harus sama-sama ditahan.
  rows:=jsonb_build_array(template || '{"source_key":"conflict-first","real_perkuliahan":1501,"mulai_jadwal":"2035-07-01 09:00","akhir_jadwal":"2035-07-01 10:00"}') || rows || jsonb_build_array(
    template || '{"source_key":"conflict-last","real_perkuliahan":1502,"mulai_jadwal":"2035-07-01 09:30","akhir_jadwal":"2035-07-01 10:30"}',
    template || '{"source_key":"invalid-time","real_perkuliahan":1503,"mulai_jadwal":"tanggal salah","akhir_jadwal":"2035-07-01 10:00"}');
  result:=public.begin_jadwal_perkuliahan_review_import(rows,'2026-11-10','large-incremental');
  ASSERT result->>'workflow_version'='3' AND result->>'remaining'='1503',result::text;
  ASSERT (SELECT count(*)=10000 FROM jadwal_perkuliahan);
  INSERT INTO incremental_results VALUES(result,clock_timestamp()-started);
  RAISE NOTICE 'Stage 1503 rows: % ms',EXTRACT(MILLISECONDS FROM clock_timestamp()-started);
END;
$$;
-- \\gexec menjalankan setiap kelompok sebagai statement tersendiri.
SELECT $sql$DO $run$
DECLARE result JSONB; started TIMESTAMPTZ:=clock_timestamp(); previous_remaining INTEGER;
BEGIN
  SELECT (r.result->>'remaining')::integer INTO previous_remaining FROM incremental_results r ORDER BY ctid DESC LIMIT 1;
  result:=public.process_jadwal_perkuliahan_review_import((SELECT (r.result->>'batch_id')::bigint FROM incremental_results r LIMIT 1));
  ASSERT previous_remaining-(result->>'remaining')::integer BETWEEN 1 AND 25,result::text;
  INSERT INTO incremental_results VALUES(result,clock_timestamp()-started);
END; $run$;$sql$ FROM generate_series(1,61)
\gexec
DO $$
DECLARE result JSONB; repeated JSONB; denied BOOLEAN:=false; newer JSONB;
BEGIN
  SELECT r.result INTO result FROM incremental_results r ORDER BY ctid DESC LIMIT 1;
  ASSERT result->>'complete'='true' AND result->>'inserted'='1500' AND result->>'pending'='3',result::text;
  ASSERT (SELECT count(*)=2 FROM perkuliahan_import_review WHERE status='conflict');
  ASSERT (SELECT status='invalid' FROM perkuliahan_import_review WHERE source_key='invalid-time');
  repeated:=public.process_jadwal_perkuliahan_review_import((result->>'batch_id')::bigint);
  ASSERT result=repeated,'Repeated process must be idempotent';
  ASSERT (SELECT count(*)=11500 FROM jadwal_perkuliahan);
  RAISE NOTICE 'Max request time: % ms', (SELECT EXTRACT(MILLISECONDS FROM max(elapsed)) FROM incremental_results);
  -- Import lebih lama tidak boleh melanjutkan/menimpa batch baru.
  newer:=public.begin_jadwal_perkuliahan_review_import(jsonb_build_array(
    (SELECT source_payload || '{"source_key":"newest"}' FROM perkuliahan_import_review WHERE source_key='load-1')),'2026-11-10','newest');
  BEGIN PERFORM public.process_jadwal_perkuliahan_review_import((result->>'batch_id')::bigint);
  EXCEPTION WHEN OTHERS THEN denied:=SQLERRM LIKE '%lebih baru%'; END;
  ASSERT denied;
  UPDATE public."Teknisi" SET roles_id=2;
  denied:=false;
  BEGIN PERFORM public.process_jadwal_perkuliahan_review_import((newer->>'batch_id')::bigint);
  EXCEPTION WHEN OTHERS THEN denied:=SQLERRM LIKE '%Akses admin%'; END;
  ASSERT denied;
END;
$$;
ROLLBACK;
