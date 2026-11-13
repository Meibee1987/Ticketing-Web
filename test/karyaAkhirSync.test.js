import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildKaryaAkhirImportKey,
  buildKaryaAkhirReviewRow,
  buildKaryaAkhirAgendaImportLookup,
  exactImportLookup,
  normalizeKaryaAkhirSyncRecord,
  validateKaryaAkhirImportRecord,
  findKaryaAkhirScheduleConflict,
  findKaryaAkhirDatabaseConflict,
  findPendingRoomConflict,
} from '../src/utils/scheduleImport.js';
import { normalizeKaryaAkhirAgenda } from '../src/utils/karyaAkhir.js';

test('agenda laporan kegagalan cocok ke master, termasuk label setara dan duplikat', () => {
  const lookup = buildKaryaAkhirAgendaImportLookup([
    { id: 7, agenda_karya_akhir: 'Seminar Hasil' },
    { id: 8, agenda_karya_akhir: 'Seminar Hasil' },
    { id: 10, agenda_karya_akhir: 'Promosi Terbuka' },
    { id: 11, agenda_karya_akhir: 'Sidang Promosi Terbuka' },
  ]);
  assert.equal(
    exactImportLookup(
      normalizeKaryaAkhirAgenda('Sidang Promosi Terbuka'),
      lookup
    ),
    10
  );
  assert.equal(exactImportLookup('Seminar Hasil', lookup), 7);
  assert.equal(exactImportLookup('Seminar', lookup), null);
  const aliasOnly = buildKaryaAkhirAgendaImportLookup([
    { id: 11, agenda_karya_akhir: 'Sidang Promosi Terbuka' },
  ]);
  assert.equal(exactImportLookup('Promosi Terbuka', aliasOnly), 11);
});

test('Seminar Hasil tetap cocok ketika master memiliki duplikat dengan newline', () => {
  const lookup = buildKaryaAkhirAgendaImportLookup([
    { id: 4, agenda_karya_akhir: 'Seminar Hasil\n' },
    { id: 9, agenda_karya_akhir: 'Seminar Hasil' },
  ]);
  assert.equal(exactImportLookup('Seminar Hasil', lookup), 4);
  assert.equal(exactImportLookup('Seminar Hasil\r\n', lookup), 4);
});

const schedule = (patch = {}) => ({
  nama_mahasiswa: 'Wanda',
  nama_angkatan: 1,
  agenda_jadwal_karya_akhir: 2,
  nama_ruangan: 3,
  jenis_pertemuan: 'luring',
  mulai_jadwal: '2026-11-12T09:00:00',
  akhir_jadwal: '2026-11-12T10:00:00',
  dosen_ids: [11],
  penguji_ids: [12],
  ...patch,
});

test('antrean memakai ID sumber stabil dan menyimpan referensi gagal beserta data aslinya', () => {
  const row = buildKaryaAkhirReviewRow({
    record: schedule({ agenda_jadwal_karya_akhir: null }),
    batchTag: 'one',
    headers: ['ID', 'Kegiatan'],
    row: ['ka-123', 'Agenda baru'],
    rowNumber: 6,
    issues: ['agenda belum ada'],
  });
  const changed = buildKaryaAkhirReviewRow({
    record: schedule({ mulai_jadwal: '2026-11-12T14:00:00' }),
    batchTag: 'two',
    headers: ['ID', 'Kegiatan'],
    row: ['ka-123', 'Agenda baru'],
    rowNumber: 7,
  });
  assert.equal(row.source_key, changed.source_key);
  assert.equal(row.source_data.Kegiatan, 'Agenda baru');
  assert.deepEqual(row.validation_issues, ['agenda belum ada']);
  assert.equal(row.row_number, 6);
  assert.equal(row.agenda_jadwal_karya_akhir, null);
});

test('registri NIM mempertahankan koreksi lokal walau ID gabungan tanggal berubah', () => {
  const args = {
    record: schedule(),
    batchTag: 'batch',
    headers: ['ID', 'NIM', 'Kegiatan'],
    rowNumber: 1,
  };
  const first = buildKaryaAkhirReviewRow({
    ...args,
    row: ['old-date-id', 'K160123', 'Seminar Hasil'],
  });
  const changed = buildKaryaAkhirReviewRow({
    ...args,
    row: ['new-date-id', 'K160123', 'Seminar Hasil'],
  });
  assert.equal(first.source_key, changed.source_key);
});

test('identitas karya akhir stabil saat panel/ruangan berubah dan nama dinormalisasi', () => {
  assert.equal(
    buildKaryaAkhirImportKey(schedule()),
    buildKaryaAkhirImportKey(
      schedule({
        nama_mahasiswa: '  WANDA  ',
        nama_ruangan: 5,
        dosen_ids: [14, 13],
        akhir_jadwal: '2026-11-12T11:00:00',
      })
    )
  );
  assert.notEqual(
    buildKaryaAkhirImportKey(schedule()),
    buildKaryaAkhirImportKey(schedule({ nama_mahasiswa: 'Rani' }))
  );
});

test('normalisasi membersihkan field kosong dan ID duplikat untuk update ulang', () => {
  const record = normalizeKaryaAkhirSyncRecord(
    schedule({ dosen_ids: '[11,11]', penguji_ids: '[12,12]' }),
    'batch'
  );
  assert.deepEqual(record.dosen_ids, [11]);
  assert.deepEqual(record.penguji_ids, [12]);
  assert.equal(record.note, null);
  assert.equal(record.import_source, 'google_jadwal');
  assert.deepEqual(validateKaryaAkhirImportRecord(record), []);
});

test('validasi menolak dosen kosong, referensi tidak valid, serta rentang waktu salah', () => {
  const issues = validateKaryaAkhirImportRecord(
    schedule({ dosen_ids: [], penguji_ids: [], akhir_jadwal: 'invalid' }),
    ['ID tidak dikenal']
  );
  assert.equal(issues.length, 3);
  assert.ok(issues.includes('ID tidak dikenal'));
});

test('benturan mencakup pembimbing, penguji, dosen utama perkuliahan, dan daring', () => {
  assert.match(
    findKaryaAkhirScheduleConflict(
      schedule(),
      schedule({ nama_mahasiswa: 'Rani', dosen_ids: [12], penguji_ids: [] })
    ),
    /Dosen ID 12/
  );
  assert.match(
    findKaryaAkhirScheduleConflict(schedule({ jenis_pertemuan: 'daring' }), {
      dosen_id: 11,
      mulai_jadwal: '2026-11-12T09:30:00',
      akhir_jadwal: '2026-11-12T10:30:00',
    }),
    /Dosen ID 11/
  );
  assert.equal(
    findKaryaAkhirScheduleConflict(
      schedule(),
      schedule({
        nama_mahasiswa: 'Rani',
        mulai_jadwal: '2026-11-12T10:00:00',
        akhir_jadwal: '2026-11-12T11:00:00',
      })
    ),
    null
  );
});

test('duplikat tetap ditolak saat dosen dan ruangan berbeda', () => {
  assert.match(
    findKaryaAkhirScheduleConflict(
      schedule(),
      schedule({ dosen_ids: [20], penguji_ids: [], nama_ruangan: 9 })
    ),
    /duplikat/
  );
});

test('konflik ruangan antarbaris karya akhir, daring, dan pengecualian Gardenia', () => {
  const args = {
    record: schedule(),
    syncRowId: 'one',
    pendingRows: [
      {
        syncRowId: 'two',
        rowNumber: 2,
        record: schedule({
          nama_mahasiswa: 'Rani',
          dosen_ids: [20],
          penguji_ids: [],
        }),
      },
    ],
  };
  assert.match(findPendingRoomConflict(args), /baris 2/);
  assert.equal(
    findPendingRoomConflict({
      ...args,
      record: schedule({ jenis_pertemuan: 'daring' }),
    }),
    null
  );
  assert.equal(
    findPendingRoomConflict({
      ...args,
      roomNameById: { 3: 'Gardenia (Gd.B)' },
    }),
    null
  );
  args.pendingRows[0].record.dosen_ids = [11];
  assert.match(
    findPendingRoomConflict({
      ...args,
      roomNameById: { 3: 'Gardenia (Gd.B)' },
    }),
    /Dosen ID 11/
  );
});

test('pengecekan database mengecualikan import lama tetapi tetap memeriksa jadwal manual', async () => {
  const client = {
    from(table) {
      const query = {
        select() {
          return query;
        },
        lt() {
          return query;
        },
        gt() {
          return query;
        },
        order() {
          return query;
        },
        async range() {
          return {
            data:
              table === 'jadwal_karya_akhir'
                ? [schedule({ id: 1 }), schedule({ id: 2 })]
                : [],
          };
        },
      };
      return query;
    },
  };
  assert.match(
    await findKaryaAkhirDatabaseConflict({
      client,
      record: schedule(),
      excludedIds: [1],
    }),
    /ID 2/
  );
  assert.equal(
    await findKaryaAkhirDatabaseConflict({
      client,
      record: schedule(),
      excludedIds: [1],
      existingId: 2,
    }),
    null
  );
});

test('kegagalan pengecekan database tidak dianggap bebas konflik', async () => {
  const query = {
    select() {
      return query;
    },
    lt() {
      return query;
    },
    gt() {
      return query;
    },
    order() {
      return query;
    },
    async range() {
      return { error: { message: 'denied' } };
    },
  };
  await assert.rejects(
    findKaryaAkhirDatabaseConflict({
      client: { from: () => query },
      record: schedule(),
    }),
    /denied/
  );
});
