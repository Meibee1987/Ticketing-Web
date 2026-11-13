DO $$
DECLARE
  a jsonb := '{"source_key":"a","import_key":"legacy-a","row_number":1,"id_mata_kuliah":101,
    "id_angkatan":1,"id_angkatans":[1],"dosen_id":11,"dosen_ids":[],"penguji_ids":[],
    "ruangan_id":3,"jenis_pertemuan":"luring","mulai_jadwal":"2026-11-12T09:00:00",
    "akhir_jadwal":"2026-11-12T10:00:00","kelas":"REG","paralel":1,"real_perkuliahan":1}';
  b jsonb; c jsonb; d jsonb; e jsonb; result jsonb; q public.perkuliahan_import_review%ROWTYPE;
  sid bigint; version timestamptz; denied boolean := false;
BEGIN
  result := sync_jadwal_perkuliahan_review_import(jsonb_build_array(a),'2026-11-10','first');
  ASSERT result->>'workflow_version'='2' AND result->>'inserted'='1' AND result->>'pending'='0', result::text;
  SELECT schedule_id INTO sid FROM perkuliahan_import_review WHERE source_key='a';
  ASSERT (SELECT NOT locally_modified FROM perkuliahan_import_review WHERE source_key='a');
  result := sync_jadwal_perkuliahan_import(jsonb_build_array(a),'2026-11-10','repeat');
  ASSERT result->>'inserted'='0' AND result->>'updated'='1', result::text;
  ASSERT (SELECT created_by='first' FROM jadwal_perkuliahan WHERE id=sid);
  result := sync_jadwal_perkuliahan_review_import(jsonb_build_array(a,a || '{"source_key":"copy","import_key":"different-key"}'),'2026-11-10','duplicate');
  ASSERT result->>'skipped'='1' AND result->>'pending'='0', result::text;
  ASSERT (SELECT count(*)=1 FROM jadwal_perkuliahan);
  -- Dua versi sesi yang sama dengan pengampu berbeda tidak boleh diam-diam kehilangan dosen.
  result := sync_jadwal_perkuliahan_review_import(jsonb_build_array(a,a || '{"source_key":"different-panel","import_key":"different-panel","dosen_id":12}'),'2026-11-10','contradictory-event');
  ASSERT result->>'pending'='1' AND result->>'skipped'='1', result::text;
  ASSERT (SELECT dosen_id=11 FROM jadwal_perkuliahan WHERE id=sid);

  -- Konflik satu bagian tidak menahan jadwal lain; pengampu utama diperiksa sebagai ID.
  b := a || '{"source_key":"b","import_key":"b","id_mata_kuliah":102,"id_angkatan":2,"id_angkatans":[2],"dosen_id":20,"ruangan_id":4}';
  c := a || '{"source_key":"c","import_key":"c","id_angkatan":3,"id_angkatans":[3],"ruangan_id":3}';
  result := sync_jadwal_perkuliahan_review_import(jsonb_build_array(a,b,c),'2026-11-10','partial');
  ASSERT (SELECT status='active' FROM perkuliahan_import_review WHERE source_key='b');
  ASSERT (SELECT status='conflict' FROM perkuliahan_import_review WHERE source_key='c');
  ASSERT (SELECT mulai_jadwal='2026-11-12 09:00' FROM jadwal_perkuliahan WHERE id=sid);
  ASSERT NOT EXISTS (SELECT 1 FROM jadwal_perkuliahan WHERE id_angkatan=3);
  SELECT * INTO q FROM perkuliahan_import_review WHERE source_key='c';
  result := review_jadwal_perkuliahan_import(q.id,q.payload,q.updated_at);
  ASSERT result->>'activated'='false', result::text;
  SELECT * INTO q FROM perkuliahan_import_review WHERE source_key='c'; version := q.updated_at;
  result := review_jadwal_perkuliahan_import(q.id,q.payload || '{"mulai_jadwal":"2026-11-12T10:00:00","akhir_jadwal":"2026-11-12T11:00:00"}',q.updated_at);
  ASSERT result->>'activated'='true', result::text;
  BEGIN PERFORM review_jadwal_perkuliahan_import(q.id,q.payload,version);
  EXCEPTION WHEN OTHERS THEN denied := SQLERRM LIKE '%Data berubah%'; END;
  ASSERT denied;
  SELECT * INTO q FROM perkuliahan_import_review WHERE source_key='a';
  result := review_jadwal_perkuliahan_import(q.id,q.payload,q.updated_at);
  ASSERT result->>'activated'='true', result::text;
  result := sync_jadwal_perkuliahan_review_import(jsonb_build_array(a,b,c),'2026-11-10','repeat-correction');
  SELECT * INTO q FROM perkuliahan_import_review WHERE source_key='c';
  ASSERT q.status='active' AND q.payload->>'mulai_jadwal'='2026-11-12T10:00:00';
  c := c || '{"quota":30}';
  result := sync_jadwal_perkuliahan_review_import(jsonb_build_array(a,b,c),'2026-11-10','source-changed');
  ASSERT (SELECT status='source_changed' FROM perkuliahan_import_review WHERE source_key='c');

  -- Kode gabungan sama hanya sah untuk mata kuliah/waktu/lokasi/panel yang sama.
  d := a || '{"source_key":"merged-1","import_key":"merged-1","mulai_jadwal":"2026-11-15T09:00:00","akhir_jadwal":"2026-11-15T10:00:00","combined_class_key":"GAB-101-1","dosen_ids":[12]}';
  e := d || '{"source_key":"merged-2","import_key":"merged-2","id_angkatan":2,"id_angkatans":[2]}';
  result := sync_jadwal_perkuliahan_review_import(jsonb_build_array(d,e),'2026-11-10','combined');
  ASSERT result->>'total'='2' AND result->>'pending'='0', result::text;
  ASSERT (SELECT count(*)=2 FROM jadwal_perkuliahan WHERE combined_class_key='GAB-101-1');
  ASSERT public.perkuliahan_same_combined_session(d,e);
  ASSERT cardinality(public.check_perkuliahan_admin_record(d, (SELECT schedule_id FROM perkuliahan_import_review WHERE source_key='merged-1')))=0;
  ASSERT NOT public.perkuliahan_same_combined_session(d,e || '{"combined_class_key":null}');
  ASSERT NOT public.perkuliahan_same_combined_session(d,e || '{"id_mata_kuliah":102}');
  ASSERT NOT public.perkuliahan_same_combined_session(d,e || '{"akhir_jadwal":"2026-11-15T11:00:00"}');
  ASSERT NOT public.perkuliahan_same_combined_session(d,e || '{"ruangan_id":4}');
  ASSERT NOT public.perkuliahan_same_combined_session(d,e || '{"dosen_id":20}');
  ASSERT public.perkuliahan_same_combined_session(d || '{"jenis_pertemuan":"daring","ruangan_id":null}',e || '{"jenis_pertemuan":"daring","ruangan_id":null}');
  ASSERT NOT public.perkuliahan_same_combined_session(d || '{"ruangan_id":null}', e || '{"ruangan_id":null}');
  -- Grup sama tidak membebaskan konflik dengan jadwal KA.
  INSERT INTO jadwal_karya_akhir VALUES (1,4,'daring','2026-11-15 09:00','2026-11-15 10:00','[12]','[]');
  result := sync_jadwal_perkuliahan_review_import(jsonb_build_array(d,e),'2026-11-10','combined-cross-type');
  ASSERT result->>'pending'='2', result::text;
  DELETE FROM jadwal_karya_akhir;
  -- Koreksi lewat formulir admin biasa juga tidak ditimpa Google.
  UPDATE jadwal_perkuliahan SET note='Koreksi admin langsung'
    WHERE id=(SELECT schedule_id FROM perkuliahan_import_review WHERE source_key='merged-1');
  ASSERT (SELECT locally_modified AND payload->>'note'='Koreksi admin langsung' FROM perkuliahan_import_review WHERE source_key='merged-1');
  result := sync_jadwal_perkuliahan_review_import(jsonb_build_array(d,e),'2026-11-10','manual-edit-protected');
  ASSERT (SELECT payload->>'note'='Koreksi admin langsung' AND status='active' FROM perkuliahan_import_review WHERE source_key='merged-1');

  -- Referensi gagal disimpan, dapat dibenahi lewat admin tanpa import ulang.
  a := a || '{"source_key":"invalid","import_key":"invalid","id_mata_kuliah":999,"mulai_jadwal":"2026-11-20T09:00:00","akhir_jadwal":"2026-11-20T10:00:00","source_data":{"Kode MK":"MISSING"},"validation_issues":["Mata kuliah belum ada"]}';
  result := sync_jadwal_perkuliahan_review_import(jsonb_build_array(a),'2026-11-10','invalid');
  ASSERT result->>'pending'='1' AND result->>'deleted'='0', result::text;
  SELECT * INTO q FROM perkuliahan_import_review WHERE source_key='invalid';
  ASSERT q.status='invalid' AND q.source_data->>'Kode MK'='MISSING';
  result := review_jadwal_perkuliahan_import(q.id,q.payload || '{"id_mata_kuliah":101}',q.updated_at);
  ASSERT result->>'activated'='true', result::text;

  -- Pembersihan snapshot lengkap tetap melindungi koreksi lokal dan data manual.
  ASSERT EXISTS (SELECT 1 FROM jadwal_perkuliahan j JOIN perkuliahan_import_review r ON r.schedule_id=j.id WHERE r.source_key='c' AND r.locally_modified);
  UPDATE "Teknisi" SET roles_id=2;
  denied := false;
  BEGIN PERFORM sync_jadwal_perkuliahan_review_import(jsonb_build_array(a),'2026-11-10','denied');
  EXCEPTION WHEN OTHERS THEN denied := SQLERRM LIKE '%Akses admin%'; END;
  ASSERT denied;
  SELECT * INTO q FROM perkuliahan_import_review WHERE source_key='invalid';
  denied := false;
  BEGIN PERFORM review_jadwal_perkuliahan_import(q.id,q.payload,q.updated_at);
  EXCEPTION WHEN OTHERS THEN denied := SQLERRM LIKE '%Akses admin%'; END;
  ASSERT denied;
  UPDATE "Teknisi" SET roles_id=1;
  RAISE NOTICE 'All Perkuliahan review and combined-class tests passed';
END;
$$;
SET ROLE authenticated;
DO $$ BEGIN
  ASSERT NOT has_function_privilege(current_user, 'public.apply_jadwal_perkuliahan_import(jsonb,timestamp without time zone,text)', 'EXECUTE');
  ASSERT NOT has_table_privilege(current_user, 'public.perkuliahan_import_review', 'INSERT');
END; $$;
RESET ROLE;
UPDATE "Teknisi" SET roles_id=2;
SET ROLE authenticated;
DO $$ BEGIN ASSERT (SELECT count(*)=0 FROM public.perkuliahan_import_review); END; $$;
RESET ROLE;
