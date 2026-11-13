import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reviewFields,
  reviewDate,
  reviewIssue,
  reviewIssueDetails,
  conflictingLecturerIds,
} from '../src/utils/scheduleReviewDisplay.js';

test('badge memakai ID dosen yang konflik tanpa menandai ID jadwal', () => {
  assert.deepEqual(
    conflictingLecturerIds([
      'Konflik dosen ID 27 dengan Karya Akhir ID 77 (2026-11-13 13:00:00 - 2026-11-13 14:00:00); Konflik dosen ID 27, 235 dengan Perkuliahan ID 8',
      'Konflik ruangan dengan Karya Akhir ID 106',
    ]),
    ['27', '235']
  );
  assert.deepEqual(conflictingLecturerIds(), []);
});

test('konflik dosen membuka dosen dan waktu tanpa data lain', () => {
  assert.deepEqual(
    reviewFields({ issues: ['Konflik dosen ID 27 dengan Karya Akhir ID 77'] }),
    {
      time: true,
      room: false,
      lecturers: true,
      activity: false,
      cohorts: false,
      student: false,
    }
  );
});

test('setiap konflik dipisah dan nama bergelar koma tetap utuh', () => {
  const issues = reviewIssueDetails(
    [
      'Konflik dosen ID 27, 235 dengan Karya Akhir ID 77 (2026-11-13 13:30:00 - 2026-11-13 15:30:00); Konflik ruangan dengan Perkuliahan ID 8 (2026-11-13 13:00:00 - 2026-11-13 14:00:00)',
    ],
    [
      { id: 27, nama_dosen: 'Prof. Dr. A, M.S.' },
      { id: 235, nama_dosen: 'Dr. B, M.M.' },
    ]
  );
  assert.equal(issues.length, 2);
  assert.deepEqual(issues[0], {
    title: 'Konflik dosen',
    lecturers: ['Prof. Dr. A, M.S.', 'Dr. B, M.M.'],
    activity: 'Karya Akhir',
    start: '13/11/2026 13:30',
    end: '13/11/2026 15:30',
  });
  assert.equal(issues[1].title, 'Konflik ruangan');
  assert.equal(issues[1].activity, 'Perkuliahan');
  assert.deepEqual(reviewIssueDetails(['Angkatan tidak ditemukan']), [
    { title: 'Angkatan tidak ditemukan', lecturers: [] },
  ]);
});

test('konflik ruangan membuka ruangan dan waktu tanpa dosen', () => {
  const fields = reviewFields({
    issues: ['Konflik ruangan dengan Perkuliahan ID 5'],
  });
  assert.equal(fields.room, true);
  assert.equal(fields.time, true);
  assert.equal(fields.lecturers, false);
});

test('kesalahan referensi tetap menyediakan editor yang diperlukan', () => {
  const fields = reviewFields({
    issues: [
      'Agenda tidak ditemukan',
      'Angkatan tidak ditemukan',
      'Nama mahasiswa wajib diisi',
    ],
  });
  assert.equal(fields.activity, true);
  assert.equal(fields.cohorts, true);
  assert.equal(fields.student, true);
  assert.equal(fields.lecturers, false);
});

test('pesan konflik memakai nama dosen dan tanggal yang mudah dibaca', () => {
  assert.equal(
    reviewIssue(
      'Konflik dosen ID 27, 235 dengan Karya Akhir ID 77 (2026-11-11 13:00:00 - 2026-11-11 16:00:00)',
      [{ id: 27, nama_dosen: 'Dosen A' }]
    ),
    'Konflik dosen Dosen A, ID 235 dengan Karya Akhir (11/11/2026 13:00 - 11/11/2026 16:00)'
  );
  assert.equal(reviewDate('2026-11-11T13:00:00'), '11/11/2026');
  assert.equal(reviewDate(null), 'Tanggal belum valid');
});
