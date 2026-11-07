import { usesPhysicalRoom } from './meetingRoom.js';

const EMPTY_VALUES = new Set(['', '-']);

export const ROOM_CONFLICT_EXEMPT_NAMES = ['Gardenia (Gd.B)'];

function getImportItemPriority(item) {
  const status = item?.aktif_nonaktif;
  if (status === true || status === 'true') return 2;
  if (status === false || status === 'false') return 0;
  return 1;
}

export function normalizeImportLookup(value) {
  if (value === null || value === undefined) return '';

  return (
    String(value)
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .trim()
      .toLocaleLowerCase('id-ID')
      // Nama pada Google Sheet sering memakai apostrof tipografis (Ma’arif),
      // sementara master data menyimpannya tanpa apostrof (Maarif). Apostrof
      // harus dihapus tanpa menambah spasi agar kedua bentuk tetap identik.
      .replace(/['’‘ʼʻ`]/g, '')
      // Abaikan perbedaan tanda baca gelar, misalnya "Maarif, M.Eng." dan
      // "Ma’arif M.Eng.". Kolisi pada tingkat prioritas yang sama tetap ditolak
      // oleh buildPreferredImportLookup agar pencocokan tidak menjadi ambigu.
      // Samakan singkatan gelar bertitik dan tanpa titik: S.E. = SE.
      .replace(/\./g, '')
      .replace(/[\p{P}\p{S}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export function exactImportLookup(value, lookup) {
  const key = normalizeImportLookup(value);
  if (!key || EMPTY_VALUES.has(key)) return null;
  return lookup?.[key] ?? null;
}

export function resolvePrimaryDosenImport({
  idDosen,
  email,
  name,
  dosenByExternalId,
  dosenByEmail,
  dosenByName,
}) {
  const normalizedIdDosen = normalizeImportLookup(idDosen);
  if (normalizedIdDosen && !EMPTY_VALUES.has(normalizedIdDosen)) {
    return {
      id: exactImportLookup(idDosen, dosenByExternalId),
      matchedBy: 'id_external',
      reference: String(idDosen).trim(),
    };
  }

  const normalizedEmail = normalizeImportLookup(email);
  if (normalizedEmail && !EMPTY_VALUES.has(normalizedEmail)) {
    const id = exactImportLookup(email, dosenByEmail);
    if (id != null) {
      return {
        id,
        matchedBy: 'email',
        reference: String(email).trim(),
      };
    }
  }

  return {
    id: exactImportLookup(name, dosenByName),
    matchedBy: 'name',
    reference: String(name || '').trim(),
  };
}

export function splitDosenLabels(value) {
  if (value === null || value === undefined) return [];

  return String(value)
    .split(/\s*(?:\/|;|\||\r?\n)\s*|\s+&\s+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export function shouldSkipScheduleImportRow(
  headers,
  row,
  { ignoreDisplayStatus = false } = {}
) {
  const normalizedHeaders = (headers || []).map((header) =>
    normalizeImportLookup(header)
  );
  const displayColumn = normalizedHeaders.findIndex((header) =>
    ['tampil', 'view', 'status tampil'].includes(header)
  );
  const displayValue =
    displayColumn >= 0 ? normalizeImportLookup(row?.[displayColumn]) : '';

  if (
    !ignoreDisplayStatus &&
    ['tidak', 'tidak tampil', 'view', 'hide', 'hidden'].includes(displayValue)
  ) {
    return true;
  }

  let nonEmptyCells = 0;
  let repeatedHeaderCells = 0;
  normalizedHeaders.forEach((header, index) => {
    const cell = normalizeImportLookup(row?.[index]);
    if (!cell) return;
    nonEmptyCells += 1;
    if (header && cell === header) repeatedHeaderCells += 1;
  });

  return (
    repeatedHeaderCells >= 3 &&
    repeatedHeaderCells >= Math.ceil(nonEmptyCells / 2)
  );
}

export function importedSchedulesOverlapInSameRoom(left, right) {
  if (left?.ruangan_id == null || right?.ruangan_id == null) return false;
  if (String(left.ruangan_id) !== String(right.ruangan_id)) return false;

  const leftStart = new Date(left.mulai_jadwal).getTime();
  const leftEnd = new Date(left.akhir_jadwal).getTime();
  const rightStart = new Date(right.mulai_jadwal).getTime();
  const rightEnd = new Date(right.akhir_jadwal).getTime();
  if (![leftStart, leftEnd, rightStart, rightEnd].every(Number.isFinite)) {
    return false;
  }

  return leftStart < rightEnd && leftEnd > rightStart;
}

export function isRoomConflictExempt(roomName) {
  const key = normalizeImportLookup(roomName);
  return ROOM_CONFLICT_EXEMPT_NAMES.some(
    (name) => normalizeImportLookup(name) === key
  );
}

export function findPendingRoomConflict({
  record,
  syncRowId,
  pendingRows = [],
  roomNameById = {},
}) {
  if (!usesPhysicalRoom(record?.jenis_pertemuan) || !record?.ruangan_id) {
    return null;
  }

  const roomName = roomNameById[String(record.ruangan_id)];
  if (isRoomConflictExempt(roomName)) return null;

  const conflict = pendingRows.find(
    (row) =>
      row.syncRowId !== syncRowId &&
      usesPhysicalRoom(row.record?.jenis_pertemuan) &&
      importedSchedulesOverlapInSameRoom(record, row.record)
  );
  if (!conflict) return null;

  return `${roomName || `Ruangan ${record.ruangan_id}`} juga dipakai oleh baris ${conflict.rowNumber} pada waktu yang bertabrakan`;
}

export function buildPreferredImportLookup(items, keySelector) {
  const candidates = new Map();

  for (const item of items || []) {
    const key = normalizeImportLookup(keySelector(item));
    if (!key || EMPTY_VALUES.has(key) || item?.id == null) continue;

    const priority = getImportItemPriority(item);
    const current = candidates.get(key);

    if (!current || priority > current.priority) {
      candidates.set(key, {
        priority,
        ids: new Map([[String(item.id), item.id]]),
      });
    } else if (priority === current.priority) {
      current.ids.set(String(item.id), item.id);
    }
  }

  return Object.fromEntries(
    [...candidates.entries()].map(([key, candidate]) => [
      key,
      candidate.ids.size === 1 ? [...candidate.ids.values()][0] : null,
    ])
  );
}

export function buildDosenExternalIdImportLookup(
  items,
  externalIdAliases = {}
) {
  const externalIdLookup = buildPreferredImportLookup(
    items,
    (item) => item.id_external
  );
  const idDosenLookup = buildPreferredImportLookup(
    items,
    (item) => item.id_dosen
  );

  for (const [externalIdAlias, targetIdDosen] of Object.entries(
    externalIdAliases
  )) {
    const aliasKey = normalizeImportLookup(externalIdAlias);
    const targetId = exactImportLookup(targetIdDosen, idDosenLookup);
    if (aliasKey && targetId != null) externalIdLookup[aliasKey] = targetId;
  }

  return externalIdLookup;
}

export function buildCanonicalImportLookup(
  items,
  keySelector,
  allowedDuplicateValues = []
) {
  const lookup = buildPreferredImportLookup(items, keySelector);

  for (const allowedValue of allowedDuplicateValues) {
    const key = normalizeImportLookup(allowedValue);
    const candidates = (items || [])
      .filter(
        (item) =>
          item?.id != null && normalizeImportLookup(keySelector(item)) === key
      )
      .sort((left, right) => {
        const priorityDifference =
          getImportItemPriority(right) - getImportItemPriority(left);
        if (priorityDifference !== 0) return priorityDifference;
        return Number(left.id) - Number(right.id);
      });

    if (candidates.length > 0) lookup[key] = candidates[0].id;
  }

  return lookup;
}

export function parseImportIdList(value) {
  if (Array.isArray(value)) return value.filter((item) => item != null);
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => item != null) : [];
  } catch {
    return [];
  }
}

export function buildPerkuliahanImportKey(record) {
  const angkatanIds = parseImportIdList(record.id_angkatans);
  if (angkatanIds.length === 0 && record.id_angkatan != null) {
    angkatanIds.push(record.id_angkatan);
  }

  const parts = [
    'v1',
    record.mulai_jadwal || '',
    record.id_mata_kuliah || '',
    [...new Set(angkatanIds.map(String))].sort().join(','),
    record.paralel ?? '',
    record.kelas || '',
    record.real_perkuliahan ?? '',
    record.dosen_id || '',
  ];

  return parts.map((part) => encodeURIComponent(String(part))).join('|');
}

export function validatePerkuliahanImportRecord(record, rowIssues = []) {
  const issues = [...rowIssues];
  const angkatanIds = parseImportIdList(record.id_angkatans);
  const hasIssue = (pattern) => issues.some((issue) => pattern.test(issue));

  if (!record.id_mata_kuliah && !hasIssue(/mata kuliah/i)) {
    issues.push('mata kuliah tidak ditemukan');
  }
  if (!record.id_angkatan || angkatanIds.length === 0) {
    if (!hasIssue(/angkatan/i)) issues.push('angkatan tidak ditemukan');
  }
  if (!record.dosen_id && !hasIssue(/dosen/i)) {
    issues.push('dosen pengampu tidak ditemukan');
  }
  if (!record.mulai_jadwal) issues.push('waktu mulai tidak valid');
  if (!record.akhir_jadwal) issues.push('waktu selesai tidak valid');

  if (record.mulai_jadwal && record.akhir_jadwal) {
    const start = new Date(record.mulai_jadwal).getTime();
    const end = new Date(record.akhir_jadwal).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      issues.push('waktu selesai harus setelah waktu mulai');
    }
  }

  return [...new Set(issues)];
}

export function normalizePerkuliahanSyncRecord(record, batchTag) {
  const angkatanIds = parseImportIdList(record.id_angkatans);
  const primaryAngkatan = record.id_angkatan ?? angkatanIds[0] ?? null;

  return {
    dosen_id: record.dosen_id ?? null,
    ruangan_id: record.ruangan_id ?? null,
    id_angkatan: primaryAngkatan,
    id_angkatans: [...new Set(angkatanIds)],
    id_mata_kuliah: record.id_mata_kuliah ?? null,
    mulai_jadwal: record.mulai_jadwal ?? null,
    akhir_jadwal: record.akhir_jadwal ?? null,
    jenis_pertemuan: record.jenis_pertemuan || 'luring',
    lokasi_virtual: record.lokasi_virtual ?? null,
    zoom_id: record.zoom_id ?? null,
    zoom_password: record.zoom_password ?? null,
    note: record.note ?? null,
    paralel: record.paralel ?? null,
    real_perkuliahan: record.real_perkuliahan ?? null,
    petugas_zoom: record.petugas_zoom ?? null,
    moderator: record.moderator ?? null,
    dosen_ids: parseImportIdList(record.dosen_ids),
    penguji_ids: parseImportIdList(record.penguji_ids),
    pintang_sps: record.pintang_sps ?? null,
    kelas: record.kelas ?? null,
    kegiatan: record.kegiatan ?? null,
    quota: record.quota ?? null,
    import_source: 'google_jadwal',
    import_key: buildPerkuliahanImportKey(record),
    import_batch: batchTag,
    updated_by: batchTag,
  };
}

export function isLegacyScheduleImport(record) {
  return /-\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/.test(
    String(record?.created_by || '')
  );
}
