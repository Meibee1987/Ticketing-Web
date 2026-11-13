-- HANYA setelah test/perkuliahanSync.sql pada database PostgreSQL sementara.
-- Jalankan seluruh regresi lama melalui protokol bertahap, lalu rollback.
BEGIN;
UPDATE public."Teknisi" SET roles_id=1;
DELETE FROM public.perkuliahan_import_review;
DELETE FROM public.perkuliahan_import_batches;
DELETE FROM public.jadwal_perkuliahan;
DELETE FROM public.jadwal_karya_akhir;
DELETE FROM public.jadwal_lain_lain;
CREATE OR REPLACE FUNCTION public.sync_jadwal_perkuliahan_review_import(
  p_rows JSONB,p_scope_start TIMESTAMP WITHOUT TIME ZONE,p_batch_tag TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result JSONB;
BEGIN
  result:=public.begin_jadwal_perkuliahan_review_import(p_rows,p_scope_start,p_batch_tag);
  ASSERT result->>'workflow_version'='3';
  ASSERT result->>'complete'='false';
  LOOP
    result:=public.process_jadwal_perkuliahan_review_import((result->>'batch_id')::bigint);
    EXIT WHEN result->>'complete'='true';
  END LOOP;
  -- Regresi lama memeriksa kontrak v2; hasil baru tetap harus setara.
  RETURN result || '{"workflow_version":2}';
END;
$$;
\ir perkuliahanReview.sql
ROLLBACK;
