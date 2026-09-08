import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeConsecutiveSchedules } from '../src/utils/monitorSchedules.js';

const schedule = (id, start, end, overrides = {}) => ({
  id,
  type: 'perkuliahan',
  kegiatan: 'Matematika dan Statistika Bisnis',
  kode: 'SB62 (1)',
  tempat: 'CPI-Ibis (Gd.C)',
  dosen: 'Dosen A',
  jenis_pertemuan: 'luring',
  mulai: new Date(`2026-09-08T${start}:00`),
  akhir: new Date(`2026-09-08T${end}:00`),
  ...overrides,
});

test('menggabungkan sesi monitor yang sama dan berkesinambungan', () => {
  const result = mergeConsecutiveSchedules([
    schedule('P1', '13:00', '14:40'),
    schedule('P2', '14:40', '15:30'),
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].mulai.getHours(), 13);
  assert.equal(result[0].akhir.getHours(), 15);
  assert.equal(result[0].akhir.getMinutes(), 30);
  assert.deepEqual(result[0].mergedScheduleIds, ['P1', 'P2']);
});

test('tidak menggabungkan sesi dengan paralel atau waktu berbeda', () => {
  const result = mergeConsecutiveSchedules([
    schedule('P1', '13:00', '14:40'),
    schedule('P2', '14:40', '15:30', { kode: 'SB62 (2)' }),
    schedule('P3', '16:00', '17:00'),
  ]);

  assert.equal(result.length, 3);
});
