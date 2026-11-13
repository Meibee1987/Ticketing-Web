import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPerkuliahanReviewRow } from '../src/utils/scheduleImport.js';
import {
  syncScheduleReviewImport,
  processScheduleReviewImport,
} from '../src/services/scheduleImportReview.js';

const schedule = {
  id_mata_kuliah: 101,
  id_angkatan: 1,
  id_angkatans: [1, 2],
  real_perkuliahan: 7,
  dosen_id: 11,
  paralel: 1,
  kelas: 'REG',
  mulai_jadwal: '2026-11-12T09:00:00',
  akhir_jadwal: '2026-11-12T10:00:00',
};
const build = (record, extras = {}) =>
  buildPerkuliahanReviewRow({
    record,
    batchTag: 'batch',
    headers: ['Kode MK'],
    row: ['MK101'],
    rowNumber: 3,
    ...extras,
  });

test('identitas pertemuan tetap stabil saat jam/dosen diperbaiki dan urutan angkatan berubah', () => {
  const original = build(schedule);
  const changed = build({
    ...schedule,
    dosen_id: 12,
    mulai_jadwal: '2026-11-12T11:00:00',
    id_angkatans: [2, 1],
  });
  assert.equal(original.source_key, changed.source_key);
  assert.notEqual(
    original.source_key,
    build({ ...schedule, real_perkuliahan: 8 }).source_key
  );
  assert.notEqual(
    original.source_key,
    build({ ...schedule, id_angkatans: [3] }).source_key
  );
});

test('ID jadwal eksplisit diutamakan; referensi gagal dan data sumber disimpan', () => {
  const row = build(
    { ...schedule, id_mata_kuliah: null },
    {
      headers: ['ID Jadwal', 'Kode MK'],
      row: ['stable-1', 'MISSING'],
      issues: ['mata kuliah tidak ditemukan'],
    }
  );
  assert.equal(row.source_key, 'google-kuliah|stable-1');
  assert.equal(row.id_mata_kuliah, null);
  assert.deepEqual(row.validation_issues, ['mata kuliah tidak ditemukan']);
  assert.equal(row.source_data['Kode MK'], 'MISSING');
  assert.equal(row.row_number, 3);
});

test('kode kelas gabungan bersifat eksplisit dan kosong secara default', () => {
  assert.equal(build(schedule).combined_class_key, null);
  assert.equal(
    build({ ...schedule, combined_class_key: '  GAB-101-7  ' })
      .combined_class_key,
    'GAB-101-7'
  );
});

test('endpoint Perkuliahan baru menerima hasil parsial tanpa memakai fungsi strict lama', async () => {
  const calls = [];
  const parameters = {
    p_rows: [build(schedule)],
    p_scope_start: '2026-11-10',
    p_batch_tag: 'batch',
  };
  const result = {
    data: {
      workflow_version: 3,
      batch_id: 42,
      remaining: 0,
      complete: true,
      inserted: 2,
      pending: 1,
    },
    error: null,
  };
  assert.deepEqual(
    await syncScheduleReviewImport(
      {
        async rpc(name, args) {
          calls.push({ name, args });
          return name.startsWith('begin_')
            ? {
                data: {
                  workflow_version: 3,
                  batch_id: 42,
                  remaining: 3,
                  complete: false,
                },
                error: null,
              }
            : result;
        },
      },
      parameters,
      'perkuliahan'
    ),
    result
  );
  assert.deepEqual(calls, [
    { name: 'begin_jadwal_perkuliahan_review_import', args: parameters },
    {
      name: 'process_jadwal_perkuliahan_review_import',
      args: { p_batch_id: 42 },
    },
  ]);
});

test('timeout memberi petunjuk migrasi dan tidak mencoba import ulang otomatis', async () => {
  let calls = 0;
  const result = await syncScheduleReviewImport(
    {
      async rpc() {
        calls++;
        return {
          error: {
            code: '57014',
            message: 'canceling statement due to statement timeout',
          },
        };
      },
    },
    {},
    'perkuliahan'
  );
  assert.equal(calls, 1);
  assert.equal(result.error.code, '57014');
  assert.match(result.error.message, /batas waktu database/);
  assert.match(
    result.error.message,
    /MIGRATION_STRICT_JADWAL_PERKULIAHAN_SYNC.sql/
  );
  assert.match(result.error.message, /batch ini dibatalkan/);
});

test('pemeriksaan bertahap melaporkan kemajuan sampai selesai', async () => {
  const progress = [];
  const responses = [
    { workflow_version: 3, batch_id: 7, remaining: 51, complete: false },
    {
      workflow_version: 3,
      batch_id: 7,
      remaining: 26,
      complete: false,
      inserted: 25,
    },
    {
      workflow_version: 3,
      batch_id: 7,
      remaining: 1,
      complete: false,
      inserted: 50,
    },
    {
      workflow_version: 3,
      batch_id: 7,
      remaining: 0,
      complete: true,
      inserted: 51,
    },
  ];
  const result = await syncScheduleReviewImport(
    {
      async rpc() {
        return { data: responses.shift(), error: null };
      },
    },
    {},
    'perkuliahan',
    (value) => progress.push(value)
  );
  assert.equal(result.data.inserted, 51);
  assert.deepEqual(
    progress.map((p) => p.processed),
    [0, 25, 50, 51]
  );
});

test('timeout setelah staging mempertahankan antrean dan hasil kelompok sebelumnya', async () => {
  let calls = 0;
  const result = await syncScheduleReviewImport(
    {
      async rpc() {
        calls++;
        if (calls === 1)
          return {
            data: {
              workflow_version: 3,
              batch_id: 8,
              remaining: 30,
              pending: 30,
              complete: false,
            },
            error: null,
          };
        if (calls === 2)
          return {
            data: {
              workflow_version: 3,
              batch_id: 8,
              remaining: 5,
              pending: 5,
              complete: false,
              inserted: 25,
            },
            error: null,
          };
        return {
          error: {
            code: '57014',
            message: 'canceling statement due to statement timeout',
          },
        };
      },
    },
    {},
    'perkuliahan'
  );
  assert.equal(calls, 3);
  assert.equal(result.error.persistedReview, true);
  assert.equal(result.data.inserted, 25);
  assert.equal(result.data.remaining, 5);
  assert.match(result.error.message, /Antrean import sudah tersimpan/);
  assert.doesNotMatch(result.error.message, /batch ini dibatalkan/);
});

test('kelompok tanpa kemajuan dihentikan agar tidak meminta RPC tanpa akhir', async () => {
  let calls = 0;
  const result = await syncScheduleReviewImport(
    {
      async rpc() {
        calls++;
        return {
          data: {
            workflow_version: 3,
            batch_id: 9,
            remaining: 5,
            complete: false,
          },
          error: null,
        };
      },
    },
    {},
    'perkuliahan'
  );
  assert.equal(calls, 2);
  assert.equal(result.error.persistedReview, true);
  assert.match(result.error.message, /Kemajuan pemeriksaan tidak valid/);
});

test('koneksi terputus setelah staging tetap memberi status data tersimpan', async () => {
  let calls = 0;
  const result = await syncScheduleReviewImport(
    {
      async rpc() {
        if (calls++) throw new Error('Network error');
        return {
          data: {
            workflow_version: 3,
            batch_id: 9,
            remaining: 5,
            complete: false,
          },
          error: null,
        };
      },
    },
    {},
    'perkuliahan'
  );
  assert.equal(result.error.persistedReview, true);
  assert.equal(result.data.batch_id, 9);
});

test('database lama memberi petunjuk migrasi Perkuliahan dan tidak mencoba fallback', async () => {
  let calls = 0;
  const result = await syncScheduleReviewImport(
    {
      async rpc() {
        calls++;
        return { error: { code: 'PGRST202' } };
      },
    },
    {},
    'perkuliahan'
  );
  assert.equal(calls, 1);
  assert.match(
    result.error.message,
    /MIGRATION_STRICT_JADWAL_PERKULIAHAN_SYNC.sql/
  );
  assert.match(result.error.message, /BEGIN sampai COMMIT/);
});

test('lanjutkan pemeriksaan memakai batch tersimpan tanpa mengirim sumber ulang', async () => {
  const calls = [];
  const result = await processScheduleReviewImport(
    {
      async rpc(name, args) {
        calls.push({ name, args });
        return {
          data: {
            workflow_version: 3,
            batch_id: 17,
            remaining: 0,
            pending: 1,
            complete: true,
            inserted: 26,
          },
          error: null,
        };
      },
    },
    { batch_id: 17, remaining: 1, complete: false },
    'perkuliahan'
  );
  assert.equal(result.data.inserted, 26);
  assert.deepEqual(calls, [
    {
      name: 'process_jadwal_perkuliahan_review_import',
      args: { p_batch_id: 17 },
    },
  ]);
});
