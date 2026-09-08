import assert from 'node:assert/strict';
import test from 'node:test';

import { usesPhysicalRoom } from '../src/utils/meetingRoom.js';

test('hanya pertemuan daring yang tidak menggunakan ruangan fisik', () => {
  assert.equal(usesPhysicalRoom('luring'), true);
  assert.equal(usesPhysicalRoom('hybrid'), true);
  assert.equal(usesPhysicalRoom(undefined), true);
  assert.equal(usesPhysicalRoom('daring'), false);
  assert.equal(usesPhysicalRoom('online'), false);
  assert.equal(usesPhysicalRoom(' DARING '), false);
  assert.equal(usesPhysicalRoom('Daring (Online)'), false);
  assert.equal(usesPhysicalRoom('FULL DARING'), false);
  assert.equal(usesPhysicalRoom('Hybrid (Online & Offline)'), true);
});
