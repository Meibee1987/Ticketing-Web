import assert from 'node:assert/strict';
import test from 'node:test';
import { parseIdList } from '../src/utils/parseIdList.js';

test('ID arrays retain identity, element types, order and duplicates', () => {
  const ids = [1, '02', null, 1, { id: 3 }];
  assert.equal(parseIdList(ids), ids);
  assert.deepEqual(parseIdList(JSON.stringify(ids)), ids);
});

test('invalid, scalar and CSV ID values retain the empty-array fallback', () => {
  for (const value of [
    null,
    undefined,
    0,
    2,
    {},
    '',
    '1,2',
    '[',
    'null',
    '1',
    'true',
    '{}',
    '"1"',
  ]) {
    assert.deepEqual(parseIdList(value), []);
  }
  assert.deepEqual(parseIdList(' [1,"2"] '), [1, '2']);
});
