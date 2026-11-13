-- Jalankan di Supabase SQL Editor sebelum sinkronisasi Karya Akhir.
BEGIN;
-- Referensi agenda wajib tersedia sebelum frontend memvalidasi seluruh batch.
-- Padankan alias dari Google Sheet tanpa menambah agenda yang sudah setara.
LOCK TABLE public.agenda_karya_akhir IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO public.agenda_karya_akhir (agenda_karya_akhir)
SELECT agenda FROM (VALUES
  ('Presentasi Proposal'), ('Sidang Komisi'), ('Kolokium'), ('Seminar Hasil'),
  ('Ujian Tesis'), ('Presentasi Bisnis'), ('Prelim Lisan'), ('Ujian Skripsi'),
  ('Ujian Tertutup'), ('Promosi Terbuka')
) AS daftar(agenda)
WHERE NOT EXISTS (
  SELECT 1 FROM public.agenda_karya_akhir existing
  WHERE regexp_replace(
    regexp_replace(lower(btrim(existing.agenda_karya_akhir)), '\s+', ' ', 'g'),
    '^sidang promosi terbuka$', 'promosi terbuka'
  ) = lower(daftar.agenda)
);

ALTER TABLE public.jadwal_karya_akhir
  ADD COLUMN IF NOT EXISTS import_source TEXT,
  ADD COLUMN IF NOT EXISTS import_key TEXT,
  ADD COLUMN IF NOT EXISTS import_batch TEXT;

UPDATE public.jadwal_karya_akhir SET import_source = 'google_jadwal'
WHERE import_source IS NULL
  AND created_by ~ '-[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}:[0-9]{2}$';

CREATE UNIQUE INDEX IF NOT EXISTS jadwal_karya_akhir_import_source_key_uidx
ON public.jadwal_karya_akhir(import_source, import_key)
WHERE import_source IS NOT NULL AND import_key IS NOT NULL;

-- Kompatibel dengan array JSONB serta array yang dahulu tersimpan sebagai string.
CREATE OR REPLACE FUNCTION public.karya_akhir_import_ids(value JSONB)
RETURNS TEXT[] LANGUAGE SQL IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(array_agg(DISTINCT id), ARRAY[]::TEXT[])
  FROM jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(value) = 'array' THEN value
         WHEN jsonb_typeof(value) = 'string' THEN (value #>> '{}')::jsonb
         ELSE '[]'::jsonb END
  ) AS ids(id);
$$;

CREATE OR REPLACE FUNCTION public.karya_akhir_uses_room(meeting_type TEXT)
RETURNS BOOLEAN LANGUAGE SQL IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(meeting_type, 'luring') ILIKE '%hybrid%'
    OR (COALESCE(meeting_type, 'luring') NOT ILIKE '%daring%'
      AND COALESCE(meeting_type, 'luring') NOT ILIKE '%online%');
$$;

-- Penulis internal; hanya dipanggil setelah pemeriksaan antrean di bawah.
CREATE OR REPLACE FUNCTION public.apply_jadwal_karya_akhir_import(
  p_rows JSONB, p_scope_start TIMESTAMP WITHOUT TIME ZONE, p_batch_tag TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_item JSONB;
  v_record public.jadwal_karya_akhir%ROWTYPE;
  v_existing_id public.jadwal_karya_akhir.id%TYPE;
  v_keys TEXT[];
  v_ids TEXT[];
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
  v_deleted INTEGER := 0;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0
    OR p_scope_start IS NULL OR NULLIF(btrim(p_batch_tag), '') IS NULL THEN
    RAISE EXCEPTION 'Daftar jadwal, tanggal cakupan, dan batch wajib diisi';
  END IF;

  -- Serialisasi import serta perubahan jadwal selama pemeriksaan dan penyimpanan.
  LOCK TABLE public.jadwal_perkuliahan, public.jadwal_karya_akhir,
    public.jadwal_lain_lain IN SHARE ROW EXCLUSIVE MODE;

  SELECT array_agg(item->>'import_key') INTO v_keys
  FROM jsonb_array_elements(p_rows) AS rows(item);
  IF EXISTS (SELECT 1 FROM unnest(v_keys) k WHERE NULLIF(btrim(k), '') IS NULL)
    OR cardinality(v_keys) <> (SELECT count(DISTINCT k) FROM unnest(v_keys) k) THEN
    RAISE EXCEPTION 'Kunci import kosong atau duplikat';
  END IF;

  -- Duplikasi identitas acara ditolak meskipun ruangan/panel/key yang dikirim berbeda.
  IF EXISTS (
    SELECT 1 FROM jsonb_populate_recordset(NULL::public.jadwal_karya_akhir, p_rows)
    GROUP BY lower(regexp_replace(btrim(nama_mahasiswa), '\s+', ' ', 'g')),
      nama_angkatan, agenda_jadwal_karya_akhir, mulai_jadwal
    HAVING count(*) > 1
  ) THEN RAISE EXCEPTION 'Jadwal karya akhir duplikat dalam sumber'; END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    SELECT * INTO v_record FROM jsonb_populate_record(NULL::public.jadwal_karya_akhir, v_item);
    v_ids := public.karya_akhir_import_ids(v_record.dosen_ids)
      || public.karya_akhir_import_ids(v_record.penguji_ids);
    IF NULLIF(btrim(v_record.nama_mahasiswa), '') IS NULL
      OR v_record.nama_angkatan IS NULL OR v_record.agenda_jadwal_karya_akhir IS NULL
      OR v_record.mulai_jadwal IS NULL OR v_record.akhir_jadwal IS NULL
      OR v_record.mulai_jadwal < p_scope_start
      OR v_record.mulai_jadwal >= v_record.akhir_jadwal
      OR cardinality(v_ids) = 0
      OR cardinality(public.karya_akhir_import_ids(v_record.dosen_ids)) > 4
      OR cardinality(public.karya_akhir_import_ids(v_record.penguji_ids)) > 4 THEN
      RAISE EXCEPTION 'Record import tidak lengkap atau waktu tidak valid: %', v_record.import_key;
    END IF;
    IF EXISTS (SELECT 1 FROM unnest(v_ids) ids(id)
      WHERE NOT EXISTS (SELECT 1 FROM public.dosen d WHERE d.id::text = ids.id)) THEN
      RAISE EXCEPTION 'ID dosen tidak ada di master data: %', v_record.import_key;
    END IF;

    -- Semua baris sumber diperiksa, termasuk konflik pembimbing dengan penguji.
    IF EXISTS (
      SELECT 1 FROM jsonb_populate_recordset(NULL::public.jadwal_karya_akhir, p_rows) s
      WHERE s.import_key <> v_record.import_key
        AND s.mulai_jadwal < v_record.akhir_jadwal AND s.akhir_jadwal > v_record.mulai_jadwal
        AND (
          (public.karya_akhir_import_ids(s.dosen_ids) || public.karya_akhir_import_ids(s.penguji_ids)) && v_ids
          OR (s.nama_ruangan = v_record.nama_ruangan
            AND public.karya_akhir_uses_room(s.jenis_pertemuan)
            AND public.karya_akhir_uses_room(v_record.jenis_pertemuan)
            AND NOT EXISTS (SELECT 1 FROM public.ruangan r WHERE r.id = s.nama_ruangan
              AND lower(btrim(r.nama_ruangan)) = lower('Gardenia (Gd.B)')))
        )
    ) THEN RAISE EXCEPTION 'Konflik dosen/ruangan antarbaris sumber: %', v_record.import_key; END IF;

    -- Import lama dalam cakupan digantikan oleh seluruh batch baru. Jadwal manual
    -- dan jadwal dari jenis lain tetap menjadi pembanding konflik.
    IF EXISTS (
      WITH schedules AS (
        SELECT j.id::text AS id, 'ka' AS type, j.nama_mahasiswa AS student,
          j.nama_angkatan AS cohort, j.agenda_jadwal_karya_akhir AS agenda,
          j.nama_ruangan AS room, j.jenis_pertemuan AS meeting_type,
          j.mulai_jadwal AS starts, j.akhir_jadwal AS ends,
          public.karya_akhir_import_ids(j.dosen_ids) || public.karya_akhir_import_ids(j.penguji_ids) AS dosen
        FROM public.jadwal_karya_akhir j
        WHERE NOT (COALESCE(j.import_source = 'google_jadwal', false) AND j.mulai_jadwal >= p_scope_start)
        UNION ALL
        SELECT j.id::text, 'kuliah', NULL, NULL, NULL, j.ruangan_id, j.jenis_pertemuan,
          j.mulai_jadwal, j.akhir_jadwal,
          array_remove(ARRAY[j.dosen_id::text], NULL) || public.karya_akhir_import_ids(j.dosen_ids)
            || public.karya_akhir_import_ids(j.penguji_ids)
        FROM public.jadwal_perkuliahan j
        UNION ALL
        SELECT j.id::text, 'lain', NULL, NULL, NULL, j.nama_ruangan, j.jenis_pertemuan,
          j.mulai_jadwal, j.akhir_jadwal, ARRAY[]::TEXT[]
        FROM public.jadwal_lain_lain j
      )
      SELECT 1 FROM schedules s
      WHERE s.starts < v_record.akhir_jadwal AND s.ends > v_record.mulai_jadwal
        AND (s.dosen && v_ids
          OR (s.room = v_record.nama_ruangan
            AND public.karya_akhir_uses_room(s.meeting_type)
            AND public.karya_akhir_uses_room(v_record.jenis_pertemuan)
            AND NOT EXISTS (SELECT 1 FROM public.ruangan r WHERE r.id = s.room
              AND lower(btrim(r.nama_ruangan)) = lower('Gardenia (Gd.B)')))
          OR (s.type = 'ka' AND lower(regexp_replace(btrim(s.student), '\s+', ' ', 'g'))
              = lower(regexp_replace(btrim(v_record.nama_mahasiswa), '\s+', ' ', 'g'))
            AND s.cohort = v_record.nama_angkatan AND s.agenda = v_record.agenda_jadwal_karya_akhir
            AND s.starts = v_record.mulai_jadwal))
    ) THEN RAISE EXCEPTION 'Konflik dosen/ruangan atau duplikasi dengan jadwal database: %', v_record.import_key; END IF;
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    SELECT * INTO v_record FROM jsonb_populate_record(NULL::public.jadwal_karya_akhir, v_item);
    IF NOT public.karya_akhir_uses_room(v_record.jenis_pertemuan) THEN v_record.nama_ruangan := NULL; END IF;
    SELECT id INTO v_existing_id FROM public.jadwal_karya_akhir
      WHERE import_source = 'google_jadwal' AND import_key = v_record.import_key;
    IF v_existing_id IS NULL THEN
      INSERT INTO public.jadwal_karya_akhir (
        nama_mahasiswa, nama_angkatan, nama_ruangan, agenda_jadwal_karya_akhir, mulai_jadwal, akhir_jadwal, jenis_pertemuan, zoom_id, zoom_password, petugas_zoom, moderator, pintang_sps, note, dosen_ids, penguji_ids, created_by, updated_by, import_source, import_key, import_batch
      ) VALUES (
        v_record.nama_mahasiswa, v_record.nama_angkatan, v_record.nama_ruangan, v_record.agenda_jadwal_karya_akhir, v_record.mulai_jadwal, v_record.akhir_jadwal, v_record.jenis_pertemuan, v_record.zoom_id, v_record.zoom_password, v_record.petugas_zoom, v_record.moderator, v_record.pintang_sps, v_record.note, v_record.dosen_ids, v_record.penguji_ids, p_batch_tag, p_batch_tag, 'google_jadwal', v_record.import_key, p_batch_tag
      );
      v_inserted := v_inserted + 1;
    ELSE
      UPDATE public.jadwal_karya_akhir SET
        nama_mahasiswa = v_record.nama_mahasiswa,
        nama_angkatan = v_record.nama_angkatan,
        nama_ruangan = v_record.nama_ruangan,
        agenda_jadwal_karya_akhir = v_record.agenda_jadwal_karya_akhir,
        mulai_jadwal = v_record.mulai_jadwal,
        akhir_jadwal = v_record.akhir_jadwal,
        jenis_pertemuan = v_record.jenis_pertemuan,
        zoom_id = v_record.zoom_id,
        zoom_password = v_record.zoom_password,
        petugas_zoom = v_record.petugas_zoom,
        moderator = v_record.moderator,
        pintang_sps = v_record.pintang_sps,
        note = v_record.note,
        dosen_ids = v_record.dosen_ids,
        penguji_ids = v_record.penguji_ids,
        updated_by = p_batch_tag, updated_at = now(), import_batch = p_batch_tag
      WHERE id = v_existing_id;
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('inserted', v_inserted, 'updated', v_updated,
    'deleted', v_deleted, 'total', cardinality(v_keys));
END;
$$;
REVOKE ALL ON FUNCTION public.apply_jadwal_karya_akhir_import(JSONB, TIMESTAMP WITHOUT TIME ZONE, TEXT) FROM PUBLIC, authenticated;

-- Antrean terpisah: pembaca jadwal/monitor tetap hanya membaca tabel aktif.
CREATE TABLE IF NOT EXISTS public.karya_akhir_import_batches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_tag TEXT NOT NULL, scope_start TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.karya_akhir_import_review (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL, source_payload JSONB NOT NULL, source_data JSONB NOT NULL DEFAULT '{}',
  validation_issues TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','invalid','conflict','active','source_changed','duplicate','obsolete')),
  issues TEXT[] NOT NULL DEFAULT '{}',
  schedule_id BIGINT REFERENCES public.jadwal_karya_akhir(id) ON DELETE SET NULL,
  batch_id BIGINT NOT NULL REFERENCES public.karya_akhir_import_batches(id),
  row_number INTEGER, locally_modified BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS karya_akhir_review_status_idx ON public.karya_akhir_import_review(status, updated_at);

CREATE OR REPLACE FUNCTION public.can_manage_karya_akhir_import()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Teknisi" t JOIN public.roles r ON r.id = t.roles_id
    WHERE t.auth_id = auth.uid() AND lower(r.role) IN ('admin', 'super admin')
  ) OR EXISTS (
    SELECT 1 FROM public.dosen d JOIN public.roles r ON r.id = d.roles_id
    WHERE d.auth_id = auth.uid() AND lower(r.role) IN ('admin', 'super admin')
  );
$$;
REVOKE ALL ON FUNCTION public.can_manage_karya_akhir_import() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_karya_akhir_import() TO authenticated;
ALTER TABLE public.karya_akhir_import_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karya_akhir_import_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS karya_akhir_review_admin ON public.karya_akhir_import_review;
CREATE POLICY karya_akhir_review_admin ON public.karya_akhir_import_review FOR SELECT TO authenticated
USING (public.can_manage_karya_akhir_import());
DROP POLICY IF EXISTS karya_akhir_batch_admin ON public.karya_akhir_import_batches;
CREATE POLICY karya_akhir_batch_admin ON public.karya_akhir_import_batches FOR SELECT TO authenticated
USING (public.can_manage_karya_akhir_import());
REVOKE ALL ON public.karya_akhir_import_review, public.karya_akhir_import_batches FROM PUBLIC, authenticated;
GRANT SELECT ON public.karya_akhir_import_review, public.karya_akhir_import_batches TO authenticated;

CREATE OR REPLACE FUNCTION public.karya_akhir_review_issues(p_payload JSONB, p_existing_id BIGINT)
RETURNS TEXT[] LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  r public.jadwal_karya_akhir%ROWTYPE;
  ids TEXT[];
  issues TEXT[] := '{}';
  detail TEXT;
BEGIN
  SELECT * INTO r FROM jsonb_populate_record(NULL::public.jadwal_karya_akhir, p_payload);
  ids := public.karya_akhir_import_ids(r.dosen_ids) || public.karya_akhir_import_ids(r.penguji_ids);
  IF NULLIF(btrim(r.nama_mahasiswa), '') IS NULL THEN issues := array_append(issues, 'Nama mahasiswa wajib diisi'); END IF;
  IF r.mulai_jadwal IS NULL OR r.akhir_jadwal IS NULL OR r.mulai_jadwal >= r.akhir_jadwal THEN
    issues := array_append(issues, 'Waktu mulai/selesai tidak valid');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.angkatan WHERE id = r.nama_angkatan) THEN issues := array_append(issues, 'Angkatan tidak ditemukan'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agenda_karya_akhir WHERE id = r.agenda_jadwal_karya_akhir) THEN issues := array_append(issues, 'Agenda tidak ditemukan'); END IF;
  IF public.karya_akhir_uses_room(r.jenis_pertemuan) AND r.nama_ruangan IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.ruangan WHERE id = r.nama_ruangan) THEN issues := array_append(issues, 'Ruangan tidak ditemukan'); END IF;
  IF cardinality(ids) = 0 THEN issues := array_append(issues, 'Dosen pembimbing/penguji wajib diisi'); END IF;
  IF cardinality(public.karya_akhir_import_ids(r.dosen_ids)) > 4 OR cardinality(public.karya_akhir_import_ids(r.penguji_ids)) > 4 THEN
    issues := array_append(issues, 'Maksimal 4 pembimbing dan 4 penguji');
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(ids) x WHERE NOT EXISTS (SELECT 1 FROM public.dosen d WHERE d.id::text = x)) THEN
    issues := array_append(issues, 'ID dosen tidak ditemukan');
  END IF;
  IF cardinality(issues) > 0 THEN RETURN issues; END IF;

  WITH schedules AS (
    SELECT j.id, 'Karya Akhir' AS kind, j.nama_mahasiswa AS student, j.nama_angkatan AS cohort,
      j.agenda_jadwal_karya_akhir AS agenda, j.nama_ruangan AS room, j.jenis_pertemuan AS meeting,
      j.mulai_jadwal AS starts, j.akhir_jadwal AS ends,
      public.karya_akhir_import_ids(j.dosen_ids) || public.karya_akhir_import_ids(j.penguji_ids) AS dosen
    FROM public.jadwal_karya_akhir j WHERE p_existing_id IS NULL OR j.id <> p_existing_id
    UNION ALL
    SELECT j.id, 'Perkuliahan', NULL, NULL, NULL, j.ruangan_id, j.jenis_pertemuan,
      j.mulai_jadwal, j.akhir_jadwal, array_remove(ARRAY[j.dosen_id::text], NULL)
        || public.karya_akhir_import_ids(j.dosen_ids) || public.karya_akhir_import_ids(j.penguji_ids)
    FROM public.jadwal_perkuliahan j
    UNION ALL
    SELECT j.id, 'Lain-lain', NULL, NULL, NULL, j.nama_ruangan, j.jenis_pertemuan,
      j.mulai_jadwal, j.akhir_jadwal, ARRAY[]::TEXT[] FROM public.jadwal_lain_lain j
  )
  SELECT string_agg(
    CASE WHEN s.kind = 'Karya Akhir' AND lower(btrim(s.student)) = lower(btrim(r.nama_mahasiswa))
        AND s.cohort = r.nama_angkatan AND s.agenda = r.agenda_jadwal_karya_akhir AND s.starts = r.mulai_jadwal
      THEN 'Duplikat jadwal'
      WHEN s.dosen && ids THEN 'Konflik dosen ID ' || array_to_string(ARRAY(SELECT unnest(s.dosen) INTERSECT SELECT unnest(ids)), ', ')
      ELSE 'Konflik ruangan' END || ' dengan ' || s.kind || ' ID ' || s.id || ' (' || s.starts || ' - ' || s.ends || ')', '; ')
    INTO detail FROM schedules s
    WHERE s.starts < r.akhir_jadwal AND s.ends > r.mulai_jadwal AND (
      s.dosen && ids
      OR (s.room = r.nama_ruangan AND public.karya_akhir_uses_room(s.meeting) AND public.karya_akhir_uses_room(r.jenis_pertemuan)
        AND NOT EXISTS (SELECT 1 FROM public.ruangan WHERE id = s.room AND lower(btrim(nama_ruangan)) = lower('Gardenia (Gd.B)')))
      OR (s.kind = 'Karya Akhir' AND lower(btrim(s.student)) = lower(btrim(r.nama_mahasiswa))
        AND s.cohort = r.nama_angkatan AND s.agenda = r.agenda_jadwal_karya_akhir AND s.starts = r.mulai_jadwal)
    );
  IF detail IS NOT NULL THEN issues := array_append(issues, detail); END IF;
  RETURN issues;
EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow OR invalid_datetime_format THEN
  RETURN ARRAY['Format ID atau waktu tidak valid'];
END;
$$;
REVOKE ALL ON FUNCTION public.karya_akhir_review_issues(JSONB, BIGINT) FROM PUBLIC, authenticated;

-- Pembersihan hanya setelah SEMUA baris batch selesai. Koreksi lokal dilindungi.
CREATE OR REPLACE FUNCTION public.cleanup_karya_akhir_import(p_batch_id BIGINT)
RETURNS INTEGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n INTEGER := 0; start_day TIMESTAMP;
BEGIN
  SELECT scope_start INTO start_day FROM public.karya_akhir_import_batches WHERE id = p_batch_id;
  IF EXISTS (SELECT 1 FROM public.karya_akhir_import_review WHERE batch_id = p_batch_id
    AND status NOT IN ('active', 'duplicate', 'obsolete')) THEN RETURN 0; END IF;
  -- Batch yang lebih lama tidak boleh menghapus hasil snapshot yang lebih baru.
  IF p_batch_id <> (SELECT max(id) FROM public.karya_akhir_import_batches) THEN RETURN 0; END IF;
  DELETE FROM public.jadwal_karya_akhir j WHERE j.import_source = 'google_jadwal' AND j.mulai_jadwal >= start_day
    AND NOT EXISTS (SELECT 1 FROM public.karya_akhir_import_review q WHERE q.schedule_id = j.id
      AND (q.batch_id = p_batch_id OR q.locally_modified));
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE public.karya_akhir_import_review SET status = 'obsolete', updated_at = clock_timestamp()
    WHERE batch_id <> p_batch_id AND NOT locally_modified AND status <> 'obsolete';
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_karya_akhir_import(BIGINT) FROM PUBLIC, authenticated;

CREATE OR REPLACE FUNCTION public.karya_akhir_import_identity(p_payload JSONB)
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE r public.jadwal_karya_akhir%ROWTYPE;
BEGIN
  SELECT * INTO r FROM jsonb_populate_record(NULL::public.jadwal_karya_akhir, p_payload);
  RETURN jsonb_build_array(lower(regexp_replace(btrim(r.nama_mahasiswa), '\s+', ' ', 'g')),
    r.nama_angkatan, r.agenda_jadwal_karya_akhir, r.mulai_jadwal)::text;
EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow THEN
  RETURN p_payload::text;
END;
$$;
REVOKE ALL ON FUNCTION public.karya_akhir_import_identity(JSONB) FROM PUBLIC, authenticated;

CREATE OR REPLACE FUNCTION public.sync_jadwal_karya_akhir_review_import(
  p_rows JSONB, p_scope_start TIMESTAMP WITHOUT TIME ZONE, p_batch_tag TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_variable
DECLARE
  item JSONB; q public.karya_akhir_import_review%ROWTYPE; old_q public.karya_akhir_import_review%ROWTYPE;
  source_key TEXT; record_key TEXT; payload JSONB; source_keys TEXT[] := '{}'; event_keys TEXT[] := '{}';
  batch_id BIGINT; schedule_id BIGINT; old_count INTEGER; issues TEXT[]; peer public.karya_akhir_import_review%ROWTYPE;
  result JSONB; inserted INTEGER := 0; updated INTEGER := 0; pending INTEGER := 0; skipped INTEGER := 0; deleted INTEGER := 0;
  seen_ids BIGINT[] := '{}';
BEGIN
  IF NOT public.can_manage_karya_akhir_import() THEN RAISE EXCEPTION 'Akses admin diperlukan'; END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0
    OR p_scope_start IS NULL OR NULLIF(btrim(p_batch_tag), '') IS NULL THEN RAISE EXCEPTION 'Batch import kosong/tidak valid'; END IF;
  LOCK TABLE public.jadwal_perkuliahan, public.jadwal_karya_akhir, public.jadwal_lain_lain,
    public.karya_akhir_import_review, public.karya_akhir_import_batches IN SHARE ROW EXCLUSIVE MODE;
  INSERT INTO public.karya_akhir_import_batches(batch_tag, scope_start) VALUES (p_batch_tag, p_scope_start) RETURNING id INTO batch_id;
  FOR item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    payload := item - 'source_key' - 'source_data' - 'validation_issues' - 'row_number' - 'import_batch' - 'updated_by' - 'import_source';
    source_key := COALESCE(NULLIF(item->>'source_key', ''), NULLIF(item->>'import_key', ''));
    IF source_key IS NULL THEN RAISE EXCEPTION 'Identitas sumber wajib diisi'; END IF;
    -- Hitung identitas di server; beda key/ruangan/panel tidak boleh menyamarkan duplikat.
    record_key := public.karya_akhir_import_identity(payload);
    IF source_key = ANY(source_keys) THEN
      IF EXISTS (SELECT 1 FROM public.karya_akhir_import_review r WHERE r.source_key = source_key AND r.source_payload IS DISTINCT FROM payload) THEN
        UPDATE public.karya_akhir_import_review r SET
          validation_issues = array_append(r.validation_issues, 'ID sumber duplikat dengan isi berbeda; pilih data yang benar'),
          source_data = r.source_data || jsonb_build_object('Duplikat sumber', COALESCE(item->'source_data', item))
          WHERE r.source_key = source_key;
      END IF;
      skipped := skipped + 1; CONTINUE;
    END IF;
    source_keys := array_append(source_keys, source_key);
    SELECT * INTO old_q FROM public.karya_akhir_import_review r WHERE r.source_key = source_key;
    schedule_id := old_q.schedule_id;
    -- Menghubungkan hasil importer versi lama tanpa mengubah jadwal manual.
    IF schedule_id IS NULL THEN
      SELECT count(*), min(j.id) INTO old_count, schedule_id FROM public.jadwal_karya_akhir j
      WHERE j.import_source = 'google_jadwal'
        AND NOT EXISTS (SELECT 1 FROM public.karya_akhir_import_review protected
          WHERE protected.schedule_id = j.id AND protected.locally_modified AND protected.source_key <> source_key)
        AND (j.import_key = item->>'import_key' OR
        (lower(btrim(j.nama_mahasiswa)) = lower(btrim(payload->>'nama_mahasiswa'))
          AND j.nama_angkatan::text = payload->>'nama_angkatan'
          AND (j.agenda_jadwal_karya_akhir::text = payload->>'agenda_jadwal_karya_akhir'
            -- Import lama dapat menyimpan NULL ketika master agenda belum ada.
            -- Pulihkan dari sumber hanya pada mahasiswa, angkatan, dan waktu
            -- yang sama; pemeriksaan old_count tetap menolak pasangan ambigu.
            OR (j.agenda_jadwal_karya_akhir IS NULL
              AND j.mulai_jadwal = (payload->>'mulai_jadwal')::timestamp
              AND j.akhir_jadwal = (payload->>'akhir_jadwal')::timestamp))));
      IF old_count <> 1 OR schedule_id = ANY(seen_ids) THEN schedule_id := NULL; END IF;
    END IF;
    IF schedule_id IS NOT NULL THEN seen_ids := array_append(seen_ids, schedule_id); END IF;
    issues := ARRAY(SELECT jsonb_array_elements_text(COALESCE(item->'validation_issues', '[]')));
    INSERT INTO public.karya_akhir_import_review AS target(
      source_key, payload, source_payload, source_data, validation_issues, status, issues, schedule_id, batch_id, row_number
    ) VALUES (source_key, payload, payload, COALESCE(item->'source_data', '{}'), issues,
      CASE WHEN record_key = ANY(event_keys) THEN 'duplicate' ELSE 'pending' END,
      CASE WHEN record_key = ANY(event_keys) THEN ARRAY['Duplikat identik di sumber; tidak membuat jadwal baru'] ELSE '{}' END,
      schedule_id, batch_id, (item->>'row_number')::integer
    ) ON CONFLICT ON CONSTRAINT karya_akhir_import_review_source_key_key DO UPDATE SET
      payload = CASE WHEN target.locally_modified THEN target.payload ELSE EXCLUDED.payload END,
      source_payload = EXCLUDED.source_payload, source_data = EXCLUDED.source_data,
      validation_issues = CASE WHEN target.locally_modified THEN '{}' ELSE EXCLUDED.validation_issues END,
      status = CASE WHEN target.locally_modified AND target.source_payload IS DISTINCT FROM EXCLUDED.source_payload THEN 'source_changed'
        WHEN target.locally_modified AND target.status = 'source_changed' THEN 'source_changed'
        WHEN target.locally_modified AND target.status = 'active' AND target.schedule_id IS NOT NULL THEN 'active' ELSE EXCLUDED.status END,
      issues = CASE WHEN target.locally_modified AND target.source_payload IS DISTINCT FROM EXCLUDED.source_payload
        THEN ARRAY['Sumber Google berubah; koreksi lokal dipertahankan. Tinjau lalu aktifkan kembali.']
        WHEN target.locally_modified AND target.status = 'source_changed' THEN target.issues ELSE EXCLUDED.issues END,
      schedule_id = EXCLUDED.schedule_id, batch_id = EXCLUDED.batch_id, row_number = EXCLUDED.row_number,
      updated_at = clock_timestamp();
    event_keys := array_append(event_keys, record_key);
  END LOOP;

  -- Nilai kandidat diambil sebelum penulisan, sehingga kedua pihak konflik antarbaris ditandai.
  FOR q IN SELECT * FROM public.karya_akhir_import_review r WHERE r.batch_id = batch_id ORDER BY r.id LOOP
    IF q.status IN ('active', 'source_changed') AND q.locally_modified THEN CONTINUE; END IF;
    IF q.status = 'duplicate' THEN skipped := skipped + 1; CONTINUE; END IF;
    issues := q.validation_issues || public.karya_akhir_review_issues(q.payload, q.schedule_id);
    IF cardinality(issues) = 0 THEN
      FOR peer IN SELECT * FROM public.karya_akhir_import_review r WHERE r.batch_id = batch_id
        AND r.id <> q.id AND r.status <> 'duplicate' AND cardinality(r.validation_issues) = 0 LOOP
        IF public.karya_akhir_review_issues(peer.payload, peer.schedule_id) && ARRAY['Format ID atau waktu tidak valid'] THEN CONTINUE; END IF;
        IF (peer.payload->>'mulai_jadwal')::timestamp < (q.payload->>'akhir_jadwal')::timestamp
          AND (peer.payload->>'akhir_jadwal')::timestamp > (q.payload->>'mulai_jadwal')::timestamp THEN
          IF (public.karya_akhir_import_ids(peer.payload->'dosen_ids') || public.karya_akhir_import_ids(peer.payload->'penguji_ids'))
            && (public.karya_akhir_import_ids(q.payload->'dosen_ids') || public.karya_akhir_import_ids(q.payload->'penguji_ids')) THEN
            issues := array_append(issues, 'Konflik dosen dengan baris ' || COALESCE(peer.row_number::text, peer.id::text));
          END IF;
          IF peer.payload->>'nama_ruangan' = q.payload->>'nama_ruangan'
            AND public.karya_akhir_uses_room(peer.payload->>'jenis_pertemuan') AND public.karya_akhir_uses_room(q.payload->>'jenis_pertemuan')
            AND NOT EXISTS (SELECT 1 FROM public.ruangan WHERE id::text = q.payload->>'nama_ruangan' AND lower(btrim(nama_ruangan)) = lower('Gardenia (Gd.B)')) THEN
            issues := array_append(issues, 'Konflik ruangan dengan baris ' || COALESCE(peer.row_number::text, peer.id::text));
          END IF;
        END IF;
      END LOOP;
    END IF;
    UPDATE public.karya_akhir_import_review SET issues = issues,
      status = CASE WHEN cardinality(issues) = 0 THEN 'pending'
        WHEN array_to_string(issues, ' ') ILIKE '%konflik%' OR array_to_string(issues, ' ') ILIKE '%duplikat%' THEN 'conflict' ELSE 'invalid' END
      WHERE id = q.id;
  END LOOP;

  FOR q IN SELECT * FROM public.karya_akhir_import_review r WHERE r.batch_id = batch_id AND r.status = 'pending' ORDER BY r.id LOOP
    BEGIN
      payload := q.payload || jsonb_build_object('import_key', 'ka-source|' || md5(q.source_key));
      IF q.schedule_id IS NOT NULL THEN UPDATE public.jadwal_karya_akhir SET import_key = payload->>'import_key' WHERE id = q.schedule_id; END IF;
      result := public.apply_jadwal_karya_akhir_import(jsonb_build_array(payload), p_scope_start, p_batch_tag);
      SELECT j.id INTO schedule_id FROM public.jadwal_karya_akhir j WHERE j.import_source = 'google_jadwal' AND j.import_key = payload->>'import_key';
      UPDATE public.karya_akhir_import_review SET status = 'active', schedule_id = schedule_id, issues = '{}', updated_at = clock_timestamp() WHERE id = q.id;
      inserted := inserted + (result->>'inserted')::integer; updated := updated + (result->>'updated')::integer;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.karya_akhir_import_review SET status = 'invalid', issues = ARRAY[SQLERRM], updated_at = clock_timestamp() WHERE id = q.id;
    END;
  END LOOP;
  SELECT count(*) INTO pending FROM public.karya_akhir_import_review r WHERE r.batch_id = batch_id AND r.status NOT IN ('active','duplicate','obsolete');
  deleted := public.cleanup_karya_akhir_import(batch_id);
  RETURN jsonb_build_object('workflow_version', 2, 'inserted', inserted, 'updated', updated, 'deleted', deleted, 'pending', pending, 'skipped', skipped,
    'total', inserted + updated, 'batch_id', batch_id);
END;
$$;
REVOKE ALL ON FUNCTION public.sync_jadwal_karya_akhir_review_import(JSONB, TIMESTAMP WITHOUT TIME ZONE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_jadwal_karya_akhir_review_import(JSONB, TIMESTAMP WITHOUT TIME ZONE, TEXT) TO authenticated;

-- Kompatibilitas frontend lama setelah migrasi: tetap memakai antrean pemeriksaan.
CREATE OR REPLACE FUNCTION public.sync_jadwal_karya_akhir_import(
  p_rows JSONB, p_scope_start TIMESTAMP WITHOUT TIME ZONE, p_batch_tag TEXT
) RETURNS JSONB LANGUAGE SQL SECURITY INVOKER SET search_path = public AS $$
  SELECT public.sync_jadwal_karya_akhir_review_import(p_rows, p_scope_start, p_batch_tag);
$$;
REVOKE ALL ON FUNCTION public.sync_jadwal_karya_akhir_import(JSONB, TIMESTAMP WITHOUT TIME ZONE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_jadwal_karya_akhir_import(JSONB, TIMESTAMP WITHOUT TIME ZONE, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_jadwal_karya_akhir_import(
  p_id BIGINT, p_payload JSONB, p_expected_updated_at TIMESTAMPTZ
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_variable
DECLARE q public.karya_akhir_import_review%ROWTYPE; issues TEXT[]; result JSONB; payload JSONB; sid BIGINT; scope_start TIMESTAMP; tag TEXT;
BEGIN
  IF NOT public.can_manage_karya_akhir_import() THEN RAISE EXCEPTION 'Akses admin diperlukan'; END IF;
  LOCK TABLE public.jadwal_perkuliahan, public.jadwal_karya_akhir, public.jadwal_lain_lain,
    public.karya_akhir_import_review, public.karya_akhir_import_batches IN SHARE ROW EXCLUSIVE MODE;
  SELECT * INTO q FROM public.karya_akhir_import_review WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR q.status IN ('obsolete','duplicate') THEN RAISE EXCEPTION 'Data pemeriksaan tidak tersedia'; END IF;
  IF p_expected_updated_at IS NULL OR q.updated_at <> p_expected_updated_at THEN RAISE EXCEPTION 'Data berubah. Muat ulang sebelum menyimpan'; END IF;
  SELECT b.scope_start, b.batch_tag INTO scope_start, tag FROM public.karya_akhir_import_batches b WHERE b.id = q.batch_id;
  payload := p_payload || jsonb_build_object('import_key', 'ka-source|' || md5(q.source_key));
  issues := public.karya_akhir_review_issues(payload, q.schedule_id);
  BEGIN
    IF (payload->>'mulai_jadwal')::timestamp < scope_start THEN issues := array_append(issues, 'Waktu di luar cakupan import'); END IF;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
    issues := array_append(issues, 'Format waktu tidak valid');
  END;
  IF cardinality(issues) = 0 THEN
    BEGIN
      IF q.schedule_id IS NOT NULL THEN UPDATE public.jadwal_karya_akhir SET import_key = payload->>'import_key' WHERE id = q.schedule_id; END IF;
      result := public.apply_jadwal_karya_akhir_import(jsonb_build_array(payload), scope_start, tag);
      SELECT j.id INTO sid FROM public.jadwal_karya_akhir j WHERE j.import_source = 'google_jadwal' AND j.import_key = payload->>'import_key';
    EXCEPTION WHEN OTHERS THEN issues := array_append(issues, SQLERRM);
    END;
  END IF;
  UPDATE public.karya_akhir_import_review SET payload = p_payload, locally_modified = p_payload IS DISTINCT FROM q.source_payload,
    validation_issues = '{}', issues = issues, status = CASE WHEN cardinality(issues) = 0 THEN 'active'
      WHEN array_to_string(issues, ' ') ILIKE '%konflik%' OR array_to_string(issues, ' ') ILIKE '%duplikat%' THEN 'conflict' ELSE 'invalid' END,
    schedule_id = COALESCE(sid, q.schedule_id), updated_at = clock_timestamp() WHERE id = q.id;
  PERFORM public.cleanup_karya_akhir_import(q.batch_id);
  RETURN jsonb_build_object('activated', cardinality(issues) = 0, 'issues', to_jsonb(issues));
END;
$$;
REVOKE ALL ON FUNCTION public.review_jadwal_karya_akhir_import(BIGINT, JSONB, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_jadwal_karya_akhir_import(BIGINT, JSONB, TIMESTAMPTZ) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;


