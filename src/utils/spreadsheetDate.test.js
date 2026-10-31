import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSpreadsheetDate } from './spreadsheetDate.js';

test('membaca tahun empat digit pada tanggal Indonesia secara utuh', () => {
  const date = parseSpreadsheetDate('Kamis, 24 September 2026');

  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 8);
  assert.equal(date.getDate(), 24);
});

test('mendukung tahun dua digit pada tanggal Indonesia', () => {
  const date = parseSpreadsheetDate('24 September 26');

  assert.equal(date.getFullYear(), 2026);
});
