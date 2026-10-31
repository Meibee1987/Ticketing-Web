import test from 'node:test';
import assert from 'node:assert/strict';
import { getImportStartDay } from './importScheduleDate.js';

test('import dimulai dari hari ketika proses dijalankan', () => {
  const startDay = getImportStartDay(new Date(2026, 9, 3, 14, 30));

  assert.deepEqual(
    [
      startDay.getFullYear(),
      startDay.getMonth(),
      startDay.getDate(),
      startDay.getHours(),
    ],
    [2026, 9, 3, 0]
  );
});

test('jam klik tidak mengeluarkan jadwal pada hari yang sama', () => {
  const startDay = getImportStartDay(new Date(2026, 9, 3, 23, 59, 59));

  assert.equal(startDay.getHours(), 0);
  assert.equal(startDay.getMinutes(), 0);
  assert.equal(startDay.getSeconds(), 0);
});
