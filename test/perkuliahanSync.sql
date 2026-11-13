-- HANYA untuk database PostgreSQL sementara/kosong. Jangan jalankan di produksi.
-- psql -v ON_ERROR_STOP=1 -f test/perkuliahanSync.sql
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; END; $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE SQL AS $$ SELECT '11111111-1111-1111-1111-111111111111'::uuid; $$;
CREATE TABLE roles(id bigint PRIMARY KEY, role text);
INSERT INTO roles VALUES (1,'admin'),(2,'dosen');
CREATE TABLE "Teknisi"(auth_id uuid, roles_id bigint);
INSERT INTO "Teknisi" VALUES ('11111111-1111-1111-1111-111111111111',1);
CREATE TABLE dosen(id bigint PRIMARY KEY, auth_id uuid, roles_id bigint);
INSERT INTO dosen(id) VALUES (11),(12),(20),(21);
CREATE TABLE angkatan(id bigint PRIMARY KEY);
INSERT INTO angkatan VALUES (1),(2),(3);
CREATE TABLE mata_kuliah(id bigint PRIMARY KEY);
INSERT INTO mata_kuliah VALUES (101),(102);
CREATE TABLE ruangan(id bigint PRIMARY KEY, nama_ruangan text);
INSERT INTO ruangan VALUES (3,'Ruang A'),(4,'Ruang B'),(5,'Gardenia (Gd.B)');
CREATE TABLE jadwal_perkuliahan(
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, dosen_id bigint REFERENCES dosen,
  ruangan_id bigint REFERENCES ruangan, id_angkatan bigint REFERENCES angkatan, id_angkatans jsonb,
  id_mata_kuliah bigint REFERENCES mata_kuliah, mulai_jadwal timestamp, akhir_jadwal timestamp,
  jenis_pertemuan text, lokasi_virtual text, zoom_id text, zoom_password text, note text,
  paralel integer, real_perkuliahan integer, petugas_zoom text, moderator text,
  dosen_ids jsonb, penguji_ids jsonb, pintang_sps text, kelas varchar(10), kegiatan text, quota integer,
  created_by text, updated_by text, updated_at timestamptz DEFAULT now()
);
CREATE TABLE jadwal_karya_akhir(id bigint PRIMARY KEY, nama_ruangan bigint, jenis_pertemuan text,
  mulai_jadwal timestamp, akhir_jadwal timestamp, dosen_ids jsonb, penguji_ids jsonb);
CREATE TABLE jadwal_lain_lain(id bigint PRIMARY KEY, nama_ruangan bigint, jenis_pertemuan text,
  mulai_jadwal timestamp, akhir_jadwal timestamp);
\ir ../MIGRATION_STRICT_JADWAL_PERKULIAHAN_SYNC.sql
\ir ../MIGRATION_STRICT_JADWAL_PERKULIAHAN_SYNC.sql
\ir perkuliahanReview.sql
