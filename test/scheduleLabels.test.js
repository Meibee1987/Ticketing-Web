import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatAngkatanLabel,
  normalizeKelasForDatabase,
} from '../src/utils/scheduleLabels.js';

test('format label angkatan dengan paralel dan kelas internasional', () => {
  assert.equal(formatAngkatanLabel('SB61', 1, 'Reguler'), 'SB61 (1)');
  assert.equal(formatAngkatanLabel('SB62', 4, 'Internasional'), 'SB62 (4) Int');
  assert.equal(formatAngkatanLabel('SB61', 2, 'International'), 'SB61 (2) Int');
  assert.equal(formatAngkatanLabel('SB62', null, null), 'SB62');
});

test('normalisasi kelas aman untuk kolom database varchar 10', () => {
  assert.equal(normalizeKelasForDatabase('Internasional'), 'INT');
  assert.equal(normalizeKelasForDatabase('International'), 'INT');
  assert.equal(normalizeKelasForDatabase('Reguler'), 'REG');
  assert.equal(normalizeKelasForDatabase('Reserved'), 'RES');
  assert.equal(normalizeKelasForDatabase('-'), null);
  assert.equal(normalizeKelasForDatabase('Kelas Eksekutif').length, 10);
});
