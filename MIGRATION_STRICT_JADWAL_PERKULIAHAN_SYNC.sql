-- Sinkronisasi authoritative Google Sheet -> jadwal_perkuliahan.
-- Jalankan satu kali di Supabase SQL Editor sebelum memakai mode import ketat.

ALTER TABLE public.jadwal_perkuliahan
  ADD COLUMN IF NOT EXISTS import_source TEXT,
  ADD COLUMN IF NOT EXISTS import_key TEXT,
  ADD COLUMN IF NOT EXISTS import_batch TEXT,
  ADD COLUMN IF NOT EXISTS lokasi_virtual TEXT;

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

CREATE OR REPLACE FUNCTION public.sync_jadwal_perkuliahan_import(
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
BEGIN
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
          quota = v_record.quota,
          updated_by = p_batch_tag,
          updated_at = now(),
          import_batch = p_batch_tag
      WHERE id = v_existing_id;
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  -- Google Sheet bersifat authoritative untuk jadwal hasil import pada cakupan
  -- tanggal ini. Hapus hanya record milik importer; jadwal manual tidak disentuh.
  DELETE FROM public.jadwal_perkuliahan
  WHERE import_source = 'google_jadwal'
    AND mulai_jadwal >= p_scope_start
    AND (import_key IS NULL OR NOT (import_key = ANY(v_keys)));
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF (
    SELECT count(*)
    FROM public.jadwal_perkuliahan
    WHERE import_source = 'google_jadwal'
      AND mulai_jadwal >= p_scope_start
  ) <> cardinality(v_keys) THEN
    RAISE EXCEPTION 'Rekonsiliasi gagal: jumlah data database tidak sama dengan sumber';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(v_keys) AS keys(key)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.jadwal_perkuliahan
      WHERE import_source = 'google_jadwal'
        AND import_key = keys.key
    )
  ) THEN
    RAISE EXCEPTION 'Rekonsiliasi gagal: ada jadwal sumber yang tidak tersimpan';
  END IF;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'deleted', v_deleted,
    'total', jsonb_array_length(p_rows)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_jadwal_perkuliahan_import(
  JSONB,
  TIMESTAMP WITHOUT TIME ZONE,
  TEXT
) TO authenticated;

NOTIFY pgrst, 'reload schema';
