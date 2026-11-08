import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchAllTableRows,
  fetchExistingSchedulesFrom,
} from '../src/services/scheduleReads.js';
import { fetchRoomData } from '../src/services/roomReads.js';

// Records observable query contracts without contacting a database.
function stubClient(results) {
  const calls = [];
  const offsets = {};
  return {
    calls,
    from(table) {
      const call = { table, operations: [] };
      calls.push(call);
      const builder = {};
      for (const method of ['select', 'order', 'range', 'gte']) {
        builder[method] = (...args) => {
          call.operations.push([method, ...args]);
          return builder;
        };
      }
      builder.then = (resolve, reject) => {
        const index = offsets[table] || 0;
        offsets[table] = index + 1;
        const result = results[table]?.[index];
        assert.notEqual(
          result,
          undefined,
          `Unexpected query: ${table}, page ${index}`
        );
        return (
          result instanceof Error
            ? Promise.reject(result)
            : Promise.resolve(result)
        ).then(resolve, reject);
      };
      return builder;
    },
  };
}

test('admin reads preserve ID ordering, inclusive 1000-row ranges and final response metadata', async () => {
  const fullPage = Array.from({ length: 1000 }, (_, id) => ({ id }));
  const client = stubClient({
    schedules: [
      { data: fullPage, error: null, status: 206 },
      { data: [{ id: 1000 }], error: null, status: 200, count: 1001 },
    ],
  });
  const result = await fetchAllTableRows(client, 'schedules', 'id');
  assert.deepEqual(result, {
    data: [...fullPage, { id: 1000 }],
    error: null,
    status: 200,
    count: 1001,
  });
  assert.deepEqual(
    client.calls.map((call) => call.operations),
    [
      [
        ['select', 'id'],
        ['order', 'id', { ascending: true }],
        ['range', 0, 999],
      ],
      [
        ['select', 'id'],
        ['order', 'id', { ascending: true }],
        ['range', 1000, 1999],
      ],
    ]
  );
});

test('admin reads return an error response intact even after a successful page', async () => {
  const failure = { data: null, error: { message: 'denied' }, status: 403 };
  const client = stubClient({
    schedules: [{ data: Array(1000).fill({ id: 1 }) }, failure],
  });
  assert.equal(await fetchAllTableRows(client, 'schedules'), failure);
  assert.equal(client.calls.length, 2);
});

test('exact page-size results require a final empty request; null data remains empty', async () => {
  const fullPage = Array(1000).fill({ id: 1 });
  const client = stubClient({
    schedules: [{ data: fullPage }, { data: null, error: null }],
  });
  assert.deepEqual(
    (await fetchAllTableRows(client, 'schedules')).data,
    fullPage
  );
  assert.equal(client.calls.length, 2);
  assert.deepEqual(
    (
      await fetchAllTableRows(
        stubClient({ schedules: [{ data: null }] }),
        'schedules'
      )
    ).data,
    []
  );
});

test('import reads preserve the start filter on every page and return rows only', async () => {
  const rows = Array(1000).fill({ id: 1 });
  const client = stubClient({
    schedules: [{ data: rows }, { data: [{ id: 2 }] }],
  });
  assert.deepEqual(
    await fetchExistingSchedulesFrom(
      client,
      'schedules',
      '2026-11-08T00:00:00'
    ),
    [...rows, { id: 2 }]
  );
  for (const [index, call] of client.calls.entries()) {
    assert.deepEqual(call.operations, [
      ['select', '*'],
      ['gte', 'mulai_jadwal', '2026-11-08T00:00:00'],
      ['order', 'id', { ascending: true }],
      ['range', index * 1000, index * 1000 + 999],
    ]);
  }
});

test('import reads throw the original database error and propagate transport rejection', async () => {
  const error = { message: 'permission denied', code: '42501' };
  await assert.rejects(
    fetchExistingSchedulesFrom(
      stubClient({ schedules: [{ error }] }),
      'schedules',
      'date'
    ),
    (actual) => actual === error
  );
  const transport = new Error('network unavailable');
  await assert.rejects(
    fetchAllTableRows(stubClient({ schedules: [transport] }), 'schedules'),
    (actual) => actual === transport
  );
});

function roomResults(overrides = {}) {
  const data = {
    ruangan: [{ id: 10, nama_ruangan: 'A', aktif_nonaktif: false }],
    dosen: [{ id: 20, nama_dosen: 'Dosen' }],
    angkatan: [{ id: 30, nama_angkatan: 'Angkatan' }],
    mata_kuliah: [{ id: 40, mata_kuliah: 'Kuliah' }],
    agenda_karya_akhir: [{ id: 50, agenda_karya_akhir: 'Sidang' }],
    jadwal_perkuliahan: [
      {
        id: 1,
        ruangan_id: 10,
        dosen_id: 20,
        id_angkatan: 30,
        id_mata_kuliah: 40,
        jenis_pertemuan: 'daring',
        mulai_jadwal: '2026-11-08T10:00:00',
        akhir_jadwal: '2026-11-08T11:00:00',
      },
      { id: 2, mulai_jadwal: null, akhir_jadwal: null },
    ],
    jadwal_karya_akhir: [
      {
        id: 3,
        nama_ruangan: 10,
        nama_angkatan: 30,
        agenda_jadwal_karya_akhir: 50,
        mulai_jadwal: '2026-11-08T08:00:00',
        akhir_jadwal: '2026-11-08T09:00:00',
      },
    ],
    jadwal_lain_lain: [
      {
        id: 4,
        nama_ruangan: 99,
        mulai_jadwal: '2026-11-08T09:00:00',
        akhir_jadwal: '2026-11-08T10:00:00',
      },
    ],
    ...overrides,
  };
  return Object.fromEntries(
    Object.entries(data).map(([table, rows]) => [
      table,
      [{ data: rows, error: null }],
    ])
  );
}

test('room reads retain all eight query projections and the existing booking shape', async () => {
  const client = stubClient(roomResults());
  const result = await fetchRoomData(client);
  assert.deepEqual(client.calls, [
    {
      table: 'ruangan',
      operations: [
        [
          'select',
          'id, nama_ruangan, kapasitas_ruangan, gedung, aktif_nonaktif',
        ],
        ['order', 'nama_ruangan'],
      ],
    },
    ...['jadwal_perkuliahan', 'jadwal_karya_akhir', 'jadwal_lain_lain'].map(
      (table) => ({ table, operations: [['select', '*']] })
    ),
    { table: 'dosen', operations: [['select', 'id, nama_dosen']] },
    { table: 'angkatan', operations: [['select', 'id, nama_angkatan']] },
    { table: 'mata_kuliah', operations: [['select', '*']] },
    {
      table: 'agenda_karya_akhir',
      operations: [['select', 'id, agenda_karya_akhir']],
    },
  ]);
  assert.equal(result.ruangan[0].aktif_nonaktif, false);
  assert.deepEqual(
    result.allBookings.map((row) => row.id),
    ['karya_akhir-3', 'lain_lain-4', 'perkuliahan-1']
  );
  assert.deepEqual(result.allBookings[2], {
    id: 'perkuliahan-1',
    ruangan_id: 10,
    ruangan_nama: 'A',
    mulai: new Date('2026-11-08T10:00:00'),
    akhir: new Date('2026-11-08T11:00:00'),
    source: 'Perkuliahan',
    sourceColor: 'blue',
    description: 'Kuliah',
    detail: 'Dosen',
    angkatan: 'Angkatan',
    jenis_pertemuan: 'daring',
  });
  assert.equal(result.allBookings[0].description, 'Sidang');
  assert.equal(result.allBookings[0].jenis_pertemuan, undefined);
  assert.equal(result.allBookings[1].ruangan_nama, 'Ruangan 99');
  assert.equal(result.allBookings[1].description, 'Kegiatan');
});

test('room reads retain null-data fallbacks and labeled errors', async () => {
  const client = stubClient(
    roomResults({
      jadwal_perkuliahan: null,
      jadwal_karya_akhir: [],
      jadwal_lain_lain: [],
      ruangan: null,
    })
  );
  assert.deepEqual(await fetchRoomData(client), {
    ruangan: [],
    allBookings: [],
  });
  const results = roomResults();
  const cause = { message: 'permission denied', code: '42501' };
  results.dosen = [{ error: cause }];
  await assert.rejects(
    fetchRoomData(stubClient(results)),
    (error) =>
      error.message === 'Referensi dosen: permission denied' &&
      error.cause === cause
  );
});
