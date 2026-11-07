import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCanonicalImportLookup,
  buildDosenExternalIdImportLookup,
  buildPreferredImportLookup,
  buildPerkuliahanImportKey,
  exactImportLookup,
  findPendingRoomConflict,
  importedSchedulesOverlapInSameRoom,
  isRoomConflictExempt,
  normalizeImportLookup,
  normalizePerkuliahanSyncRecord,
  resolvePrimaryDosenImport,
  shouldSkipScheduleImportRow,
  splitDosenLabels,
  validatePerkuliahanImportRecord,
} from '../src/utils/scheduleImport.js';

test('lookup import hanya menerima nilai exact setelah normalisasi aman', () => {
  const lookup = { 'manajemen strategik lanjut': 17 };

  assert.equal(
    exactImportLookup('  Manajemen   Strategik Lanjut ', lookup),
    17
  );
  assert.equal(exactImportLookup('Manajemen Strategik', lookup), null);
  assert.equal(normalizeImportLookup(' DMB26 '), 'dmb26');
});

test('lookup mata kuliah menggunakan kode meskipun namanya sama', () => {
  const mataKuliah = [
    {
      id: 101,
      kode_mata_kuliah: 'SBI134C',
      mata_kuliah: 'Dinamika Operasi dan rantai pasok',
      aktif_nonaktif: true,
    },
    {
      id: 202,
      kode_mata_kuliah: 'SBI134K',
      mata_kuliah: 'Dinamika Operasi dan rantai pasok',
      aktif_nonaktif: true,
    },
  ];
  const lookup = buildPreferredImportLookup(
    mataKuliah,
    (item) => item.kode_mata_kuliah
  );

  assert.equal(exactImportLookup('SBI134C', lookup), 101);
  assert.equal(exactImportLookup('sbi134k', lookup), 202);
  assert.equal(
    exactImportLookup('Dinamika Operasi dan rantai pasok', lookup),
    null
  );
});

test('lookup dosen mengabaikan variasi apostrof dan tanda baca gelar', () => {
  const masterName = 'Prof. Dr. Ir. Mohammad Syamsul Maarif, M.Eng.';
  const sheetName = 'Prof. Dr. Ir. Mohammad Syamsul Ma’arif M.Eng.';
  const normalizedMasterName = normalizeImportLookup(masterName);
  const lookup = { [normalizedMasterName]: 50 };

  assert.equal(normalizeImportLookup(sheetName), normalizedMasterName);
  assert.equal(exactImportLookup(sheetName, lookup), 50);
});

test('lookup dosen menyamakan singkatan gelar bertitik dan tanpa titik', () => {
  const lookup = buildPreferredImportLookup(
    [
      {
        id: 35,
        nama_dosen: 'Dr. Zenal Asikin, S.E., M.Si.',
        aktif_nonaktif: true,
      },
    ],
    (item) => item.nama_dosen
  );

  assert.equal(exactImportLookup('Dr. Zenal Asikin, SE, M.Si.', lookup), 35);
});

test('ID dosen menjadi acuan utama meskipun nama dan email mengarah ke dosen lain', () => {
  const result = resolvePrimaryDosenImport({
    idDosen: '41a1bafa',
    email: 'dosen-lain@apps.ipb.ac.id',
    name: 'Dosen Lain',
    dosenByExternalId: { '41a1bafa': 13 },
    dosenByEmail: { 'dosen lain apps ipb ac id': 99 },
    dosenByName: { 'dosen lain': 99 },
  });

  assert.deepEqual(result, {
    id: 13,
    matchedBy: 'id_external',
    reference: '41a1bafa',
  });
});

test('ID dosen yang tidak dikenal tidak jatuh kembali ke nama atau email', () => {
  const result = resolvePrimaryDosenImport({
    idDosen: 'tidak-ada',
    email: 'achmad@apps.ipb.ac.id',
    name: 'Achmad Fadillah',
    dosenByExternalId: { '41a1bafa': 13 },
    dosenByEmail: { 'achmad appsipbacid': 13 },
    dosenByName: { 'achmad fadillah': 13 },
  });

  assert.deepEqual(result, {
    id: null,
    matchedBy: 'id_external',
    reference: 'tidak-ada',
  });
});

test('lookup ID eksternal dosen menerima alias yang menunjuk id_dosen kanonis', () => {
  const lookup = buildDosenExternalIdImportLookup(
    [
      {
        id: 15,
        id_dosen: 'SBIDSN003',
        id_external: 'e9d5ac1b',
        aktif_nonaktif: true,
      },
      {
        id: 17,
        id_dosen: 'SBIDSN005',
        id_external: '2d4c1bf0',
        aktif_nonaktif: true,
      },
    ],
    {
      db466900: 'SBIDSN003',
      '683f94af': 'SBIDSN005',
    }
  );

  assert.equal(exactImportLookup('e9d5ac1b', lookup), 15);
  assert.equal(exactImportLookup('db466900', lookup), 15);
  assert.equal(exactImportLookup('2d4c1bf0', lookup), 17);
  assert.equal(exactImportLookup('683f94af', lookup), 17);
});

test('import perkuliahan memakai email exact ketika ID dosen kosong', () => {
  const result = resolvePrimaryDosenImport({
    idDosen: '',
    email: 'achmad@apps.ipb.ac.id',
    name: 'Achmad Fadillah',
    dosenByExternalId: { '41a1bafa': 13 },
    dosenByEmail: { 'achmad appsipbacid': 13 },
    dosenByName: { 'achmad fadillah': 13 },
  });

  assert.deepEqual(result, {
    id: 13,
    matchedBy: 'email',
    reference: 'achmad@apps.ipb.ac.id',
  });
});

test('import perkuliahan memakai nama exact ketika ID dan email dosen kosong', () => {
  const result = resolvePrimaryDosenImport({
    idDosen: '',
    email: '',
    name: 'Achmad Fadillah',
    dosenByExternalId: { '41a1bafa': 13 },
    dosenByEmail: { 'achmad apps ipb ac id': 13 },
    dosenByName: { 'achmad fadillah': 13 },
  });

  assert.deepEqual(result, {
    id: 13,
    matchedBy: 'name',
    reference: 'Achmad Fadillah',
  });
});

test('memisahkan banyak dosen tanpa memecah tanda baca gelar', () => {
  assert.deepEqual(
    splitDosenLabels(
      'Dr. Linda Karlina Sari S.Stat. M.Si. & Dr. Zenal Asikin, SE, M.Si.'
    ),
    ['Dr. Linda Karlina Sari S.Stat. M.Si.', 'Dr. Zenal Asikin, SE, M.Si.']
  );
  assert.deepEqual(
    splitDosenLabels('Prof. Ujang, M.Sc. / Prof. Hartoyo, M.Sc.'),
    ['Prof. Ujang, M.Sc.', 'Prof. Hartoyo, M.Sc.']
  );
  assert.deepEqual(
    splitDosenLabels('Nawangsita Noorardini Winoto, B.Econ, MIntEcon&F'),
    ['Nawangsita Noorardini Winoto, B.Econ, MIntEcon&F']
  );
});

test('melewati baris tidak tampil dan header yang berulang', () => {
  const headers = ['Kode', 'Angkatan', 'Dosen Matakuliah', 'Tampil'];

  assert.equal(
    shouldSkipScheduleImportRow(headers, [
      'SBI1212',
      'SB61',
      'Dr. Tanti',
      'Tidak',
    ]),
    true
  );
  assert.equal(
    shouldSkipScheduleImportRow(
      headers,
      ['SBI1212', 'SB61', 'Dr. Tanti', 'Tidak'],
      { ignoreDisplayStatus: true }
    ),
    false
  );
  assert.equal(
    shouldSkipScheduleImportRow(headers, [
      'Kode',
      'Angkatan',
      'Dosen Matakuliah',
      'View',
    ]),
    true
  );
  assert.equal(
    shouldSkipScheduleImportRow(headers, [
      'SBI134C',
      'SB61',
      'Dr. Tanti',
      'Tampil',
    ]),
    false
  );
});

test('ruangan kosong tidak dianggap sebagai konflik dengan ruangan kosong lain', () => {
  const base = {
    mulai_jadwal: '2026-11-07T08:00:00',
    akhir_jadwal: '2026-11-07T10:30:00',
  };

  assert.equal(
    importedSchedulesOverlapInSameRoom(
      { ...base, ruangan_id: null },
      { ...base, ruangan_id: null }
    ),
    false
  );
  assert.equal(
    importedSchedulesOverlapInSameRoom(
      { ...base, ruangan_id: 10 },
      { ...base, ruangan_id: 10 }
    ),
    true
  );
});

test('mendeteksi konflik terhadap baris sinkronisasi lain', () => {
  const record = {
    ruangan_id: 10,
    jenis_pertemuan: 'luring',
    mulai_jadwal: '2026-11-07T08:00:00',
    akhir_jadwal: '2026-11-07T10:30:00',
  };
  const message = findPendingRoomConflict({
    record,
    syncRowId: 'row-1',
    pendingRows: [
      { syncRowId: 'row-1', rowNumber: 1, record },
      { syncRowId: 'row-2', rowNumber: 2, record: { ...record } },
    ],
    roomNameById: { 10: 'Meranti (Gd.A)' },
  });

  assert.match(message, /Meranti/);
  assert.match(message, /baris 2/);
});

test('lookup duplikat memilih satu master data yang aktif', () => {
  const rows = [
    {
      id: 11,
      nama_dosen: 'Annisa Ramadanti S.E., M.M.',
      aktif_nonaktif: false,
    },
    {
      id: 20,
      nama_dosen: 'Annisa Ramadanti, S.E., M.M.',
      aktif_nonaktif: true,
    },
  ];
  const buildLookup = (items) =>
    buildPreferredImportLookup(items, (item) => item.nama_dosen);

  assert.equal(
    exactImportLookup('Annisa Ramadanti, S.E., M.M.', buildLookup(rows)),
    20
  );
  assert.equal(
    exactImportLookup(
      'Annisa Ramadanti, S.E., M.M.',
      buildLookup([...rows].reverse())
    ),
    20
  );
});

test('lookup tetap menolak nama yang dimiliki lebih dari satu data aktif', () => {
  const lookup = buildPreferredImportLookup(
    [
      { id: 20, nama_ruangan: 'Gardenia (Gd.B)', aktif_nonaktif: true },
      { id: 58, nama_ruangan: 'Gardenia (Gd.B)', aktif_nonaktif: true },
    ],
    (item) => item.nama_ruangan
  );

  assert.equal(exactImportLookup('Gardenia (Gd.B)', lookup), null);
});

test('lookup tetap menerima satu data nonaktif tanpa kandidat lain', () => {
  const lookup = buildPreferredImportLookup(
    [{ id: 50, nama_ruangan: 'Gardenia (Gd.B)', aktif_nonaktif: false }],
    (item) => item.nama_ruangan
  );

  assert.equal(exactImportLookup('Gardenia (Gd.B)', lookup), 50);
});

test('Gardenia memilih record aktif terlama dan dikecualikan dari konflik', () => {
  const lookup = buildCanonicalImportLookup(
    [
      { id: 58, nama_ruangan: 'Gardenia (Gd.B)', aktif_nonaktif: true },
      { id: 50, nama_ruangan: 'Gardenia (Gd.B)', aktif_nonaktif: true },
    ],
    (item) => item.nama_ruangan,
    ['Gardenia (Gd.B)']
  );

  assert.equal(exactImportLookup('Gardenia (Gd.B)', lookup), 50);
  assert.equal(isRoomConflictExempt('Gardenia (Gd.B)'), true);
  assert.equal(isRoomConflictExempt('Gardenia 1 (Gd.B)'), false);
});

test('kunci import perkuliahan stabil untuk urutan angkatan berbeda', () => {
  const base = {
    mulai_jadwal: '2026-10-03T13:30:00',
    id_mata_kuliah: 10,
    paralel: null,
    kelas: 'REG',
    real_perkuliahan: 7,
    dosen_id: 5,
  };

  assert.equal(
    buildPerkuliahanImportKey({ ...base, id_angkatans: [27, 26] }),
    buildPerkuliahanImportKey({ ...base, id_angkatans: [26, 27] })
  );
});

test('validasi ketat menolak jadwal dengan referensi wajib yang hilang', () => {
  const issues = validatePerkuliahanImportRecord({
    mulai_jadwal: '2026-10-03T13:30:00',
    akhir_jadwal: '2026-10-03T16:00:00',
    id_angkatans: [],
  });

  assert.deepEqual(issues, [
    'mata kuliah tidak ditemukan',
    'angkatan tidak ditemukan',
    'dosen pengampu tidak ditemukan',
  ]);
});

test('validasi tidak menggandakan pesan referensi yang sudah spesifik', () => {
  const issues = validatePerkuliahanImportRecord(
    {
      mulai_jadwal: '2026-10-03T13:30:00',
      akhir_jadwal: '2026-10-03T16:00:00',
      id_mata_kuliah: 10,
      id_angkatan: 26,
      id_angkatans: [26],
    },
    ['dosen "Nama Tidak Ada" tidak ada di master data']
  );

  assert.deepEqual(issues, ['dosen "Nama Tidak Ada" tidak ada di master data']);
});

test('validasi menerima jadwal luring tanpa ruangan jika sumber memang kosong', () => {
  const issues = validatePerkuliahanImportRecord({
    mulai_jadwal: '2026-11-07T08:00:00',
    akhir_jadwal: '2026-11-07T10:30:00',
    id_mata_kuliah: 10,
    id_angkatan: 26,
    id_angkatans: [26, 27],
    dosen_id: 5,
    jenis_pertemuan: 'luring',
    ruangan_id: null,
  });

  assert.deepEqual(issues, []);
});

test('record sinkronisasi mengosongkan nilai lama dan mempertahankan lokasi daring', () => {
  const record = normalizePerkuliahanSyncRecord(
    {
      dosen_id: 5,
      id_angkatan: 26,
      id_angkatans: [26, 27],
      id_mata_kuliah: 10,
      mulai_jadwal: '2026-10-03T08:00:00',
      akhir_jadwal: '2026-10-03T10:30:00',
      jenis_pertemuan: 'daring',
      lokasi_virtual: 'Google Meet',
    },
    'batch-1'
  );

  assert.equal(record.lokasi_virtual, 'Google Meet');
  assert.equal(record.ruangan_id, null);
  assert.equal(record.note, null);
  assert.deepEqual(record.id_angkatans, [26, 27]);
  assert.equal(record.import_source, 'google_jadwal');
});
