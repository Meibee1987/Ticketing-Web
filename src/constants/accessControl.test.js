import test from 'node:test';
import assert from 'node:assert/strict';
import { HONOR_DOSEN_ALLOWED_EMAILS, isEmailAllowed } from './accessControl.js';

test('akses Honor Dosen hanya diberikan kepada dua email yang ditentukan', () => {
  assert.equal(
    isEmailAllowed('indahayu@apps.ipb.ac.id', HONOR_DOSEN_ALLOWED_EMAILS),
    true
  );
  assert.equal(
    isEmailAllowed('AZKA.MBIPB@GMAIL.COM', HONOR_DOSEN_ALLOWED_EMAILS),
    true
  );
  assert.equal(
    isEmailAllowed('admin-lain@apps.ipb.ac.id', HONOR_DOSEN_ALLOWED_EMAILS),
    false
  );
});
