import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

// Execute the existing helper with only its browser/Supabase dependencies stubbed.
// No emails, sessions, or database requests leave this test process.
const source = readFileSync(
  new URL('../src/utils/emailOTP.js', import.meta.url),
  'utf8'
)
  .replace("import { supabase } from '../supabaseClient';", '')
  .replace(/^export /gm, '');

function setup({ teknisi = null, dosen = null, sendError = null } = {}) {
  const calls = [];
  const storage = new Map();
  const session = { user: { id: 'test-auth-id' } };
  let verification = {
    data: { session, user: session.user },
    error: null,
  };
  const supabase = {
    from(table) {
      calls.push(['from', table]);
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        not() {
          return query;
        },
        async single() {
          return { data: table === 'Teknisi' ? teknisi : dosen, error: null };
        },
      };
      return query;
    },
    auth: {
      async signInWithOtp(args) {
        calls.push(['send', args]);
        return { data: {}, error: sendError };
      },
      async verifyOtp(args) {
        calls.push(['verify', args]);
        return verification;
      },
    },
  };
  const api = runInNewContext(
    `${source}\n({ sendEmailOTP, verifyEmailOTP, resendEmailOTP });`,
    {
      supabase,
      localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
      },
      console: {
        error: () => assert.fail('OTP helper must not log auth payloads'),
        log: () => assert.fail('OTP helper must not log auth payloads'),
      },
    }
  );
  return {
    ...api,
    calls,
    storage,
    session,
    setVerification: (value) => (verification = value),
  };
}

for (const userType of ['teknisi', 'dosen']) {
  test(`registered ${userType} requests OTP without creating an Auth account`, async () => {
    const helper = setup({ [userType]: { id: 'TEST-user', roles_id: 3 } });
    const result = await helper.sendEmailOTP('test@example.invalid');
    assert.equal(result.success, true);
    assert.equal(result.userType, userType);
    const [, args] = helper.calls.find(([kind]) => kind === 'send');
    assert.equal(args.email, 'test@example.invalid');
    assert.equal(args.options.shouldCreateUser, false);
    assert.equal(helper.storage.size, 0);
  });
}

test('unregistered email is rejected before requesting an OTP', async () => {
  const helper = setup();
  await assert.rejects(helper.sendEmailOTP('new@example.invalid'), /terdaftar/);
  assert.equal(
    helper.calls.some(([kind]) => kind === 'send'),
    false
  );
});

test('profile without an Auth account never opts into account creation', async () => {
  const helper = setup({
    teknisi: { id: 'TEST-user' },
    sendError: { message: 'Signups not allowed for otp' },
  });
  await assert.rejects(
    helper.sendEmailOTP('test@example.invalid'),
    /terdaftar/
  );
  assert.equal(helper.calls.at(-1)[1].options.shouldCreateUser, false);
});

test('verification returns the SDK session unchanged without profile writes or storage', async () => {
  const helper = setup();
  const result = await helper.verifyEmailOTP('test@example.invalid', '123456');
  assert.equal(result.session, helper.session);
  assert.equal(result.user, helper.session.user);
  assert.equal(helper.calls.length, 1);
  const [, args] = helper.calls[0];
  assert.equal(args.email, 'test@example.invalid');
  assert.equal(args.token, '123456');
  assert.equal(args.type, 'email');
  assert.equal(helper.storage.size, 0);
});

test('invalid OTP is rejected without exposing a session', async () => {
  const helper = setup();
  helper.setVerification({
    data: { session: null },
    error: { message: 'Invalid token', status: 403 },
  });
  await assert.rejects(
    helper.verifyEmailOTP('test@example.invalid', '000000'),
    /tidak valid/
  );
  assert.equal(helper.storage.size, 0);
});

test('expired OTP reports that a new code is needed', async () => {
  const helper = setup();
  helper.setVerification({
    data: null,
    error: { code: 'otp_expired', message: 'Token has expired' },
  });
  await assert.rejects(
    helper.verifyEmailOTP('test@example.invalid', '000000'),
    /kedaluwarsa.*Kirim ulang/
  );
});

test('missing SDK session is not reported as successful login', async () => {
  const helper = setup();
  helper.setVerification({ data: { session: null, user: null }, error: null });
  await assert.rejects(
    helper.verifyEmailOTP('test@example.invalid', '123456'),
    /Sesi login belum terbentuk/
  );
});

test('resend reuses registered-only OTP request', async () => {
  const helper = setup({ teknisi: { id: 'TEST-user' } });
  await helper.resendEmailOTP('test@example.invalid');
  assert.equal(helper.calls.at(-1)[1].options.shouldCreateUser, false);
});

test('rate limiting stores only the cooldown timestamp', async () => {
  const helper = setup({
    teknisi: { id: 'TEST-user' },
    sendError: { status: 429, message: 'request this after 20 seconds' },
  });
  await assert.rejects(helper.sendEmailOTP('test@example.invalid'), /25 detik/);
  assert.deepEqual(
    [...helper.storage.keys()],
    ['otp_cooldown_test@example.invalid']
  );
  assert.match([...helper.storage.values()][0], /^\d+$/);
});
