import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildScheduleNotification,
  formatNotificationTime,
  loadNotificationState,
  mergeNotification,
} from '../src/utils/notifications.js';
import { assertSupabaseResults } from '../src/utils/supabaseResults.js';

test('mergeNotification keeps newest items and removes realtime duplicates', () => {
  const now = 1_700_000_000_000;
  const first = mergeNotification([], {
    id: 'manual',
    type: 'tambah',
    tag: 'BARU',
    title: 'Jadwal Baru Ditambahkan',
    description: 'Dibuat dari form.',
    timestamp: now,
  });
  const duplicate = mergeNotification(
    first,
    {
      id: 'realtime',
      type: 'sukses',
      tag: 'BARU',
      title: 'Jadwal Baru Ditambahkan',
      description: 'Diterima dari realtime.',
      timestamp: now + 1000,
    },
    now + 1000
  );

  assert.equal(duplicate.length, 1);
  assert.equal(duplicate[0].id, 'manual');
});

test('formatNotificationTime creates useful relative labels', () => {
  const now = 1_700_000_000_000;

  assert.equal(formatNotificationTime(now - 20_000, now), 'Baru saja');
  assert.equal(formatNotificationTime(now - 5 * 60_000, now), '5 menit lalu');
  assert.equal(
    formatNotificationTime(now - 3 * 60 * 60_000, now),
    '3 jam lalu'
  );
});

test('loadNotificationState rejects malformed persisted values', () => {
  const state = loadNotificationState('{invalid-json');

  assert.deepEqual(state.notifications, []);
  assert.equal(state.readIds.size, 0);
});

test('buildScheduleNotification maps database events', () => {
  const notification = buildScheduleNotification(
    {
      eventType: 'DELETE',
      table: 'jadwal_lain_lain',
      old: { id: 7, agenda: 'Rapat' },
    },
    123
  );

  assert.equal(notification.tag, 'HAPUS');
  assert.equal(notification.title, 'Jadwal Dihapus');
  assert.match(notification.description, /Rapat/);
});

test('assertSupabaseResults exposes database errors instead of hiding them', () => {
  assert.throws(
    () =>
      assertSupabaseResults([
        ['Jadwal', { error: { message: 'permission denied' } }],
      ]),
    /Jadwal: permission denied/
  );
});
