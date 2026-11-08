import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getVisibleMenuItems,
  MENU_ITEMS,
} from '../src/constants/navigation.js';

const pathsFor = (role, email) =>
  getVisibleMenuItems(role, email).map((item) => item.to);
const common = ['/dashboard', '/dashboard/jadwal', '/dashboard/ruangan'];

test('sidebar preserves ordinary, missing and unrecognized role navigation', () => {
  for (const role of [
    undefined,
    null,
    '',
    'user',
    'dosen',
    'ADMIN',
    'super_admin',
  ]) {
    assert.deepEqual(pathsFor(role, 'other@example.com'), common);
  }
});

test('sidebar preserves the admin and super admin route order', () => {
  const admin = [
    '/dashboard',
    '/dashboard/jadwal',
    '/dashboard/jadwal-admin',
    '/dashboard/monitor-settings',
    '/dashboard/ruangan',
    '/dashboard/database',
  ];
  assert.deepEqual(pathsFor('admin'), admin);
  assert.deepEqual(pathsFor('super admin'), [...admin, '/dashboard/users']);
});

test('Honor Dosen visibility remains email-based independently of role', () => {
  for (const email of [' INDAHAYU@APPS.IPB.AC.ID ', 'azka.mbipb@gmail.com']) {
    assert.deepEqual(pathsFor('dosen', email), [
      '/dashboard',
      '/dashboard/jadwal',
      '/dashboard/honor-dosen',
      '/dashboard/ruangan',
    ]);
    assert.equal(pathsFor('super admin', email).length, 8);
  }
  assert.equal(
    pathsFor('super admin', 'other@example.com').includes(
      '/dashboard/honor-dosen'
    ),
    false
  );
});

test('navigation retains exact dashboard matching and does not mutate its definitions', () => {
  const original = MENU_ITEMS.map((item) => ({ ...item }));
  const visible = getVisibleMenuItems('super admin', 'other@example.com');
  visible.pop();
  assert.deepEqual(MENU_ITEMS, original);
  assert.equal(MENU_ITEMS[0].end, true);
  assert.equal(
    MENU_ITEMS.slice(1).every((item) => item.end === undefined),
    true
  );
});
