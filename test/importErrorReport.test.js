import assert from 'node:assert/strict';
import test from 'node:test';

import { buildImportErrorReport } from '../src/utils/importErrorReport.js';

test('membuat laporan JSON terstruktur dari kegagalan import', () => {
  const report = buildImportErrorReport({
    errors: [
      'Baris 4: waktu mulai tidak valid; waktu selesai tidak valid',
      'Baris 28: ruangan "Gardenia (Gd.B)" tidak ada di master data',
    ],
    headers: ['Kode', 'Ruangan'],
    rows: [[], [], [], ['SBI134C', 'Gardenia (Gd.B)']],
    metadata: { batch_id: 'import-1', schedule_type: 'perkuliahan' },
    generatedAt: new Date('2026-10-31T10:00:00.000Z'),
  });

  assert.equal(report.format, 'ticketing-import-error-report');
  assert.equal(report.summary.error_entries, 2);
  assert.equal(report.summary.total_issues, 3);
  assert.deepEqual(report.summary.affected_rows, [4, 28]);
  assert.equal(report.summary.by_code.INVALID_DATETIME, 2);
  assert.equal(report.summary.by_code.REFERENCE_NOT_FOUND, 1);
  assert.equal(report.errors[0].field, 'mulai_jadwal');
  assert.deepEqual(report.errors[0].source_rows[0].data, {
    Kode: 'SBI134C',
    Ruangan: 'Gardenia (Gd.B)',
  });
});

test('mendukung konflik yang melibatkan dua baris', () => {
  const report = buildImportErrorReport({
    errors: [
      'Baris 2 dan 5: ruangan yang sama dipakai pada waktu yang bertabrakan',
    ],
    generatedAt: new Date('2026-10-31T10:00:00.000Z'),
  });

  assert.deepEqual(report.errors[0].row_numbers, [2, 5]);
  assert.equal(report.errors[0].code, 'SCHEDULE_CONFLICT');
});
