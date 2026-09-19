import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHonorDosenRows,
  getHonorValue,
  groupHonorRows,
  isHonorStrata,
} from './honorDosen.js';

test('mengenali strata pascasarjana', () => {
  assert.equal(isHonorStrata('S2'), true);
  assert.equal(isHonorStrata('s-3'), true);
  assert.equal(isHonorStrata('S1'), false);
});

test('nilai honor mengikuti durasi pada format contoh', () => {
  assert.equal(getHonorValue('2026-09-01T19:00:00', '2026-09-01T21:30:00'), 2);
  assert.equal(getHonorValue('2026-09-01T19:00:00', '2026-09-01T22:00:00'), 4);
});

test('membatasi periode dan membuat satu baris untuk setiap dosen', () => {
  const rows = buildHonorDosenRows(
    [
      {
        id: 1,
        mulai_jadwal: '2026-09-15T19:00:00',
        akhir_jadwal: '2026-09-15T22:00:00',
        nama_dosen: 'Dosen A',
        dosen_tambahan_names: ['Dosen B'],
        nama_matkul: 'Manajemen',
        nama_angkatan: 'E97',
        strata_angkatans: ['S2'],
        jenis_pertemuan: 'daring',
      },
      {
        id: 2,
        mulai_jadwal: '2026-09-16T19:00:00',
        akhir_jadwal: '2026-09-16T22:00:00',
        nama_dosen: 'Dosen C',
        nama_matkul: 'Ekonomi',
        nama_angkatan: 'SB61',
        strata_angkatans: ['S1'],
      },
    ],
    { monthValue: '2026-09', period: 'first', strataFilter: 'S2' }
  );

  assert.deepEqual(
    rows.map((row) => row.dosen),
    ['Dosen A', 'Dosen B']
  );
  assert.equal(groupHonorRows(rows)[0].total, 4);
});

test('dapat memisahkan laporan S1, S2, dan S3', () => {
  const schedules = ['S1', 'S2', 'S3'].map((strata, index) => ({
    id: index + 1,
    mulai_jadwal: '2026-09-10T08:00:00',
    akhir_jadwal: '2026-09-10T10:30:00',
    nama_dosen: `Dosen ${strata}`,
    nama_matkul: 'Mata Kuliah',
    nama_angkatan: strata,
    strata_angkatans: [strata],
  }));

  for (const strata of ['S1', 'S2', 'S3']) {
    const rows = buildHonorDosenRows(schedules, {
      monthValue: '2026-09',
      period: 'first',
      strataFilter: strata,
    });
    assert.deepEqual(
      rows.map((row) => row.dosen),
      [`Dosen ${strata}`]
    );
  }
});
