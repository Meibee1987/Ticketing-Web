import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeKaryaAkhirAgenda } from './karyaAkhir.js';

test('menghapus nomor urut 1 sampai 4 dari agenda karya akhir', () => {
  assert.equal(normalizeKaryaAkhirAgenda('Sidang Komisi 1'), 'Sidang Komisi');
  assert.equal(normalizeKaryaAkhirAgenda('Sidang Komisi 3'), 'Sidang Komisi');
  assert.equal(normalizeKaryaAkhirAgenda('Sidang Komisi 4'), 'Sidang Komisi');
});

test('tidak mengubah kegiatan tanpa nomor urut yang didukung', () => {
  assert.equal(normalizeKaryaAkhirAgenda('Kolokium'), 'Kolokium');
  assert.equal(normalizeKaryaAkhirAgenda('Seminar Hasil'), 'Seminar Hasil');
});
