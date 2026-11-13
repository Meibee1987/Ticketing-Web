import { usesPhysicalRoom } from './meetingRoom.js';
import { normalizeKaryaAkhirAgenda } from './karyaAkhir.js';

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
  if (record?.nama_mahasiswa != null) {
    const conflict = pendingRows.find(
      (row) =>
        row.syncRowId !== syncRowId &&
        findKaryaAkhirScheduleConflict(record, row.record)
    );
    if (conflict)
      return `${findKaryaAkhirScheduleConflict(record, conflict.record)} (baris ${conflict.rowNumber})`;
  }
  const roomId = record?.ruangan_id ?? record?.nama_ruangan;
  if (!usesPhysicalRoom(record?.jenis_pertemuan) || !roomId) {
    return null;
  }

  const roomName = roomNameById[String(roomId)];
  if (isRoomConflictExempt(roomName)) return null;

  const conflict = pendingRows.find(
    (row) =>
      row.syncRowId !== syncRowId &&
      usesPhysicalRoom(row.record?.jenis_pertemuan) &&
      importedSchedulesOverlapInSameRoom(
        { ...record, ruangan_id: roomId },
        {
          ...row.record,
          ruangan_id: row.record.ruangan_id ?? row.record.nama_ruangan,
        }
      )
  );
  if (!conflict) return null;

  return `${roomName || `Ruangan ${roomId}`} juga dipakai oleh baris ${conflict.rowNumber} pada waktu yang bertabrakan`;
}

export function getScheduleDosenIds(record) {
  return [
    ...new Set(
      [
        record?.dosen_id,
        ...parseImportIdList(record?.dosen_ids),
        ...parseImportIdList(record?.penguji_ids),
      ]
        .filter((id) => id != null)
        .map(String)
    ),
  ];
}

export function buildKaryaAkhirImportKey(record) {
  // Room, panel order and end time are editable attributes, not event identity.
  return [
    'ka-v1',
    normalizeImportLookup(record.nama_mahasiswa),
    record.nama_angkatan ?? '',
    record.agenda_jadwal_karya_akhir ?? '',
    record.mulai_jadwal || '',
  ]
    .map((part) => encodeURIComponent(String(part)))
    .join('|');
}

export function validateKaryaAkhirImportRecord(record, rowIssues = []) {
  const issues = [...rowIssues];
  if (!normalizeImportLookup(record.nama_mahasiswa))
    issues.push('nama mahasiswa kosong');
  if (!record.nama_angkatan) issues.push('angkatan tidak ditemukan');
  if (
    !record.agenda_jadwal_karya_akhir &&
    !issues.some((issue) => /agenda/i.test(issue))
  )
    issues.push('agenda tidak ditemukan');
  if (getScheduleDosenIds(record).length === 0)
    issues.push('dosen pembimbing/penguji tidak ditemukan');
  const start = new Date(record.mulai_jadwal || '').getTime();
  const end = new Date(record.akhir_jadwal || '').getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end)
    issues.push('waktu mulai/selesai tidak valid');
  return [...new Set(issues)];
}

export function normalizeKaryaAkhirSyncRecord(record, batchTag) {
  const result = Object.fromEntries(
    [
      'nama_mahasiswa',
      'nama_angkatan',
      'nama_ruangan',
      'agenda_jadwal_karya_akhir',
      'mulai_jadwal',
      'akhir_jadwal',
      'zoom_id',
      'zoom_password',
      'petugas_zoom',
      'moderator',
      'pintang_sps',
      'note',
    ].map((key) => [key, record[key] ?? null])
  );
  return {
    ...result,
    jenis_pertemuan: record.jenis_pertemuan || 'luring',
    dosen_ids: [...new Set(parseImportIdList(record.dosen_ids))],
    penguji_ids: [...new Set(parseImportIdList(record.penguji_ids))],
    import_source: 'google_jadwal',
    import_key: buildKaryaAkhirImportKey(record),
    import_batch: batchTag,
    updated_by: batchTag,
  };
}

export function buildKaryaAkhirReviewRow({
  record,
  batchTag,
  headers,
  row,
  rowNumber,
  issues = [],
}) {
  const normalized = normalizeKaryaAkhirSyncRecord(record, batchTag);
  const sourceData = Object.fromEntries(
    headers.map((header, index) => [header, row[index] ?? null])
  );
  const sourceId = headers.findIndex(
    (header) => String(header).trim().toLowerCase() === 'id'
  );
  const sheetId = sourceId >= 0 ? String(row[sourceId] ?? '').trim() : '';
  const nimColumn = headers.findIndex(
    (header) => String(header).trim().toLowerCase() === 'nim'
  );
  const activityColumn = headers.findIndex((header) =>
    ['kegiatan', 'agenda'].includes(String(header).trim().toLowerCase())
  );
  const nim = nimColumn >= 0 ? normalizeImportLookup(row[nimColumn]) : '';
  const activity =
    activityColumn >= 0
      ? normalizeImportLookup(row[activityColumn])
      : String(record.agenda_jadwal_karya_akhir ?? '');
  return {
    ...normalized,
    source_key:
      nim && activity
        ? `google-ka-nim|${encodeURIComponent(nim)}|${encodeURIComponent(activity)}`
        : sheetId
          ? `google-ka|${sheetId}`
          : normalized.import_key,
    source_data: sourceData,
    validation_issues: issues,
    row_number: rowNumber,
  };
}

export function findKaryaAkhirScheduleConflict(record, other) {
  if (
    other?.nama_mahasiswa != null &&
    buildKaryaAkhirImportKey(record) === buildKaryaAkhirImportKey(other)
  ) {
    return 'Jadwal karya akhir duplikat (mahasiswa, angkatan, agenda, dan waktu mulai sama)';
  }
  const start = new Date(record.mulai_jadwal).getTime();
  const end = new Date(record.akhir_jadwal).getTime();
  const otherStart = new Date(other.mulai_jadwal).getTime();
  const otherEnd = new Date(other.akhir_jadwal).getTime();
  if (
    ![start, end, otherStart, otherEnd].every(Number.isFinite) ||
    !(start < otherEnd && end > otherStart)
  )
    return null;
  const otherIds = new Set(getScheduleDosenIds(other));
  const sharedId = getScheduleDosenIds(record).find((id) => otherIds.has(id));
  return sharedId
    ? `Dosen ID ${sharedId} memiliki jadwal pada waktu yang bertabrakan`
    : null;
}

export async function findKaryaAkhirDatabaseConflict({
  client,
  record,
  existingId,
  excludedIds = [],
}) {
  const excluded = new Set(excludedIds.map(String));
  for (const table of ['jadwal_perkuliahan', 'jadwal_karya_akhir']) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await client
        .from(table)
        .select('*')
        .lt('mulai_jadwal', record.akhir_jadwal)
        .gt('akhir_jadwal', record.mulai_jadwal)
        .order('id', { ascending: true })
        .range(from, from + 999);
      if (error)
        throw new Error(
          `Pengecekan konflik dosen/duplikasi gagal: ${error.message}`
        );
      for (const other of data || []) {
        if (
          table === 'jadwal_karya_akhir' &&
          (excluded.has(String(other.id)) ||
            (existingId != null && String(other.id) === String(existingId)))
        )
          continue;
        const conflict = findKaryaAkhirScheduleConflict(record, other);
        if (conflict) return `${conflict} (${table}, ID ${other.id})`;
      }
      if ((data || []).length < 1000) break;
    }
  }
  return null;
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

export function buildKaryaAkhirAgendaImportLookup(items = []) {
  const agendaName = (item) =>
    normalizeKaryaAkhirAgenda(item.agenda_karya_akhir);
  // Label agenda setara memakai satu ID kanonis; referensi jadwal lama tetap utuh.
  return buildCanonicalImportLookup(items, agendaName, items.map(agendaName));
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
    combined_class_key: String(record.combined_class_key || '').trim() || null,
    import_source: 'google_jadwal',
    import_key: buildPerkuliahanImportKey(record),
    import_batch: batchTag,
    updated_by: batchTag,
  };
}

export function buildPerkuliahanReviewRow({
  record,
  batchTag,
  headers,
  row,
  rowNumber,
  issues = [],
}) {
  const normalized = normalizePerkuliahanSyncRecord(record, batchTag);
  const sourceData = Object.fromEntries(
    headers.map((header, index) => [header, row[index] ?? null])
  );
  const idColumn = headers.findIndex((header) =>
    ['id', 'id jadwal', 'id_jadwal', 'schedule id'].includes(
      String(header).trim().toLowerCase()
    )
  );
  const sheetId = idColumn >= 0 ? String(row[idColumn] ?? '').trim() : '';
  const eventParts = [
    normalized.id_mata_kuliah,
    [...normalized.id_angkatans].map(String).sort().join(','),
    normalized.paralel ?? '',
    normalized.kelas || '',
    normalized.real_perkuliahan,
  ];
  const eventKey =
    normalized.id_mata_kuliah &&
    normalized.id_angkatans.length &&
    normalized.real_perkuliahan != null
      ? `kuliah-event|${eventParts.map((part) => encodeURIComponent(String(part))).join('|')}`
      : normalized.import_key;
  return {
    ...normalized,
    source_key: sheetId ? `google-kuliah|${sheetId}` : eventKey,
    source_data: sourceData,
    validation_issues: issues,
    row_number: rowNumber,
  };
}

export function isLegacyScheduleImport(record) {
  return /-\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/.test(
    String(record?.created_by || '')
  );
}
