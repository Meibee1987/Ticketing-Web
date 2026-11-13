-- Hanya untuk database PostgreSQL sementara/kosong. Jangan jalankan di produksi.
-- psql -v ON_ERROR_STOP=1 -f test/karyaAkhirSync.sql
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
END; $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE SQL AS $$ SELECT '11111111-1111-1111-1111-111111111111'::uuid; $$;
CREATE TABLE roles (id bigint PRIMARY KEY, role text);
INSERT INTO roles VALUES (1,'admin'), (2,'dosen');
CREATE TABLE "Teknisi" (auth_id uuid, roles_id bigint);
INSERT INTO "Teknisi" VALUES ('11111111-1111-1111-1111-111111111111',1);
CREATE TABLE angkatan (id bigint PRIMARY KEY);
INSERT INTO angkatan VALUES (1);
CREATE TABLE agenda_karya_akhir (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, agenda_karya_akhir text);
INSERT INTO agenda_karya_akhir(agenda_karya_akhir) VALUES ('Sidang Promosi Terbuka');
CREATE TABLE dosen (id bigint PRIMARY KEY, auth_id uuid, roles_id bigint);
INSERT INTO dosen(id) VALUES (11), (12), (20), (21);
CREATE TABLE ruangan (id bigint PRIMARY KEY, nama_ruangan text);
INSERT INTO ruangan VALUES (3, 'Ruang A'), (4, 'Ruang B'), (5, 'Gardenia (Gd.B)');
CREATE TABLE jadwal_karya_akhir (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama_mahasiswa text, nama_angkatan bigint, nama_ruangan bigint REFERENCES ruangan,
  agenda_jadwal_karya_akhir bigint, mulai_jadwal timestamp, akhir_jadwal timestamp,
  jenis_pertemuan text, zoom_id text, zoom_password text, petugas_zoom text,
  moderator text, pintang_sps text, note text, dosen_ids jsonb, penguji_ids jsonb,
  created_by text, updated_by text, updated_at timestamptz DEFAULT now()
);
CREATE TABLE jadwal_perkuliahan (
  id bigint PRIMARY KEY, dosen_id bigint, dosen_ids jsonb, penguji_ids jsonb,
  ruangan_id bigint, jenis_pertemuan text, mulai_jadwal timestamp, akhir_jadwal timestamp
);
CREATE TABLE jadwal_lain_lain (
  id bigint PRIMARY KEY, nama_ruangan bigint, jenis_pertemuan text,
  mulai_jadwal timestamp, akhir_jadwal timestamp
);
\ir ../MIGRATION_STRICT_JADWAL_KARYA_AKHIR_SYNC.sql
-- Migrasi kedua tidak boleh menggandakan agenda, termasuk alias yang sudah ada.
\ir ../MIGRATION_STRICT_JADWAL_KARYA_AKHIR_SYNC.sql
DO $$ BEGIN
  ASSERT (SELECT count(*) = 10 FROM agenda_karya_akhir);
  ASSERT (SELECT count(*) = 1 FROM agenda_karya_akhir WHERE agenda_karya_akhir = 'Seminar Hasil');
  ASSERT (SELECT count(*) = 0 FROM agenda_karya_akhir WHERE agenda_karya_akhir = 'Promosi Terbuka');
END; $$;

\ir karyaAkhirReview.sql
