import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dateToLocalStr,
  getScheduleTypeFromLabel,
  parseJam,
  parseJenisPertemuan,
  parseZoomInfo,
} from '../src/utils/scheduleImportParsing.js';

test('spreadsheet category recognition preserves normalization and precedence', () => {
  for (const value of [' Kuliah S1 ', 'PERKULIAHAN', 'kuliah_sidang']) {
    assert.equal(getScheduleTypeFromLabel(value), 'perkuliahan');
  }
  for (const value of ['Ujian Tesis', 'karya-akhir', 'seminar', 'Prelim']) {
    assert.equal(getScheduleTypeFromLabel(value), 'karya_akhir');
  }
  assert.equal(getScheduleTypeFromLabel('LAIN__LAIN rapat'), 'lain_lain');
  for (const value of [null, '', 0, 'rapat', 'kuliahan']) {
    assert.equal(getScheduleTypeFromLabel(value), null);
  }
});

test('import times retain local dates, supported separators and null fallbacks', () => {
  const expected = {
    mulai: '2026-01-02T08:00:00',
    akhir: '2026-01-02T09:40:00',
  };
  for (const time of ['8.00 - 9.40', '08:00–09:40', '08:00-09:40']) {
    assert.deepEqual(parseJam(time, new Date(2026, 0, 2, 0, 15)), expected);
    assert.deepEqual(parseJam(time, '2026-01-02T15:00:00'), expected);
  }
  for (const [time, date] of [
    [null, '2026-01-02'],
    ['08:00', '2026-01-02'],
    ['08:00-09:00', null],
  ]) {
    assert.deepEqual(parseJam(time, date), { mulai: null, akhir: null });
  }
  // This parser never validated time bounds or advanced an overnight end date.
  assert.deepEqual(parseJam('25:70-01:00', '2026-01-02'), {
    mulai: '2026-01-02T25:70:00',
    akhir: '2026-01-02T01:00:00',
  });
  assert.equal(dateToLocalStr(null), null);
  assert.equal(dateToLocalStr(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
});

test('meeting mode recognition keeps hybrid precedence and legacy synonyms', () => {
  for (const value of ['Hybrid Online', 'blended'])
    assert.equal(parseJenisPertemuan(value), 'hybrid');
  for (const value of [
    'DARING',
    'online',
    'async',
    'asynchronous',
    'asinkron',
    'synchronous',
    'sinkron',
  ]) {
    assert.equal(parseJenisPertemuan(value), 'daring');
  }
  for (const value of [null, '', 'offline', 'unknown'])
    assert.equal(parseJenisPertemuan(value), 'luring');
});

test('Zoom parsing retains internal ID spaces and existing password delimiters', () => {
  assert.deepEqual(parseZoomInfo('ID: 123 456 (Pass: abc-123)'), {
    zoom_id: '123 456',
    zoom_password: 'abc-123',
  });
  // Existing bug: the earlier 'Pass' alternative consumes the Password prefix.
  // Keep this behavior explicit until a separate bug fix is approved.
  assert.deepEqual(parseZoomInfo('Password: secret, extra'), {
    zoom_id: null,
    zoom_password: 'word:',
  });
  assert.deepEqual(parseZoomInfo(null), { zoom_id: null, zoom_password: null });
});
