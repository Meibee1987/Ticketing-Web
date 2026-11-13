-- Dipanggil oleh karyaAkhirSync.sql pada database sementara.
-- Impor ulang harus memperbaiki agenda NULL pada ID jadwal lama.
BEGIN;
DO $$
DECLARE
  legacy_id bigint;
  seminar_id bigint;
  result jsonb;
BEGIN
  SELECT id INTO STRICT seminar_id FROM agenda_karya_akhir
    WHERE agenda_karya_akhir = 'Seminar Hasil';
  INSERT INTO jadwal_karya_akhir(
    nama_mahasiswa, nama_angkatan, agenda_jadwal_karya_akhir,
    mulai_jadwal, akhir_jadwal, dosen_ids, penguji_ids,
    jenis_pertemuan, created_by, import_source
  ) VALUES (
    'Anti Deisnasari', 1, NULL, '2026-11-13 13:30', '2026-11-13 14:30',
    '[11]', '[]', 'daring', 'Import lama', 'google_jadwal'
  ) RETURNING id INTO legacy_id;
  result := sync_jadwal_karya_akhir_review_import(jsonb_build_array(
    jsonb_build_object(
      'source_key', 'seminar-hasil-recovery', 'row_number', 1,
      'nama_mahasiswa', 'Anti Deisnasari', 'nama_angkatan', 1,
      'agenda_jadwal_karya_akhir', seminar_id, 'dosen_ids', '[11]'::jsonb,
      'penguji_ids', '[]'::jsonb, 'jenis_pertemuan', 'daring',
      'mulai_jadwal', '2026-11-13T13:30:00', 'akhir_jadwal', '2026-11-13T14:30:00',
      'import_key', 'seminar-hasil-recovery',
      'source_data', '{"Kegiatan":"Seminar Hasil"}'::jsonb
    )
  ), '2026-11-13', 'recovery');
  ASSERT result->>'updated' = '1' AND result->>'inserted' = '0'
    AND result->>'pending' = '0', result::text;
  ASSERT (SELECT agenda_jadwal_karya_akhir = seminar_id
    AND created_by = 'Import lama' FROM jadwal_karya_akhir WHERE id = legacy_id);
  ASSERT (SELECT schedule_id = legacy_id FROM karya_akhir_import_review
    WHERE source_key = 'seminar-hasil-recovery');
END;
$$;
ROLLBACK;

DO $$
DECLARE
  a jsonb := '{"source_key":"sheet-a","row_number":1,"nama_mahasiswa":"Wanda","nama_angkatan":1,
    "agenda_jadwal_karya_akhir":2,"nama_ruangan":3,"jenis_pertemuan":"luring","dosen_ids":[11],
    "penguji_ids":[12],"mulai_jadwal":"2026-11-12T09:00:00","akhir_jadwal":"2026-11-12T10:00:00","import_key":"a"}';
  b jsonb; c jsonb; result jsonb; q public.karya_akhir_import_review%ROWTYPE;
  sid bigint; saved_timestamp timestamptz; denied boolean := false;
BEGIN
  INSERT INTO jadwal_karya_akhir(nama_mahasiswa,mulai_jadwal,akhir_jadwal,created_by)
    VALUES ('Manual','2026-12-01 09:00','2026-12-01 10:00','Admin'),
      ('Historis','2026-01-01 09:00','2026-01-01 10:00','Import-2026-01-01 00:00:00');
  result := sync_jadwal_karya_akhir_review_import(jsonb_build_array(a),'2026-11-10','batch1');
  ASSERT result->>'workflow_version'='2', result::text;
  ASSERT result->>'inserted' = '1' AND result->>'pending' = '0', result::text;
  SELECT * INTO q FROM karya_akhir_import_review WHERE source_key='sheet-a';
  sid := q.schedule_id;
  ASSERT q.status='active';
  result := sync_jadwal_karya_akhir_import(jsonb_build_array(a),'2026-11-10','batch2');
  ASSERT result->>'workflow_version'='2', 'legacy RPC must delegate to review workflow';
  ASSERT result->>'inserted'='0' AND result->>'updated'='1', result::text;
  ASSERT (SELECT created_by='batch1' FROM jadwal_karya_akhir WHERE id=sid);
  result := sync_jadwal_karya_akhir_review_import(jsonb_build_array(a,a || '{"source_key":"copy"}'),'2026-11-10','duplicate');
  ASSERT result->>'skipped'='1' AND result->>'pending'='0', result::text;
  ASSERT (SELECT count(*)=1 FROM jadwal_karya_akhir WHERE import_source='google_jadwal');

  result := sync_jadwal_karya_akhir_review_import(jsonb_build_array(a,a || '{"source_key":"different-key-copy","import_key":"forged-key","dosen_ids":[20],"penguji_ids":[],"nama_ruangan":4}'),'2026-11-10','duplicate-identity');
  ASSERT result->>'skipped'='1' AND result->>'pending'='0', result::text;

  INSERT INTO jadwal_lain_lain VALUES (1,4,'hybrid','2026-11-12 09:00','2026-11-12 10:00');
  b := a || '{"source_key":"sheet-b","import_key":"b","nama_mahasiswa":"Rani","nama_ruangan":4,"dosen_ids":[20],"penguji_ids":[]}';
  c := a || '{"source_key":"sheet-c","import_key":"c","nama_mahasiswa":"Anti","nama_ruangan":null,"dosen_ids":[21],"penguji_ids":[],"agenda_jadwal_karya_akhir":null,"validation_issues":["Agenda tidak ditemukan"],"source_data":{"Kegiatan":"Agenda baru"}}';
  result := sync_jadwal_karya_akhir_review_import(jsonb_build_array(a,b,c),'2026-11-10','partial');
  ASSERT result->>'updated'='1' AND result->>'pending'='2', result::text;
  ASSERT (SELECT status='conflict' AND schedule_id IS NULL FROM karya_akhir_import_review WHERE source_key='sheet-b');
  ASSERT (SELECT status='invalid' AND source_data->>'Kegiatan'='Agenda baru' FROM karya_akhir_import_review WHERE source_key='sheet-c');
  ASSERT (SELECT count(*)=1 FROM jadwal_karya_akhir WHERE import_source='google_jadwal');

  SELECT * INTO q FROM karya_akhir_import_review WHERE source_key='sheet-b';
  result := review_jadwal_karya_akhir_import(q.id,q.payload,q.updated_at);
  ASSERT result->>'activated'='false', result::text;
  SELECT * INTO q FROM karya_akhir_import_review WHERE source_key='sheet-b';
  ASSERT q.status='conflict';
  saved_timestamp := q.updated_at;
  result := review_jadwal_karya_akhir_import(q.id,q.payload || '{"mulai_jadwal":"2026-11-12T10:00:00","akhir_jadwal":"2026-11-12T11:00:00"}',q.updated_at);
  ASSERT result->>'activated'='true', result::text;
  BEGIN PERFORM review_jadwal_karya_akhir_import(q.id,q.payload,saved_timestamp);
  EXCEPTION WHEN OTHERS THEN denied := SQLERRM LIKE '%Data berubah%'; END;
  ASSERT denied, 'stale edits rejected';
  SELECT * INTO q FROM karya_akhir_import_review WHERE source_key='sheet-c';
  result := review_jadwal_karya_akhir_import(q.id,q.payload || '{"agenda_jadwal_karya_akhir":2,"mulai_jadwal":"2026-11-12T11:00:00","akhir_jadwal":"2026-11-12T12:00:00"}',q.updated_at);
  ASSERT result->>'activated'='true', result::text;

  result := sync_jadwal_karya_akhir_review_import(jsonb_build_array(a,b,c),'2026-11-10','same-source');
  SELECT * INTO q FROM karya_akhir_import_review WHERE source_key='sheet-b';
  ASSERT q.status='active' AND q.payload->>'mulai_jadwal'='2026-11-12T10:00:00', row_to_json(q)::text;
  ASSERT (SELECT mulai_jadwal='2026-11-12 10:00' FROM jadwal_karya_akhir WHERE id=q.schedule_id);
  b := b || '{"nama_ruangan":5}';
  result := sync_jadwal_karya_akhir_review_import(jsonb_build_array(a,b,c),'2026-11-10','changed-source');
  SELECT * INTO q FROM karya_akhir_import_review WHERE source_key='sheet-b';
  ASSERT q.status='source_changed' AND q.payload->>'nama_ruangan'='4', row_to_json(q)::text;
  ASSERT (SELECT nama_ruangan=4 FROM jadwal_karya_akhir WHERE id=q.schedule_id);
  result := sync_jadwal_karya_akhir_review_import(jsonb_build_array(a,b,c),'2026-11-10','source-still-unreviewed');
  SELECT * INTO q FROM karya_akhir_import_review WHERE source_key='sheet-b';
  ASSERT q.status='source_changed', 'reimport must not silently accept source changes';
  result := review_jadwal_karya_akhir_import(q.id,q.payload,q.updated_at);
  ASSERT result->>'activated'='true', result::text;

  INSERT INTO jadwal_perkuliahan VALUES (1,11,'[]','[]',null,'daring','2026-11-12 13:00','2026-11-12 14:00');
  a := a || '{"mulai_jadwal":"2026-11-12T13:00:00","akhir_jadwal":"2026-11-12T14:00:00","import_key":"changed-a"}';
  result := sync_jadwal_karya_akhir_review_import(jsonb_build_array(a,b,c),'2026-11-10','replacement');
  ASSERT result->>'pending'='1', result::text;
  ASSERT (SELECT mulai_jadwal='2026-11-12 09:00' FROM jadwal_karya_akhir WHERE id=sid);
  DELETE FROM jadwal_perkuliahan;
  SELECT * INTO q FROM karya_akhir_import_review WHERE source_key='sheet-a';
  result := review_jadwal_karya_akhir_import(q.id,q.payload || '{"note":"Koreksi admin"}',q.updated_at);
  ASSERT result->>'activated'='true', result::text;
  ASSERT (SELECT mulai_jadwal='2026-11-12 13:00' FROM jadwal_karya_akhir WHERE id=sid);
  result := sync_jadwal_karya_akhir_review_import(jsonb_build_array(b,c),'2026-11-10','missing-override');
  ASSERT EXISTS (SELECT 1 FROM jadwal_karya_akhir WHERE id=sid);
  ASSERT (SELECT count(*)=2 FROM jadwal_karya_akhir WHERE nama_mahasiswa IN ('Manual','Historis'));

  a := a || '{"source_key":"new-a","import_key":"new-a","nama_mahasiswa":"New A","dosen_ids":[20],"penguji_ids":[],"mulai_jadwal":"2026-11-14T09:00:00","akhir_jadwal":"2026-11-14T10:00:00"}';
  b := a || '{"source_key":"new-b","import_key":"new-b","nama_mahasiswa":"New B","nama_ruangan":5}';
  result := sync_jadwal_karya_akhir_review_import(jsonb_build_array(a,b),'2026-11-10','peers');
  ASSERT result->>'pending'='2', result::text;
  ASSERT NOT EXISTS (SELECT 1 FROM jadwal_karya_akhir WHERE nama_mahasiswa IN ('New A','New B'));
  -- Stale data is removed only after the latest source snapshot is fully valid.
  a := a || '{"source_key":"clean-one","import_key":"clean-one","nama_mahasiswa":"Clean One","mulai_jadwal":"2026-11-20T09:00:00","akhir_jadwal":"2026-11-20T10:00:00"}';
  b := a || '{"source_key":"clean-two","import_key":"clean-two","nama_mahasiswa":"Clean Two","mulai_jadwal":"2026-11-20T10:00:00","akhir_jadwal":"2026-11-20T11:00:00"}';
  result := sync_jadwal_karya_akhir_review_import(jsonb_build_array(a,b),'2026-11-10','cleanup-setup');
  ASSERT result->>'pending'='0', result::text;
  result := sync_jadwal_karya_akhir_review_import(jsonb_build_array(a || '{"dosen_ids":[999]}'),'2026-11-10','cleanup-held');
  ASSERT result->>'deleted'='0' AND result->>'pending'='1', result::text;
  ASSERT EXISTS (SELECT 1 FROM jadwal_karya_akhir WHERE nama_mahasiswa='Clean Two');
  result := sync_jadwal_karya_akhir_review_import(jsonb_build_array(a),'2026-11-10','cleanup-ready');
  ASSERT result->>'deleted'='1', result::text;
  ASSERT NOT EXISTS (SELECT 1 FROM jadwal_karya_akhir WHERE nama_mahasiswa='Clean Two');
  -- A shared source ID with contradictory values cannot silently pick one row.
  result := sync_jadwal_karya_akhir_review_import(jsonb_build_array(a,a || '{"nama_ruangan":5}'),'2026-11-10','contradictory-id');
  ASSERT result->>'pending'='1', result::text;
  ASSERT (SELECT nama_ruangan=3 FROM jadwal_karya_akhir WHERE nama_mahasiswa='Clean One');
  UPDATE "Teknisi" SET roles_id=2;
  denied := false;
  BEGIN PERFORM sync_jadwal_karya_akhir_review_import(jsonb_build_array(a),'2026-11-10','denied');
  EXCEPTION WHEN OTHERS THEN denied := SQLERRM LIKE '%Akses admin%'; END;
  ASSERT denied;
  SELECT * INTO q FROM karya_akhir_import_review WHERE source_key='new-a';
  denied := false;
  BEGIN PERFORM review_jadwal_karya_akhir_import(q.id,q.payload,q.updated_at);
  EXCEPTION WHEN OTHERS THEN denied := SQLERRM LIKE '%Akses admin%'; END;
  ASSERT denied;
  UPDATE "Teknisi" SET roles_id=1;
  RAISE NOTICE 'All persistent Karya Akhir review tests passed';
END;
$$;
SET ROLE authenticated;
DO $$ BEGIN
  ASSERT NOT has_function_privilege(current_user, 'public.apply_jadwal_karya_akhir_import(jsonb,timestamp without time zone,text)', 'EXECUTE');
  ASSERT NOT has_table_privilege(current_user, 'public.karya_akhir_import_review', 'INSERT');
END; $$;
SELECT count(*) FROM public.karya_akhir_import_review;
RESET ROLE;
UPDATE "Teknisi" SET roles_id=2;
SET ROLE authenticated;
DO $$ BEGIN ASSERT (SELECT count(*)=0 FROM public.karya_akhir_import_review); END; $$;
RESET ROLE;
