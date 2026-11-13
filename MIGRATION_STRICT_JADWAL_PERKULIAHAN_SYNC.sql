-- Sinkronisasi authoritative Google Sheet -> jadwal_perkuliahan.
-- Jalankan satu kali di Supabase SQL Editor sebelum memakai mode import ketat.
BEGIN;

ALTER TABLE public.jadwal_perkuliahan
  ADD COLUMN IF NOT EXISTS import_source TEXT,
  ADD COLUMN IF NOT EXISTS import_key TEXT,
  ADD COLUMN IF NOT EXISTS import_batch TEXT,
  ADD COLUMN IF NOT EXISTS lokasi_virtual TEXT,
  ADD COLUMN IF NOT EXISTS combined_class_key TEXT;

-- Batch import versi lama menyimpan created_by dalam format
-- "Nama-YYYY-MM-DD HH:MM:SS". Tandai agar sinkronisasi pertama dapat
-- membersihkan data import lama tanpa menyentuh jadwal yang dibuat manual.
UPDATE public.jadwal_perkuliahan
SET import_source = 'google_jadwal'
WHERE import_source IS NULL
  AND created_by ~ '-[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}:[0-9]{2}$';

CREATE UNIQUE INDEX IF NOT EXISTS jadwal_perkuliahan_import_source_key_uidx
  ON public.jadwal_perkuliahan (import_source, import_key)
  WHERE import_source IS NOT NULL AND import_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_jadwal_perkuliahan_angkatans()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_distinct INTEGER;
BEGIN
  IF NEW.id_angkatans IS NULL
    OR jsonb_typeof(NEW.id_angkatans) <> 'array'
    OR jsonb_array_length(NEW.id_angkatans) = 0
  THEN
    RAISE EXCEPTION 'id_angkatans wajib berupa array yang tidak kosong';
  END IF;

  SELECT count(*), count(DISTINCT value)
  INTO v_total, v_distinct
  FROM jsonb_array_elements_text(NEW.id_angkatans);

  IF v_total <> v_distinct THEN
    RAISE EXCEPTION 'id_angkatans tidak boleh berisi ID duplikat';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(NEW.id_angkatans) AS ids(value)
    WHERE ids.value::BIGINT = NEW.id_angkatan
  ) THEN
    RAISE EXCEPTION 'id_angkatan utama wajib ada di id_angkatans';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(NEW.id_angkatans) AS ids(value)
    LEFT JOIN public.angkatan ON angkatan.id = ids.value::BIGINT
    WHERE angkatan.id IS NULL
  ) THEN
    RAISE EXCEPTION 'id_angkatans berisi angkatan yang tidak ditemukan';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jadwal_perkuliahan_validate_angkatans
  ON public.jadwal_perkuliahan;

CREATE TRIGGER jadwal_perkuliahan_validate_angkatans
BEFORE INSERT OR UPDATE OF id_angkatan, id_angkatans
ON public.jadwal_perkuliahan
FOR EACH ROW
EXECUTE FUNCTION public.validate_jadwal_perkuliahan_angkatans();

CREATE OR REPLACE FUNCTION public.apply_jadwal_perkuliahan_import(
  p_rows JSONB,
  p_scope_start TIMESTAMP WITHOUT TIME ZONE,
  p_batch_tag TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_record public.jadwal_perkuliahan%ROWTYPE;
  v_existing_id public.jadwal_perkuliahan.id%TYPE;
  v_keys TEXT[];
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
  v_deleted INTEGER := 0;
  v_previous_write_flag TEXT;
BEGIN
  v_previous_write_flag := current_setting('app.perkuliahan_import_write', true);
  PERFORM set_config('app.perkuliahan_import_write', '1', true);
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'Daftar jadwal untuk sinkronisasi kosong';
  END IF;

  SELECT array_agg(item->>'import_key')
  INTO v_keys
  FROM jsonb_array_elements(p_rows) AS rows(item);

  IF EXISTS (
    SELECT 1
    FROM unnest(v_keys) AS keys(key)
    WHERE key IS NULL OR btrim(key) = ''
  ) THEN
    RAISE EXCEPTION 'Semua jadwal wajib memiliki import_key';
  END IF;

  IF EXISTS (
    SELECT key
    FROM unnest(v_keys) AS keys(key)
    GROUP BY key
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Terdapat import_key duplikat dalam sumber jadwal';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    SELECT *
    INTO v_record
    FROM jsonb_populate_record(NULL::public.jadwal_perkuliahan, v_item);

    IF NOT public.perkuliahan_uses_room(v_record.jenis_pertemuan) THEN v_record.ruangan_id := NULL; END IF;

    IF v_record.mulai_jadwal IS NULL
      OR v_record.akhir_jadwal IS NULL
      OR v_record.mulai_jadwal >= v_record.akhir_jadwal
      OR v_record.id_mata_kuliah IS NULL
      OR v_record.id_angkatan IS NULL
      OR v_record.dosen_id IS NULL
    THEN
      RAISE EXCEPTION 'Record import tidak lengkap atau waktu tidak valid: %',
        v_record.import_key;
    END IF;

    SELECT id
    INTO v_existing_id
    FROM public.jadwal_perkuliahan
    WHERE import_source = 'google_jadwal'
      AND import_key = v_record.import_key
    LIMIT 1;

    IF v_existing_id IS NULL THEN
      INSERT INTO public.jadwal_perkuliahan (
        dosen_id,
        ruangan_id,
        id_angkatan,
        id_angkatans,
        id_mata_kuliah,
        mulai_jadwal,
        akhir_jadwal,
        jenis_pertemuan,
        lokasi_virtual,
        zoom_id,
        zoom_password,
        note,
        paralel,
        real_perkuliahan,
        petugas_zoom,
        moderator,
        dosen_ids,
        penguji_ids,
        pintang_sps,
        kelas,
        kegiatan,
        combined_class_key,
        quota,
        created_by,
        updated_by,
        import_source,
        import_key,
        import_batch
      ) VALUES (
        v_record.dosen_id,
        v_record.ruangan_id,
        v_record.id_angkatan,
        COALESCE(v_record.id_angkatans, '[]'::jsonb),
        v_record.id_mata_kuliah,
        v_record.mulai_jadwal,
        v_record.akhir_jadwal,
        v_record.jenis_pertemuan,
        v_record.lokasi_virtual,
        v_record.zoom_id,
        v_record.zoom_password,
        v_record.note,
        v_record.paralel,
        v_record.real_perkuliahan,
        v_record.petugas_zoom,
        v_record.moderator,
        COALESCE(v_record.dosen_ids, '[]'::jsonb),
        COALESCE(v_record.penguji_ids, '[]'::jsonb),
        v_record.pintang_sps,
        v_record.kelas,
        v_record.kegiatan,
        v_record.combined_class_key,
        v_record.quota,
        p_batch_tag,
        p_batch_tag,
        'google_jadwal',
        v_record.import_key,
        p_batch_tag
      );
      v_inserted := v_inserted + 1;
    ELSE
      UPDATE public.jadwal_perkuliahan
      SET dosen_id = v_record.dosen_id,
          ruangan_id = v_record.ruangan_id,
          id_angkatan = v_record.id_angkatan,
          id_angkatans = COALESCE(v_record.id_angkatans, '[]'::jsonb),
          id_mata_kuliah = v_record.id_mata_kuliah,
          mulai_jadwal = v_record.mulai_jadwal,
          akhir_jadwal = v_record.akhir_jadwal,
          jenis_pertemuan = v_record.jenis_pertemuan,
          lokasi_virtual = v_record.lokasi_virtual,
          zoom_id = v_record.zoom_id,
          zoom_password = v_record.zoom_password,
          note = v_record.note,
          paralel = v_record.paralel,
          real_perkuliahan = v_record.real_perkuliahan,
          petugas_zoom = v_record.petugas_zoom,
          moderator = v_record.moderator,
          dosen_ids = COALESCE(v_record.dosen_ids, '[]'::jsonb),
          penguji_ids = COALESCE(v_record.penguji_ids, '[]'::jsonb),
          pintang_sps = v_record.pintang_sps,
          kelas = v_record.kelas,
          kegiatan = v_record.kegiatan,
          combined_class_key = v_record.combined_class_key,
          quota = v_record.quota,
          updated_by = p_batch_tag,
          updated_at = now(),
          import_batch = p_batch_tag
      WHERE id = v_existing_id;
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  PERFORM set_config('app.perkuliahan_import_write', COALESCE(v_previous_write_flag, ''), true);
  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'deleted', v_deleted,
    'total', jsonb_array_length(p_rows)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_jadwal_perkuliahan_import(JSONB, TIMESTAMP WITHOUT TIME ZONE, TEXT) FROM PUBLIC, authenticated;
-- Kompatibel dengan array JSONB serta array yang dahulu tersimpan sebagai string.
CREATE OR REPLACE FUNCTION public.perkuliahan_import_ids(value JSONB)
RETURNS TEXT[] LANGUAGE SQL IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(array_agg(DISTINCT id), ARRAY[]::TEXT[])
  FROM jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(value) = 'array' THEN value
         WHEN jsonb_typeof(value) = 'string' THEN (value #>> '{}')::jsonb
         ELSE '[]'::jsonb END
  ) AS ids(id);
$$;

CREATE OR REPLACE FUNCTION public.perkuliahan_uses_room(meeting_type TEXT)
RETURNS BOOLEAN LANGUAGE SQL IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(meeting_type, 'luring') ILIKE '%hybrid%'
    OR (COALESCE(meeting_type, 'luring') NOT ILIKE '%daring%'
      AND COALESCE(meeting_type, 'luring') NOT ILIKE '%online%');
$$;

-- Antrean terpisah: pembaca jadwal/monitor tetap hanya membaca tabel aktif.
CREATE TABLE IF NOT EXISTS public.perkuliahan_import_batches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_tag TEXT NOT NULL, scope_start TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.perkuliahan_import_review (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL, source_payload JSONB NOT NULL, source_data JSONB NOT NULL DEFAULT '{}',
  validation_issues TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','invalid','conflict','active','source_changed','duplicate','obsolete')),
  issues TEXT[] NOT NULL DEFAULT '{}',
  schedule_id BIGINT REFERENCES public.jadwal_perkuliahan(id) ON DELETE SET NULL,
  batch_id BIGINT NOT NULL REFERENCES public.perkuliahan_import_batches(id),
  row_number INTEGER, locally_modified BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS perkuliahan_review_status_idx ON public.perkuliahan_import_review(status, updated_at);
CREATE INDEX IF NOT EXISTS perkuliahan_review_batch_idx ON public.perkuliahan_import_review(batch_id, id);
CREATE INDEX IF NOT EXISTS perkuliahan_review_schedule_idx ON public.perkuliahan_import_review(schedule_id);
CREATE INDEX IF NOT EXISTS perkuliahan_schedule_import_lookup_idx ON public.jadwal_perkuliahan(import_source, import_key);
CREATE INDEX IF NOT EXISTS perkuliahan_schedule_time_idx ON public.jadwal_perkuliahan(mulai_jadwal, akhir_jadwal);
CREATE INDEX IF NOT EXISTS karya_akhir_schedule_time_idx ON public.jadwal_karya_akhir(mulai_jadwal, akhir_jadwal);
CREATE INDEX IF NOT EXISTS lain_lain_schedule_time_idx ON public.jadwal_lain_lain(mulai_jadwal, akhir_jadwal);
ALTER TABLE public.perkuliahan_import_batches
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'complete',
  ADD COLUMN IF NOT EXISTS inserted_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skipped_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.can_manage_perkuliahan_import()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Teknisi" t JOIN public.roles r ON r.id = t.roles_id
    WHERE t.auth_id = auth.uid() AND lower(r.role) IN ('admin', 'super admin')
  ) OR EXISTS (
    SELECT 1 FROM public.dosen d JOIN public.roles r ON r.id = d.roles_id
    WHERE d.auth_id = auth.uid() AND lower(r.role) IN ('admin', 'super admin')
  );
$$;
REVOKE ALL ON FUNCTION public.can_manage_perkuliahan_import() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_perkuliahan_import() TO authenticated;
ALTER TABLE public.perkuliahan_import_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perkuliahan_import_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS perkuliahan_review_admin ON public.perkuliahan_import_review;
CREATE POLICY perkuliahan_review_admin ON public.perkuliahan_import_review FOR SELECT TO authenticated
USING (public.can_manage_perkuliahan_import());
DROP POLICY IF EXISTS perkuliahan_batch_admin ON public.perkuliahan_import_batches;
CREATE POLICY perkuliahan_batch_admin ON public.perkuliahan_import_batches FOR SELECT TO authenticated
USING (public.can_manage_perkuliahan_import());
REVOKE ALL ON public.perkuliahan_import_review, public.perkuliahan_import_batches FROM PUBLIC, authenticated;
GRANT SELECT ON public.perkuliahan_import_review, public.perkuliahan_import_batches TO authenticated;


CREATE OR REPLACE FUNCTION public.perkuliahan_panel_ids(p_payload JSONB)
RETURNS TEXT[] LANGUAGE SQL IMMUTABLE SET search_path = public AS $$
  SELECT ARRAY(SELECT DISTINCT id FROM unnest(
    array_remove(ARRAY[p_payload->>'dosen_id'], NULL) ||
    public.perkuliahan_import_ids(p_payload->'dosen_ids') ||
    public.perkuliahan_import_ids(p_payload->'penguji_ids')) ids(id) ORDER BY id);
$$;
CREATE OR REPLACE FUNCTION public.perkuliahan_import_identity(p_payload JSONB)
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE r public.jadwal_perkuliahan%ROWTYPE;
BEGIN
  SELECT * INTO r FROM jsonb_populate_record(NULL::public.jadwal_perkuliahan, p_payload);
  RETURN jsonb_build_array(r.id_mata_kuliah,
    ARRAY(SELECT unnest(public.perkuliahan_import_ids(r.id_angkatans)) ORDER BY 1),
    r.paralel, COALESCE(r.kelas, ''), r.real_perkuliahan, r.mulai_jadwal)::text;
EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow THEN RETURN p_payload::text;
END;
$$;
CREATE OR REPLACE FUNCTION public.perkuliahan_same_combined_session(a JSONB, b JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE ra public.jadwal_perkuliahan%ROWTYPE; rb public.jadwal_perkuliahan%ROWTYPE;
BEGIN
  SELECT * INTO ra FROM jsonb_populate_record(NULL::public.jadwal_perkuliahan, a);
  SELECT * INTO rb FROM jsonb_populate_record(NULL::public.jadwal_perkuliahan, b);
  RETURN COALESCE(
    NULLIF(lower(btrim(ra.combined_class_key)), '') = NULLIF(lower(btrim(rb.combined_class_key)), '')
    AND ra.id_mata_kuliah = rb.id_mata_kuliah
    AND ra.mulai_jadwal = rb.mulai_jadwal AND ra.akhir_jadwal = rb.akhir_jadwal
    AND public.perkuliahan_panel_ids(a) = public.perkuliahan_panel_ids(b)
    AND (
      (NOT public.perkuliahan_uses_room(ra.jenis_pertemuan) AND NOT public.perkuliahan_uses_room(rb.jenis_pertemuan))
      OR (public.perkuliahan_uses_room(ra.jenis_pertemuan) AND public.perkuliahan_uses_room(rb.jenis_pertemuan)
        AND ra.ruangan_id IS NOT NULL AND ra.ruangan_id = rb.ruangan_id)
    ), false);
EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow THEN RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.perkuliahan_panel_ids(JSONB), public.perkuliahan_import_identity(JSONB),
  public.perkuliahan_same_combined_session(JSONB, JSONB) FROM PUBLIC, authenticated;

CREATE OR REPLACE FUNCTION public.perkuliahan_review_issues(p_payload JSONB, p_existing_id BIGINT)
RETURNS TEXT[] LANGUAGE plpgsql SET search_path = public AS $$
DECLARE r public.jadwal_perkuliahan%ROWTYPE; ids TEXT[]; cohorts TEXT[]; issues TEXT[] := '{}'; detail TEXT;
BEGIN
  SELECT * INTO r FROM jsonb_populate_record(NULL::public.jadwal_perkuliahan, p_payload);
  ids := public.perkuliahan_panel_ids(p_payload);
  cohorts := public.perkuliahan_import_ids(r.id_angkatans);
  IF r.mulai_jadwal IS NULL OR r.akhir_jadwal IS NULL OR r.mulai_jadwal >= r.akhir_jadwal THEN
    issues := array_append(issues, 'Waktu mulai/selesai tidak valid'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.mata_kuliah WHERE id = r.id_mata_kuliah) THEN
    issues := array_append(issues, 'Mata kuliah tidak ditemukan'); END IF;
  IF r.id_angkatan IS NULL OR NOT (r.id_angkatan::text = ANY(cohorts)) OR cardinality(cohorts) = 0 OR
    EXISTS (SELECT 1 FROM unnest(cohorts) x WHERE NOT EXISTS (SELECT 1 FROM public.angkatan a WHERE a.id::text = x)) THEN
    issues := array_append(issues, 'Angkatan tidak ditemukan atau angkatan utama tidak ada dalam daftar'); END IF;
  IF r.dosen_id IS NULL OR EXISTS (SELECT 1 FROM unnest(ids) x WHERE NOT EXISTS (SELECT 1 FROM public.dosen d WHERE d.id::text = x)) THEN
    issues := array_append(issues, 'ID dosen pengampu/tambahan/penguji tidak ditemukan'); END IF;
  IF public.perkuliahan_uses_room(r.jenis_pertemuan) AND r.ruangan_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.ruangan WHERE id = r.ruangan_id) THEN issues := array_append(issues, 'Ruangan tidak ditemukan'); END IF;
  IF cardinality(issues) > 0 THEN RETURN issues; END IF;
  WITH schedules AS (
    SELECT j.id, 'Perkuliahan' AS kind, j.ruangan_id AS room, j.jenis_pertemuan AS meeting,
      j.mulai_jadwal AS starts, j.akhir_jadwal AS ends,
      public.perkuliahan_panel_ids(to_jsonb(j)) AS dosen, to_jsonb(j) AS payload
    FROM public.jadwal_perkuliahan j WHERE p_existing_id IS NULL OR j.id <> p_existing_id
    UNION ALL
    SELECT j.id, 'Karya Akhir', j.nama_ruangan, j.jenis_pertemuan, j.mulai_jadwal, j.akhir_jadwal,
      public.perkuliahan_import_ids(j.dosen_ids) || public.perkuliahan_import_ids(j.penguji_ids), to_jsonb(j)
    FROM public.jadwal_karya_akhir j
    UNION ALL
    SELECT j.id, 'Lain-lain', j.nama_ruangan, j.jenis_pertemuan, j.mulai_jadwal, j.akhir_jadwal,
      ARRAY[]::TEXT[], to_jsonb(j) FROM public.jadwal_lain_lain j
  )
  SELECT string_agg(
    CASE WHEN s.kind = 'Perkuliahan' AND public.perkuliahan_import_identity(s.payload) = public.perkuliahan_import_identity(p_payload)
      THEN 'Duplikat jadwal'
      WHEN s.dosen && ids THEN 'Konflik dosen ID ' || array_to_string(ARRAY(SELECT unnest(s.dosen) INTERSECT SELECT unnest(ids)), ', ')
      ELSE 'Konflik ruangan' END || ' dengan ' || s.kind || ' ID ' || s.id || ' (' || s.starts || ' - ' || s.ends || ')', '; ')
    INTO detail FROM schedules s
    WHERE s.starts < r.akhir_jadwal AND s.ends > r.mulai_jadwal AND (
      (s.kind = 'Perkuliahan' AND public.perkuliahan_import_identity(s.payload) = public.perkuliahan_import_identity(p_payload))
      OR (NOT (s.kind = 'Perkuliahan' AND public.perkuliahan_same_combined_session(p_payload, s.payload)) AND (
        s.dosen && ids OR
        (s.room = r.ruangan_id AND public.perkuliahan_uses_room(s.meeting) AND public.perkuliahan_uses_room(r.jenis_pertemuan)
          AND NOT EXISTS (SELECT 1 FROM public.ruangan WHERE id = s.room AND lower(btrim(nama_ruangan)) = lower('Gardenia (Gd.B)')))
      ))
    );
  IF detail IS NOT NULL THEN issues := array_append(issues, detail); END IF;
  RETURN issues;
EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow OR invalid_datetime_format OR invalid_parameter_value THEN
  RETURN ARRAY['Format ID atau waktu tidak valid'];
END;
$$;
REVOKE ALL ON FUNCTION public.perkuliahan_review_issues(JSONB, BIGINT) FROM PUBLIC, authenticated;
-- Pembersihan hanya setelah SEMUA baris batch selesai. Koreksi lokal dilindungi.
CREATE OR REPLACE FUNCTION public.cleanup_perkuliahan_import(p_batch_id BIGINT)
RETURNS INTEGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n INTEGER := 0; start_day TIMESTAMP;
BEGIN
  SELECT scope_start INTO start_day FROM public.perkuliahan_import_batches WHERE id = p_batch_id;
  IF EXISTS (SELECT 1 FROM public.perkuliahan_import_batches WHERE id = p_batch_id AND processing_status = 'processing') THEN RETURN 0; END IF;
  IF EXISTS (SELECT 1 FROM public.perkuliahan_import_review WHERE batch_id = p_batch_id
    AND status NOT IN ('active', 'duplicate', 'obsolete')) THEN RETURN 0; END IF;
  -- Batch yang lebih lama tidak boleh menghapus hasil snapshot yang lebih baru.
  IF p_batch_id <> (SELECT max(id) FROM public.perkuliahan_import_batches) THEN RETURN 0; END IF;
  DELETE FROM public.jadwal_perkuliahan j WHERE j.import_source = 'google_jadwal' AND j.mulai_jadwal >= start_day
    AND NOT EXISTS (SELECT 1 FROM public.perkuliahan_import_review q WHERE q.schedule_id = j.id
      AND (q.batch_id = p_batch_id OR q.locally_modified));
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE public.perkuliahan_import_review SET status = 'obsolete', schedule_id = NULL, updated_at = clock_timestamp()
    WHERE batch_id <> p_batch_id AND NOT locally_modified AND status <> 'obsolete';
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_perkuliahan_import(BIGINT) FROM PUBLIC, authenticated;

CREATE OR REPLACE FUNCTION public.stage_jadwal_perkuliahan_review_import(
  p_rows JSONB, p_scope_start TIMESTAMP WITHOUT TIME ZONE, p_batch_tag TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_variable
DECLARE
  item JSONB; q public.perkuliahan_import_review%ROWTYPE; old_q public.perkuliahan_import_review%ROWTYPE;
  source_key TEXT; record_key TEXT; payload JSONB; source_keys TEXT[] := '{}'; event_keys TEXT[] := '{}';
  batch_id BIGINT; schedule_id BIGINT; old_count INTEGER; issues TEXT[]; peer public.perkuliahan_import_review%ROWTYPE;
  result JSONB; inserted INTEGER := 0; updated INTEGER := 0; pending INTEGER := 0; skipped INTEGER := 0; deleted INTEGER := 0;
  seen_ids BIGINT[] := '{}'; cached_issues JSONB := '{}';
BEGIN
  IF NOT public.can_manage_perkuliahan_import() THEN RAISE EXCEPTION 'Akses admin diperlukan'; END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0
    OR p_scope_start IS NULL OR NULLIF(btrim(p_batch_tag), '') IS NULL THEN RAISE EXCEPTION 'Batch import kosong/tidak valid'; END IF;
  LOCK TABLE public.jadwal_perkuliahan, public.jadwal_karya_akhir, public.jadwal_lain_lain,
    public.perkuliahan_import_review, public.perkuliahan_import_batches IN SHARE ROW EXCLUSIVE MODE;
  INSERT INTO public.perkuliahan_import_batches(batch_tag, scope_start) VALUES (p_batch_tag, p_scope_start) RETURNING id INTO batch_id;
  FOR item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    payload := item - 'source_key' - 'source_data' - 'validation_issues' - 'row_number' - 'import_batch' - 'updated_by' - 'import_source';
    source_key := COALESCE(NULLIF(item->>'source_key', ''), NULLIF(item->>'import_key', ''));
    IF source_key IS NULL THEN RAISE EXCEPTION 'Identitas sumber wajib diisi'; END IF;
    -- Hitung identitas di server; beda key/ruangan/panel tidak boleh menyamarkan duplikat.
    record_key := public.perkuliahan_import_identity(payload);
    IF source_key = ANY(source_keys) THEN
      IF EXISTS (SELECT 1 FROM public.perkuliahan_import_review r WHERE r.source_key = source_key AND r.source_payload IS DISTINCT FROM payload) THEN
        UPDATE public.perkuliahan_import_review r SET
          validation_issues = array_append(r.validation_issues, 'ID sumber duplikat dengan isi berbeda; pilih data yang benar'),
          status = CASE WHEN r.locally_modified AND r.schedule_id IS NOT NULL THEN 'source_changed' ELSE r.status END,
          issues = ARRAY['ID sumber duplikat dengan isi berbeda; pilih data yang benar'],
          source_data = r.source_data || jsonb_build_object('Duplikat sumber', COALESCE(item->'source_data', item))
          WHERE r.source_key = source_key;
      END IF;
      skipped := skipped + 1; CONTINUE;
    END IF;
    source_keys := array_append(source_keys, source_key);
    IF record_key = ANY(event_keys) THEN
      SELECT * INTO peer FROM public.perkuliahan_import_review r WHERE r.batch_id = batch_id
        AND r.status <> 'duplicate' AND public.perkuliahan_import_identity(r.source_payload) = record_key ORDER BY r.id LIMIT 1;
      IF FOUND AND (peer.source_payload - 'import_key') IS DISTINCT FROM (payload - 'import_key') THEN
        UPDATE public.perkuliahan_import_review r SET
          validation_issues = array_append(r.validation_issues, 'Identitas jadwal sama tetapi isi berbeda; gabungkan dosen atau pilih data yang benar'),
          status = CASE WHEN r.locally_modified AND r.schedule_id IS NOT NULL THEN 'source_changed' ELSE r.status END,
          issues = ARRAY['Identitas jadwal sama tetapi isi berbeda; gabungkan dosen atau pilih data yang benar'],
          source_data = r.source_data || jsonb_build_object('Duplikat sumber', COALESCE(item->'source_data', item))
          WHERE r.id = peer.id;
      END IF;
    END IF;
    SELECT * INTO old_q FROM public.perkuliahan_import_review r WHERE r.source_key = source_key;
    schedule_id := old_q.schedule_id;
    -- Menghubungkan hasil importer versi lama tanpa mengubah jadwal manual.
    IF schedule_id IS NULL THEN
      SELECT count(*), min(j.id) INTO old_count, schedule_id FROM public.jadwal_perkuliahan j
      WHERE j.import_source = 'google_jadwal'
        AND NOT EXISTS (SELECT 1 FROM public.perkuliahan_import_review protected
          WHERE protected.schedule_id = j.id AND protected.locally_modified AND protected.source_key <> source_key)
        AND (j.import_key = item->>'import_key' OR
        (j.id_mata_kuliah::text = payload->>'id_mata_kuliah'
          AND public.perkuliahan_import_ids(j.id_angkatans) @> public.perkuliahan_import_ids(payload->'id_angkatans')
          AND public.perkuliahan_import_ids(j.id_angkatans) <@ public.perkuliahan_import_ids(payload->'id_angkatans')
          AND j.paralel IS NOT DISTINCT FROM NULLIF(payload->>'paralel', '')::integer
          AND COALESCE(j.kelas, '') = COALESCE(payload->>'kelas', '')
          AND j.real_perkuliahan IS NOT DISTINCT FROM NULLIF(payload->>'real_perkuliahan', '')::integer));
      IF old_count <> 1 OR schedule_id = ANY(seen_ids) THEN schedule_id := NULL; END IF;
    END IF;
    IF schedule_id IS NOT NULL THEN seen_ids := array_append(seen_ids, schedule_id); END IF;
    issues := ARRAY(SELECT jsonb_array_elements_text(COALESCE(item->'validation_issues', '[]')));
    INSERT INTO public.perkuliahan_import_review AS target(
      source_key, payload, source_payload, source_data, validation_issues, status, issues, schedule_id, batch_id, row_number
    ) VALUES (source_key, payload, payload, COALESCE(item->'source_data', '{}'), issues,
      CASE WHEN record_key = ANY(event_keys) THEN 'duplicate' ELSE 'pending' END,
      CASE WHEN record_key = ANY(event_keys) THEN ARRAY['Duplikat identik di sumber; tidak membuat jadwal baru'] ELSE '{}' END,
      schedule_id, batch_id, (item->>'row_number')::integer
    ) ON CONFLICT ON CONSTRAINT perkuliahan_import_review_source_key_key DO UPDATE SET
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

  skipped := skipped + (SELECT count(*) FROM public.perkuliahan_import_review r WHERE r.batch_id = batch_id AND r.status = 'duplicate');
  RETURN jsonb_build_object('batch_id', batch_id, 'skipped', skipped);
END;
$$;
REVOKE ALL ON FUNCTION public.stage_jadwal_perkuliahan_review_import(JSONB, TIMESTAMP WITHOUT TIME ZONE, TEXT) FROM PUBLIC, authenticated;

CREATE OR REPLACE FUNCTION public.sync_jadwal_perkuliahan_review_import(
  p_rows JSONB, p_scope_start TIMESTAMP WITHOUT TIME ZONE, p_batch_tag TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_variable
DECLARE
  item JSONB; q public.perkuliahan_import_review%ROWTYPE; old_q public.perkuliahan_import_review%ROWTYPE;
  source_key TEXT; record_key TEXT; payload JSONB; source_keys TEXT[] := '{}'; event_keys TEXT[] := '{}';
  batch_id BIGINT; schedule_id BIGINT; old_count INTEGER; issues TEXT[]; peer public.perkuliahan_import_review%ROWTYPE;
  result JSONB; inserted INTEGER := 0; updated INTEGER := 0; pending INTEGER := 0; skipped INTEGER := 0; deleted INTEGER := 0;
  seen_ids BIGINT[] := '{}'; cached_issues JSONB := '{}';
BEGIN
  result := public.stage_jadwal_perkuliahan_review_import(p_rows,p_scope_start,p_batch_tag);
  batch_id := (result->>'batch_id')::bigint;
  skipped := (result->>'skipped')::integer;
  -- Periksa tiap kandidat terhadap database SATU kali sebelum penulisan.
  -- Jangan panggil validator database lagi dalam perulangan pasangan baris:
  -- pada batch besar hal itu memindai seluruh jadwal hingga N x N kali.
  FOR q IN SELECT * FROM public.perkuliahan_import_review r WHERE r.batch_id = batch_id
    AND r.status <> 'duplicate' ORDER BY r.id LOOP
    cached_issues := cached_issues || jsonb_build_object(q.id::text,
      to_jsonb(public.perkuliahan_review_issues(q.payload, q.schedule_id)));
  END LOOP;

  -- Nilai kandidat diambil sebelum penulisan, sehingga kedua pihak konflik antarbaris ditandai.
  FOR q IN SELECT * FROM public.perkuliahan_import_review r WHERE r.batch_id = batch_id ORDER BY r.id LOOP
    IF q.status IN ('active', 'source_changed') AND q.locally_modified THEN CONTINUE; END IF;
    IF q.status = 'duplicate' THEN CONTINUE; END IF;
    issues := q.validation_issues || ARRAY(SELECT jsonb_array_elements_text(cached_issues->q.id::text));
    IF cardinality(issues) = 0 THEN
      FOR peer IN SELECT * FROM public.perkuliahan_import_review r WHERE r.batch_id = batch_id
        AND r.id <> q.id AND r.status <> 'duplicate' AND cardinality(r.validation_issues) = 0
        -- CASE melindungi cast timestamp untuk baris dengan format salah.
        -- Hanya baris pada waktu bertumpang tindih masuk pemeriksaan panel/ruangan.
        AND CASE WHEN (cached_issues->r.id::text) ? 'Format ID atau waktu tidak valid' THEN false
          ELSE (r.payload->>'mulai_jadwal')::timestamp < (q.payload->>'akhir_jadwal')::timestamp
            AND (r.payload->>'akhir_jadwal')::timestamp > (q.payload->>'mulai_jadwal')::timestamp END LOOP
        IF (peer.payload->>'mulai_jadwal')::timestamp < (q.payload->>'akhir_jadwal')::timestamp
          AND (peer.payload->>'akhir_jadwal')::timestamp > (q.payload->>'mulai_jadwal')::timestamp
          AND NOT public.perkuliahan_same_combined_session(q.payload, peer.payload) THEN
          IF public.perkuliahan_panel_ids(peer.payload) && public.perkuliahan_panel_ids(q.payload) THEN
            issues := array_append(issues, 'Konflik dosen dengan baris ' || COALESCE(peer.row_number::text, peer.id::text));
          END IF;
          IF peer.payload->>'ruangan_id' = q.payload->>'ruangan_id'
            AND public.perkuliahan_uses_room(peer.payload->>'jenis_pertemuan') AND public.perkuliahan_uses_room(q.payload->>'jenis_pertemuan')
            AND NOT EXISTS (SELECT 1 FROM public.ruangan WHERE id::text = q.payload->>'ruangan_id' AND lower(btrim(nama_ruangan)) = lower('Gardenia (Gd.B)')) THEN
            issues := array_append(issues, 'Konflik ruangan dengan baris ' || COALESCE(peer.row_number::text, peer.id::text));
          END IF;
        END IF;
      END LOOP;
    END IF;
    UPDATE public.perkuliahan_import_review SET issues = issues,
      status = CASE WHEN cardinality(issues) = 0 THEN 'pending'
        WHEN array_to_string(issues, ' ') ILIKE '%konflik%' OR array_to_string(issues, ' ') ILIKE '%duplikat%' THEN 'conflict' ELSE 'invalid' END
      WHERE id = q.id;
  END LOOP;

  FOR q IN SELECT * FROM public.perkuliahan_import_review r WHERE r.batch_id = batch_id AND r.status = 'pending' ORDER BY r.id LOOP
    BEGIN
      payload := q.payload || jsonb_build_object('import_key', 'kuliah-source|' || md5(q.source_key));
      IF q.schedule_id IS NOT NULL THEN UPDATE public.jadwal_perkuliahan SET import_key = payload->>'import_key' WHERE id = q.schedule_id; END IF;
      result := public.apply_jadwal_perkuliahan_import(jsonb_build_array(payload), p_scope_start, p_batch_tag);
      SELECT j.id INTO schedule_id FROM public.jadwal_perkuliahan j WHERE j.import_source = 'google_jadwal' AND j.import_key = payload->>'import_key';
      UPDATE public.perkuliahan_import_review SET status = 'active', schedule_id = schedule_id, issues = '{}', updated_at = clock_timestamp() WHERE id = q.id;
      inserted := inserted + (result->>'inserted')::integer; updated := updated + (result->>'updated')::integer;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.perkuliahan_import_review SET status = 'invalid', issues = ARRAY[SQLERRM], updated_at = clock_timestamp() WHERE id = q.id;
    END;
  END LOOP;
  SELECT count(*) INTO pending FROM public.perkuliahan_import_review r WHERE r.batch_id = batch_id AND r.status NOT IN ('active','duplicate','obsolete');
  deleted := public.cleanup_perkuliahan_import(batch_id);
  RETURN jsonb_build_object('workflow_version', 2, 'inserted', inserted, 'updated', updated, 'deleted', deleted, 'pending', pending, 'skipped', skipped,
    'total', inserted + updated, 'batch_id', batch_id);
END;
$$;
REVOKE ALL ON FUNCTION public.sync_jadwal_perkuliahan_review_import(JSONB, TIMESTAMP WITHOUT TIME ZONE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_jadwal_perkuliahan_review_import(JSONB, TIMESTAMP WITHOUT TIME ZONE, TEXT) TO authenticated;

-- Batch bertahap: request awal hanya menyimpan antrean, request berikutnya
-- memeriksa maksimal 25 baris. Seluruh sumber sudah tersedia untuk cek silang.
CREATE OR REPLACE FUNCTION public.perkuliahan_import_overlaps(a JSONB, b JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SET search_path = public AS $$
DECLARE ra public.jadwal_perkuliahan%ROWTYPE; rb public.jadwal_perkuliahan%ROWTYPE;
BEGIN
  SELECT * INTO ra FROM jsonb_populate_record(NULL::public.jadwal_perkuliahan, a);
  SELECT * INTO rb FROM jsonb_populate_record(NULL::public.jadwal_perkuliahan, b);
  RETURN COALESCE(ra.mulai_jadwal < ra.akhir_jadwal AND rb.mulai_jadwal < rb.akhir_jadwal
    AND ra.mulai_jadwal < rb.akhir_jadwal AND ra.akhir_jadwal > rb.mulai_jadwal, false);
EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow OR invalid_parameter_value THEN RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.perkuliahan_import_overlaps(JSONB, JSONB) FROM PUBLIC, authenticated;

CREATE OR REPLACE FUNCTION public.begin_jadwal_perkuliahan_review_import(
  p_rows JSONB, p_scope_start TIMESTAMP WITHOUT TIME ZONE, p_batch_tag TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result JSONB; bid BIGINT; remaining INTEGER; pending INTEGER;
BEGIN
  -- stage juga memeriksa izin admin dan mengunci tabel selama transaksi ini.
  result := public.stage_jadwal_perkuliahan_review_import(p_rows,p_scope_start,p_batch_tag);
  bid := (result->>'batch_id')::bigint;
  SELECT count(*) FILTER (WHERE status='pending'),
    count(*) FILTER (WHERE status NOT IN ('active','duplicate','obsolete'))
    INTO remaining,pending FROM public.perkuliahan_import_review WHERE batch_id=bid;
  UPDATE public.perkuliahan_import_batches SET processing_status='processing',
    skipped_count=(result->>'skipped')::integer WHERE id=bid;
  RETURN result || jsonb_build_object('workflow_version',3,'remaining',remaining,'pending',pending,'complete',false,
    'inserted',0,'updated',0,'deleted',0,'total',0);
END;
$$;
REVOKE ALL ON FUNCTION public.begin_jadwal_perkuliahan_review_import(JSONB, TIMESTAMP WITHOUT TIME ZONE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.begin_jadwal_perkuliahan_review_import(JSONB, TIMESTAMP WITHOUT TIME ZONE, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.process_jadwal_perkuliahan_review_import(p_batch_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_variable
DECLARE batch public.perkuliahan_import_batches%ROWTYPE; q public.perkuliahan_import_review%ROWTYPE;
  peer public.perkuliahan_import_review%ROWTYPE; issues TEXT[]; payload JSONB; ids TEXT[]; shared_ids TEXT[];
  result JSONB; sid BIGINT; remaining INTEGER; pending INTEGER; inserted INTEGER:=0; updated INTEGER:=0; deleted INTEGER:=0;
BEGIN
  IF NOT public.can_manage_perkuliahan_import() THEN RAISE EXCEPTION 'Akses admin diperlukan'; END IF;
  LOCK TABLE public.jadwal_perkuliahan, public.jadwal_karya_akhir, public.jadwal_lain_lain,
    public.perkuliahan_import_review, public.perkuliahan_import_batches IN SHARE ROW EXCLUSIVE MODE;
  SELECT * INTO batch FROM public.perkuliahan_import_batches WHERE id=p_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch import tidak ditemukan'; END IF;
  IF p_batch_id <> (SELECT max(id) FROM public.perkuliahan_import_batches) THEN
    RAISE EXCEPTION 'Ada import yang lebih baru. Muat ulang halaman untuk melihat hasil terbaru'; END IF;
  IF batch.processing_status='processing' THEN
    FOR q IN SELECT * FROM public.perkuliahan_import_review WHERE batch_id=p_batch_id AND status='pending' ORDER BY id LIMIT 25 LOOP
      issues := q.validation_issues || public.perkuliahan_review_issues(q.payload,q.schedule_id);
      IF cardinality(issues)=0 THEN
        ids := public.perkuliahan_panel_ids(q.payload);
        FOR peer IN SELECT * FROM public.perkuliahan_import_review r WHERE r.batch_id=p_batch_id
          AND r.id<>q.id AND r.status<>'duplicate' AND cardinality(r.validation_issues)=0
          AND public.perkuliahan_import_overlaps(q.payload,r.payload) LOOP
          IF public.perkuliahan_same_combined_session(q.payload,peer.payload) THEN CONTINUE; END IF;
          shared_ids := ARRAY(SELECT unnest(ids) INTERSECT SELECT unnest(public.perkuliahan_panel_ids(peer.payload)));
          IF cardinality(shared_ids)>0 THEN
            issues := array_append(issues,'Konflik dosen ID ' || array_to_string(shared_ids,', ')
              || ' dengan Perkuliahan baris sumber ' || COALESCE(peer.row_number::text,peer.id::text)
              || ' (' || (peer.payload->>'mulai_jadwal')::timestamp || ' - ' || (peer.payload->>'akhir_jadwal')::timestamp || ')');
          END IF;
          IF peer.payload->>'ruangan_id'=q.payload->>'ruangan_id'
            AND public.perkuliahan_uses_room(peer.payload->>'jenis_pertemuan') AND public.perkuliahan_uses_room(q.payload->>'jenis_pertemuan')
            AND NOT EXISTS (SELECT 1 FROM public.ruangan WHERE id::text=q.payload->>'ruangan_id' AND lower(btrim(nama_ruangan))=lower('Gardenia (Gd.B)')) THEN
            issues := array_append(issues,'Konflik ruangan dengan Perkuliahan baris sumber ' || COALESCE(peer.row_number::text,peer.id::text)
              || ' (' || (peer.payload->>'mulai_jadwal')::timestamp || ' - ' || (peer.payload->>'akhir_jadwal')::timestamp || ')');
          END IF;
        END LOOP;
      END IF;
      IF cardinality(issues)=0 THEN
        BEGIN
          payload := q.payload || jsonb_build_object('import_key','kuliah-source|' || md5(q.source_key));
          IF q.schedule_id IS NOT NULL THEN UPDATE public.jadwal_perkuliahan SET import_key=payload->>'import_key' WHERE id=q.schedule_id; END IF;
          result := public.apply_jadwal_perkuliahan_import(jsonb_build_array(payload),batch.scope_start,batch.batch_tag);
          SELECT id INTO sid FROM public.jadwal_perkuliahan WHERE import_source='google_jadwal' AND import_key=payload->>'import_key';
          inserted := inserted+(result->>'inserted')::integer; updated := updated+(result->>'updated')::integer;
        EXCEPTION WHEN OTHERS THEN issues := array_append(issues,SQLERRM);
        END;
      END IF;
      UPDATE public.perkuliahan_import_review SET issues=issues,
        status=CASE WHEN cardinality(issues)=0 THEN 'active'
          WHEN array_to_string(issues,' ') ILIKE '%konflik%' OR array_to_string(issues,' ') ILIKE '%duplikat%' THEN 'conflict' ELSE 'invalid' END,
        schedule_id=CASE WHEN cardinality(issues)=0 THEN sid ELSE q.schedule_id END,updated_at=clock_timestamp() WHERE id=q.id;
    END LOOP;
    SELECT count(*) INTO remaining FROM public.perkuliahan_import_review WHERE batch_id=p_batch_id AND status='pending';
    UPDATE public.perkuliahan_import_batches SET inserted_count=inserted_count+inserted,updated_count=updated_count+updated,
      processing_status=CASE WHEN remaining=0 THEN 'complete' ELSE 'processing' END WHERE id=p_batch_id;
    IF remaining=0 THEN
      deleted := public.cleanup_perkuliahan_import(p_batch_id);
      UPDATE public.perkuliahan_import_batches SET deleted_count=deleted WHERE id=p_batch_id;
    END IF;
  END IF;
  SELECT * INTO batch FROM public.perkuliahan_import_batches WHERE id=p_batch_id;
  SELECT count(*) FILTER (WHERE status='pending'),count(*) FILTER (WHERE status NOT IN ('active','duplicate','obsolete'))
    INTO remaining,pending FROM public.perkuliahan_import_review WHERE batch_id=p_batch_id;
  RETURN jsonb_build_object('workflow_version',3,'batch_id',p_batch_id,'remaining',remaining,'pending',pending,
    'complete',batch.processing_status='complete','inserted',batch.inserted_count,'updated',batch.updated_count,
    'deleted',batch.deleted_count,'skipped',batch.skipped_count,'total',batch.inserted_count+batch.updated_count);
END;
$$;
REVOKE ALL ON FUNCTION public.process_jadwal_perkuliahan_review_import(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_jadwal_perkuliahan_review_import(BIGINT) TO authenticated;

-- Kompatibilitas frontend lama setelah migrasi: tetap memakai antrean pemeriksaan.
CREATE OR REPLACE FUNCTION public.sync_jadwal_perkuliahan_import(
  p_rows JSONB, p_scope_start TIMESTAMP WITHOUT TIME ZONE, p_batch_tag TEXT
) RETURNS JSONB LANGUAGE SQL SECURITY INVOKER SET search_path = public AS $$
  SELECT public.sync_jadwal_perkuliahan_review_import(p_rows, p_scope_start, p_batch_tag);
$$;
REVOKE ALL ON FUNCTION public.sync_jadwal_perkuliahan_import(JSONB, TIMESTAMP WITHOUT TIME ZONE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_jadwal_perkuliahan_import(JSONB, TIMESTAMP WITHOUT TIME ZONE, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_jadwal_perkuliahan_import(
  p_id BIGINT, p_payload JSONB, p_expected_updated_at TIMESTAMPTZ
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_variable
DECLARE q public.perkuliahan_import_review%ROWTYPE; issues TEXT[]; result JSONB; payload JSONB; sid BIGINT; scope_start TIMESTAMP; tag TEXT;
BEGIN
  IF NOT public.can_manage_perkuliahan_import() THEN RAISE EXCEPTION 'Akses admin diperlukan'; END IF;
  LOCK TABLE public.jadwal_perkuliahan, public.jadwal_karya_akhir, public.jadwal_lain_lain,
    public.perkuliahan_import_review, public.perkuliahan_import_batches IN SHARE ROW EXCLUSIVE MODE;
  SELECT * INTO q FROM public.perkuliahan_import_review WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR q.status IN ('obsolete','duplicate') THEN RAISE EXCEPTION 'Data pemeriksaan tidak tersedia'; END IF;
  IF p_expected_updated_at IS NULL OR q.updated_at <> p_expected_updated_at THEN RAISE EXCEPTION 'Data berubah. Muat ulang sebelum menyimpan'; END IF;
  SELECT b.scope_start, b.batch_tag INTO scope_start, tag FROM public.perkuliahan_import_batches b WHERE b.id = q.batch_id;
  payload := p_payload || jsonb_build_object('import_key', 'kuliah-source|' || md5(q.source_key));
  issues := public.perkuliahan_review_issues(payload, q.schedule_id);
  BEGIN
    IF (payload->>'mulai_jadwal')::timestamp < scope_start THEN issues := array_append(issues, 'Waktu di luar cakupan import'); END IF;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
    issues := array_append(issues, 'Format waktu tidak valid');
  END;
  IF cardinality(issues) = 0 THEN
    BEGIN
      IF q.schedule_id IS NOT NULL THEN UPDATE public.jadwal_perkuliahan SET import_key = payload->>'import_key' WHERE id = q.schedule_id; END IF;
      result := public.apply_jadwal_perkuliahan_import(jsonb_build_array(payload), scope_start, tag);
      SELECT j.id INTO sid FROM public.jadwal_perkuliahan j WHERE j.import_source = 'google_jadwal' AND j.import_key = payload->>'import_key';
    EXCEPTION WHEN OTHERS THEN issues := array_append(issues, SQLERRM);
    END;
  END IF;
  UPDATE public.perkuliahan_import_review SET payload = p_payload, locally_modified = p_payload IS DISTINCT FROM q.source_payload,
    validation_issues = '{}', issues = issues, status = CASE WHEN cardinality(issues) = 0 THEN 'active'
      WHEN array_to_string(issues, ' ') ILIKE '%konflik%' OR array_to_string(issues, ' ') ILIKE '%duplikat%' THEN 'conflict' ELSE 'invalid' END,
    schedule_id = COALESCE(sid, q.schedule_id), updated_at = clock_timestamp() WHERE id = q.id;
  PERFORM public.cleanup_perkuliahan_import(q.batch_id);
  RETURN jsonb_build_object('activated', cardinality(issues) = 0, 'issues', to_jsonb(issues));
END;
$$;
REVOKE ALL ON FUNCTION public.review_jadwal_perkuliahan_import(BIGINT, JSONB, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_jadwal_perkuliahan_import(BIGINT, JSONB, TIMESTAMPTZ) TO authenticated;
-- Pemeriksaan yang sama untuk formulir admin biasa, termasuk kelas gabungan.
CREATE OR REPLACE FUNCTION public.check_perkuliahan_admin_record(p_payload JSONB, p_existing_id BIGINT DEFAULT NULL)
RETURNS TEXT[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_perkuliahan_import() THEN RAISE EXCEPTION 'Akses admin diperlukan'; END IF;
  RETURN public.perkuliahan_review_issues(p_payload, p_existing_id);
END;
$$;
REVOKE ALL ON FUNCTION public.check_perkuliahan_admin_record(JSONB, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_perkuliahan_admin_record(JSONB, BIGINT) TO authenticated;

-- Edit melalui formulir admin juga merupakan koreksi lokal. Penulis internal
-- menandai transaksinya sendiri agar import rutin tidak dianggap koreksi manual.
CREATE OR REPLACE FUNCTION public.capture_perkuliahan_local_edit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changed_payload JSONB; old_payload JSONB;
BEGIN
  IF current_setting('app.perkuliahan_import_write', true) = '1' THEN RETURN NEW; END IF;
  changed_payload := to_jsonb(NEW) - ARRAY['id','created_at','updated_at','created_by','updated_by','import_source','import_key','import_batch'];
  old_payload := to_jsonb(OLD) - ARRAY['id','created_at','updated_at','created_by','updated_by','import_source','import_key','import_batch'];
  IF changed_payload IS DISTINCT FROM old_payload THEN
    UPDATE public.perkuliahan_import_review SET payload = changed_payload, locally_modified = true,
      status = 'active', issues = '{}', validation_issues = '{}', updated_at = clock_timestamp()
      WHERE schedule_id = NEW.id AND status <> 'obsolete';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_perkuliahan_local_edit() FROM PUBLIC, authenticated;
DROP TRIGGER IF EXISTS perkuliahan_capture_local_edit ON public.jadwal_perkuliahan;
CREATE TRIGGER perkuliahan_capture_local_edit AFTER UPDATE ON public.jadwal_perkuliahan
FOR EACH ROW EXECUTE FUNCTION public.capture_perkuliahan_local_edit();

NOTIFY pgrst, 'reload schema';
COMMIT;
