import test from 'node:test';
import assert from 'node:assert/strict';
import { syncKaryaAkhirReviewImport } from '../src/services/karyaAkhirImport.js';

test('frontend hanya memanggil endpoint antrean baru dan menerima batch dengan konflik tersimpan', async () => {
  const calls = [];
  const parameters = {
    p_rows: [{ import_key: 'ka-v1|test' }],
    p_scope_start: '2026-11-10',
    p_batch_tag: 'test',
  };
  const response = {
    data: { workflow_version: 2, inserted: 4, pending: 1 },
    error: null,
  };
  const client = {
    async rpc(name, args) {
      calls.push({ name, args });
      return response;
    },
  };
  assert.equal(await syncKaryaAkhirReviewImport(client, parameters), response);
  assert.deepEqual(calls, [
    { name: 'sync_jadwal_karya_akhir_review_import', args: parameters },
  ]);
});

test('database lama memberi petunjuk migrasi penuh tanpa fallback ke RPC strict', async () => {
  let count = 0;
  const client = {
    async rpc(name) {
      count++;
      assert.equal(name, 'sync_jadwal_karya_akhir_review_import');
      return {
        data: null,
        error: { code: 'PGRST202', message: 'Could not find the function' },
      };
    },
  };
  const result = await syncKaryaAkhirReviewImport(client, {});
  assert.equal(count, 1);
  assert.match(
    result.error.message,
    /SELURUH file MIGRATION_STRICT_JADWAL_KARYA_AKHIR_SYNC.sql/
  );
  assert.match(result.error.message, /BEGIN sampai COMMIT/);
});

test('respons lama tidak boleh dilaporkan sebagai keberhasilan antrean', async () => {
  const result = await syncKaryaAkhirReviewImport(
    {
      async rpc() {
        return { data: { inserted: 3 }, error: null };
      },
    },
    {}
  );
  assert.equal(result.data, null);
  assert.match(
    result.error.message,
    /Versi sinkronisasi database tidak sesuai/
  );
});

test('error izin dan kegagalan koneksi tetap dilaporkan sesuai penyebabnya', async () => {
  const denied = {
    data: null,
    error: { code: '42501', message: 'Akses admin diperlukan' },
  };
  assert.equal(
    await syncKaryaAkhirReviewImport(
      {
        async rpc() {
          return denied;
        },
      },
      {}
    ),
    denied
  );
  const offline = await syncKaryaAkhirReviewImport(
    {
      async rpc() {
        throw new Error('offline');
      },
    },
    {}
  );
  assert.equal(offline.error.message, 'offline');
});

test('menerima format ringkasan array dari PostgREST', async () => {
  const result = { data: [{ workflow_version: 2, pending: 2 }], error: null };
  assert.equal(
    await syncKaryaAkhirReviewImport(
      {
        async rpc() {
          return result;
        },
      },
      {}
    ),
    result
  );
});
