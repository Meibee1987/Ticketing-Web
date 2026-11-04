/**
 * ================================================================================
 * KOMPONEN: ImportJadwal
 * DESKRIPSI: Modal untuk upload & import data jadwal dari file CSV/Excel (.xlsx)
 *            ke database Supabase. Mendukung 3 tipe jadwal:
 *            - Perkuliahan (Kuliah S1/S2)
 *            - Karya Akhir (Sidang, Ujian Tesis, Prelim)
 *            - Lain-lain
 * ================================================================================
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Database,
  Download,
  FileSpreadsheet,
  Info,
  LoaderCircle,
  RotateCcw,
  UploadCloud,
  X,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getImportStartDay } from '../utils/importScheduleDate';
import { buildImportErrorReport } from '../utils/importErrorReport';
import { normalizeKaryaAkhirAgenda } from '../utils/karyaAkhir';
import { usesPhysicalRoom } from '../utils/meetingRoom';
import {
  normalizeKelasForDatabase,
  splitAngkatanLabels,
} from '../utils/scheduleLabels';
import {
  buildCanonicalImportLookup,
  buildDosenExternalIdImportLookup,
  buildPreferredImportLookup,
  exactImportLookup,
  findPendingRoomConflict,
  importedSchedulesOverlapInSameRoom,
  isRoomConflictExempt,
  isLegacyScheduleImport,
  normalizeImportLookup,
  normalizePerkuliahanSyncRecord,
  resolvePrimaryDosenImport,
  ROOM_CONFLICT_EXEMPT_NAMES,
  shouldSkipScheduleImportRow,
  splitDosenLabels,
  validatePerkuliahanImportRecord,
} from '../utils/scheduleImport';
import { parseSpreadsheetDate as excelDateToJS } from '../utils/spreadsheetDate';

const GOOGLE_SHEET_ID =
  import.meta.env.VITE_GOOGLE_SHEET_ID ||
  '137da0j_AaZhDNwrPjQkV1jA8572xVjHyRYFKMGbBIIM';
const GOOGLE_KARYA_AKHIR_SHEET_ID =
  import.meta.env.VITE_GOOGLE_KARYA_AKHIR_SHEET_ID ||
  '1qB9ixFMEAb7L7jIPDKfV1mhhFh0VqUGhrI0pLQt3138';
const GOOGLE_KARYA_AKHIR_GID =
  import.meta.env.VITE_GOOGLE_KARYA_AKHIR_GID || '1583765831';
const GOOGLE_SCHEDULE_SHEET_NAME = 'Jadwal';

// Google Sheet Dosen memiliki lebih dari satu ID eksternal untuk orang yang
// sama. Master database mempertahankan satu record/id_dosen, sedangkan Sheet
// Jadwal masih memakai ID alternatif berikut. Alias tetap diselesaikan lewat
// ID, bukan fallback nama atau email.
const DOSEN_EXTERNAL_ID_ALIASES = Object.freeze({
  db466900: 'SBIDSN003',
  '683f94af': 'SBIDSN005',
});

function getGoogleSheetSource(jenis) {
  if (jenis === 'karya_akhir') {
    return {
      label: 'Google Sheets Karya Akhir',
      sourceUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_KARYA_AKHIR_SHEET_ID}/edit?gid=${GOOGLE_KARYA_AKHIR_GID}#gid=${GOOGLE_KARYA_AKHIR_GID}`,
      exportUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_KARYA_AKHIR_SHEET_ID}/export?format=csv&gid=${GOOGLE_KARYA_AKHIR_GID}&cacheBust=${Date.now()}`,
      singleSheet: true,
    };
  }

  return {
    label: 'Google Sheets Jadwal',
    sourceUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit`,
    // Workbook XLSX harus menjadi sumber utama karena CSV gviz mengikuti
    // filter/baris tersembunyi pada Google Sheet. Setelah workbook dibaca,
    // aplikasi tetap otomatis memilih hanya sheet Jadwal untuk diproses.
    exportUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=xlsx&cacheBust=${Date.now()}`,
    fallbackExportUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(GOOGLE_SCHEDULE_SHEET_NAME)}&cacheBust=${Date.now()}`,
    singleSheet: true,
  };
}

function buildGoogleSheetExportUrls(jenis) {
  const source = getGoogleSheetSource(jenis);
  return [source.exportUrl, source.fallbackExportUrl].filter(Boolean);
}

function getGoogleSheetSourceUrl(jenis) {
  return getGoogleSheetSource(jenis).sourceUrl;
}

function getGoogleSheetSourceLabel(jenis) {
  return getGoogleSheetSource(jenis).label;
}

function isSingleGoogleSheetSource(jenis) {
  return getGoogleSheetSource(jenis).singleSheet;
}

function getSelectableGoogleSheets(remoteWorkbook) {
  const sheetVisibility = new Map(
    (remoteWorkbook.Workbook?.Sheets || []).map((sheet) => [
      sheet.name,
      sheet.Hidden || 0,
    ])
  );
  const visibleSheets = remoteWorkbook.SheetNames.filter(
    (name) => sheetVisibility.get(name) !== 1 && sheetVisibility.get(name) !== 2
  );
  const scheduleSheets = visibleSheets.filter(
    (name) => !/^(ruangan|mk)$/i.test(name.trim()) && !/mapping/i.test(name)
  );

  return scheduleSheets.length > 0
    ? scheduleSheets
    : visibleSheets.length > 0
      ? visibleSheets
      : remoteWorkbook.SheetNames;
}

// ================================================================================
// COLUMN MAPPING: Spreadsheet Header → Database Column
// ================================================================================

// Mapping kolom spreadsheet (case-insensitive) ke kolom DB
const PERKULIAHAN_MAP = {
  // Header spreadsheet → kolom database
  // Angkatan
  angkatan: '_lookup_angkatan',
  // Mata kuliah wajib dibaca dari kode. Nama hanya ditampilkan sebagai
  // informasi dan tidak boleh menjadi fallback karena nama dapat berulang.
  // Pada sheet "Jadwal", Kegiatan berisi kategori seperti "Kuliah",
  // bukan kode mata kuliah.
  kode: '_lookup_matkul_kode',
  'matakuliah h': '_lookup_matkul_kode',
  'matakuliah h (kode)': '_lookup_matkul_kode',
  'kode mk': '_lookup_matkul_kode',
  'kode matkul': '_lookup_matkul_kode',
  kode_mata_kuliah: '_lookup_matkul_kode',
  'kode mata kuliah': '_lookup_matkul_kode',
  'kode matakuliah': '_lookup_matkul_kode',
  'mata kuliah': '_matkul_nama_source',
  'mata kuliah (nama)': '_matkul_nama_source',
  agenda: '_matkul_nama_source',
  'mahasiswa/mata kuliah': '_matkul_nama_source',
  matakuliah: '_matkul_nama_source',
  mata_kuliah: '_matkul_nama_source',
  // Numerik
  paralel: 'paralel',
  pararel: 'paralel',
  para: 'paralel',
  quota: 'quota',
  kuota: 'quota',
  kelas: 'kelas',
  'real perkuliahan': 'real_perkuliahan',
  real_perkuliahan: 'real_perkuliahan',
  pertemuan: 'real_perkuliahan',
  'pertemuan n': 'real_perkuliahan',
  // Waktu
  jam: '_parse_jam',
  waktu: '_parse_jam',
  mulai: '_waktu_mulai',
  'waktu mulai': '_waktu_mulai',
  selesai: '_waktu_selesai',
  'waktu selesai': '_waktu_selesai',
  // Jenis pertemuan
  status: '_parse_jenis_pertemuan',
  'jenis pertemuan': '_parse_jenis_pertemuan',
  jenis_pertemuan: '_parse_jenis_pertemuan',
  'pelaksanaan n': '_parse_jenis_pertemuan',
  pelaksanaan: '_parse_jenis_pertemuan',
  // Ruangan / Tempat
  ruangan: '_lookup_ruangan',
  tempat: '_lookup_ruangan',
  // Zoom
  'petugas zoom': 'petugas_zoom',
  petugas_zoom: 'petugas_zoom',
  'id - password': '_parse_zoom_info',
  'id-password': '_parse_zoom_info',
  link: '_parse_zoom_info',
  'zoom id': 'zoom_id',
  'link id': 'zoom_id',
  zoom_id: 'zoom_id',
  'zoom password': 'zoom_password',
  password: 'zoom_password',
  zoom_password: 'zoom_password',
  // Dosen
  'dosen pengampu': '_lookup_dosen1',
  'dosen matakuliah': '_lookup_dosen1',
  'dosen 1': '_lookup_dosen1',
  dosen1: '_lookup_dosen1',
  dosen: '_lookup_dosen1',
  id_dosen: '_dosen_id_source',
  'id dosen': '_dosen_id_source',
  'dosen id': '_dosen_id_source',
  id_external: '_dosen_id_source',
  'id external dosen': '_dosen_id_source',
  'id eksternal dosen': '_dosen_id_source',
  'email dosen': '_dosen_email_source',
  email_dosen: '_dosen_email_source',
  'dosen 2': '_lookup_dosen_extra',
  dosen2: '_lookup_dosen_extra',
  'dosen 3': '_lookup_dosen_extra',
  dosen3: '_lookup_dosen_extra',
  'dosen 4': '_lookup_dosen_extra',
  dosen4: '_lookup_dosen_extra',
  'dosen 5': '_lookup_dosen_extra',
  dosen5: '_lookup_dosen_extra',
  'dosen 6': '_lookup_dosen_extra',
  dosen6: '_lookup_dosen_extra',
  'dosen 7': '_lookup_dosen_extra',
  dosen7: '_lookup_dosen_extra',
  'dosen 8': '_lookup_dosen_extra',
  dosen8: '_lookup_dosen_extra',
  moderator: 'moderator',
  'penguji 1': '_lookup_penguji',
  penguji1: '_lookup_penguji',
  'penguji 2': '_lookup_penguji',
  penguji2: '_lookup_penguji',
  'pintang/sps': 'pintang_sps',
  pintang_sps: 'pintang_sps',
  // Catatan
  catatan: 'note',
  topik: 'note',
  note: 'note',
};

const KARYA_AKHIR_MAP = {
  angkatan: '_lookup_angkatan',
  akt: '_lookup_angkatan',
  cohort: '_lookup_angkatan',
  nama: 'nama_mahasiswa',
  mahasiswa: 'nama_mahasiswa',
  'nama mahasiswa': 'nama_mahasiswa',
  'nama mhs': 'nama_mahasiswa',
  nama_mahasiswa: 'nama_mahasiswa',
  'mahasiswa/mata kuliah': 'nama_mahasiswa',
  kegiatan: '_lookup_agenda',
  judul: 'note',
  jam: '_parse_jam',
  waktu: '_parse_jam',
  mulai: '_waktu_mulai',
  'waktu mulai': '_waktu_mulai',
  selesai: '_waktu_selesai',
  'waktu selesai': '_waktu_selesai',
  status: '_parse_jenis_pertemuan',
  pelaksanaan: '_parse_jenis_pertemuan',
  'jenis pertemuan': '_parse_jenis_pertemuan',
  ruangan: '_lookup_ruangan',
  tempat: '_lookup_ruangan',
  agenda: '_lookup_agenda',
  'petugas zoom': 'petugas_zoom',
  petugas_zoom: 'petugas_zoom',
  'id - password': '_parse_zoom_info',
  'zoom id': 'zoom_id',
  'meeting id': 'zoom_id',
  'link id': 'zoom_id',
  'zoom password': 'zoom_password',
  password: 'zoom_password',
  passcode: 'zoom_password',
  'ketua komisi pembimbing': '_lookup_dosen_ka',
  'anggota komisi pembimbing 1': '_lookup_dosen_ka',
  'anggota komisi pembimbing 2': '_lookup_dosen_ka',
  'anggota komisi pembimbing 3': '_lookup_dosen_ka',
  'dosen 1': '_lookup_dosen_ka',
  dosen1: '_lookup_dosen_ka',
  dosen: '_lookup_dosen_ka',
  pembimbing: '_lookup_dosen_ka',
  'dosen pembimbing': '_lookup_dosen_ka',
  'dosen 2': '_lookup_dosen_ka',
  dosen2: '_lookup_dosen_ka',
  'dosen 3': '_lookup_dosen_ka',
  'dosen 4': '_lookup_dosen_ka',
  moderator: 'moderator',
  'penguji 1': '_lookup_penguji',
  penguji1: '_lookup_penguji',
  penguji: '_lookup_penguji',
  'dosen penguji': '_lookup_penguji',
  'penguji 2': '_lookup_penguji',
  penguji2: '_lookup_penguji',
  'penguji luar komisi 1': '_lookup_penguji',
  'penguji luar komisi 2': '_lookup_penguji',
  'penguji luar komisi 3': '_lookup_penguji',
  'perwakilan prodi': '_lookup_penguji',
  'pimpinan sidang': 'moderator',
  'pintang/sps': 'pintang_sps',
  catatan: 'note',
  note: 'note',
};

const LAIN_LAIN_MAP = {
  'nama user': 'nama_user',
  nama_user: 'nama_user',
  keterangan: 'keterangan',
  agenda: 'agenda',
  jam: '_parse_jam',
  waktu: '_parse_jam',
  mulai: '_waktu_mulai',
  'waktu mulai': '_waktu_mulai',
  selesai: '_waktu_selesai',
  'waktu selesai': '_waktu_selesai',
  status: '_parse_jenis_pertemuan',
  'jenis pertemuan': '_parse_jenis_pertemuan',
  ruangan: '_lookup_ruangan',
  'petugas zoom': 'petugas_zoom',
  petugas_zoom: 'petugas_zoom',
  'id - password': '_parse_zoom_info',
  'zoom id': 'zoom_id',
  'link id': 'zoom_id',
  'zoom password': 'zoom_password',
  password: 'zoom_password',
  catatan: 'note',
  note: 'note',
};

function getScheduleTypeFromLabel(value) {
  const label = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (!label) return null;
  if (/^kuliah(?:\s|$)|^perkuliahan(?:\s|$)/.test(label)) return 'perkuliahan';
  if (
    /karya akhir|sidang|ujian|tesis|disertasi|prelim|seminar|kolokium/.test(
      label
    )
  )
    return 'karya_akhir';
  if (/^lain lain(?:\s|$)/.test(label)) return 'lain_lain';

  return null;
}

// ================================================================================
// HELPER: Parse jam dari string spreadsheet (e.g. "10.00 - 14.00" atau "08:00-09:40")
// ================================================================================
function parseJam(jamStr, tanggal) {
  if (!jamStr || !tanggal) return { mulai: null, akhir: null };
  const str = String(jamStr).trim();
  // Format: "HH.MM - HH.MM" atau "HH:MM - HH:MM" atau "HH.MM-HH.MM"
  const match = str.match(/(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})/);
  if (!match) return { mulai: null, akhir: null };

  const [, h1, m1, h2, m2] = match;
  const dateStr =
    tanggal instanceof Date
      ? dateToLocalStr(tanggal)
      : String(tanggal).split('T')[0];

  return {
    mulai: `${dateStr}T${h1.padStart(2, '0')}:${m1}:00`,
    akhir: `${dateStr}T${h2.padStart(2, '0')}:${m2}:00`,
  };
}

// Parse jenis pertemuan dari string spreadsheet
function parseJenisPertemuan(str) {
  if (!str) return 'luring';
  const lower = String(str).toLowerCase().trim();
  if (lower.includes('hybrid') || lower.includes('blended')) return 'hybrid';
  if (
    lower.includes('daring') ||
    lower.includes('online') ||
    lower.includes('async') ||
    lower.includes('asynchronous') ||
    lower.includes('asinkron') ||
    lower.includes('synchronous') ||
    lower.includes('sinkron')
  )
    return 'daring';
  return 'luring';
}

// Parse Zoom info dari "ID: xxx (Pass: yyy)" format
function parseZoomInfo(str) {
  if (!str) return { zoom_id: null, zoom_password: null };
  const s = String(str);
  const idMatch = s.match(/(?:ID|id|Id)[:\s]*([0-9\s]+)/);
  const passMatch = s.match(
    /(?:Pass|pass|Password|password|Passcode|passcode|Kode Sandi|sandi)[:\s]*([^\s),]+)/i
  );
  return {
    zoom_id: idMatch ? idMatch[1].trim() : null,
    zoom_password: passMatch ? passMatch[1].trim() : null,
  };
}

// Format Date to 'YYYY-MM-DD' string using local timezone
function dateToLocalStr(d) {
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const IMPORT_AUDIT_FIELDS = new Set([
  'id',
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
]);

function normalizeImportedValue(key, value) {
  if (value == null || value === '') return null;

  if (key === 'dosen_ids' || key === 'penguji_ids' || key === 'id_angkatans') {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed)
        ? parsed.map(String).sort().join(',')
        : String(value);
    } catch {
      return String(value);
    }
  }

  if (key === 'mulai_jadwal' || key === 'akhir_jadwal') {
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? String(value) : timestamp;
  }

  return String(value);
}

function hasImportedChanges(existingRecord, importedRecord) {
  return Object.entries(importedRecord).some(
    ([key, value]) =>
      !IMPORT_AUDIT_FIELDS.has(key) &&
      normalizeImportedValue(key, existingRecord?.[key]) !==
        normalizeImportedValue(key, value)
  );
}

function matchesImportedRecord(existingRecord, importedRecord, jenis) {
  if (
    !importedRecord.mulai_jadwal ||
    existingRecord.mulai_jadwal !== importedRecord.mulai_jadwal
  ) {
    return false;
  }

  if (jenis === 'perkuliahan') {
    if (!importedRecord.id_mata_kuliah || !importedRecord.id_angkatan) {
      return false;
    }

    return (
      String(existingRecord.id_mata_kuliah) ===
        String(importedRecord.id_mata_kuliah) &&
      (importedRecord.paralel != null
        ? String(existingRecord.paralel) === String(importedRecord.paralel)
        : existingRecord.paralel == null) &&
      String(existingRecord.id_angkatan) ===
        String(importedRecord.id_angkatan) &&
      (!importedRecord.kelas || existingRecord.kelas === importedRecord.kelas)
    );
  }

  if (jenis === 'karya_akhir') {
    return (
      !importedRecord.nama_mahasiswa ||
      existingRecord.nama_mahasiswa === importedRecord.nama_mahasiswa
    );
  }

  return (
    !importedRecord.nama_user ||
    existingRecord.nama_user === importedRecord.nama_user
  );
}

async function fetchExistingSchedulesFrom(tableName, startTimestamp) {
  const pageSize = 1000;
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .gte('mulai_jadwal', startTimestamp)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const pageRows = data || [];
    rows.push(...pageRows);
    if (pageRows.length < pageSize) return rows;
    from += pageSize;
  }
}

async function findImportedRoomConflict({
  record,
  tableName,
  existingId,
  excludedIds = [],
  roomNameById,
}) {
  if (
    !usesPhysicalRoom(record.jenis_pertemuan) ||
    !record.mulai_jadwal ||
    !record.akhir_jadwal
  ) {
    return null;
  }

  const roomId =
    tableName === 'jadwal_perkuliahan'
      ? record.ruangan_id
      : record.nama_ruangan;
  if (!roomId) return null;
  if (isRoomConflictExempt(roomNameById[String(roomId)])) return null;

  const { data, error } = await supabase
    .from('view_jadwal_union')
    .select('jenis_jadwal, id_asli, mulai_jadwal, akhir_jadwal')
    .eq('ruangan_id', roomId)
    .lt('mulai_jadwal', record.akhir_jadwal)
    .gt('akhir_jadwal', record.mulai_jadwal);

  if (error) {
    throw new Error(`Pengecekan konflik ruangan gagal: ${error.message}`);
  }

  const currentType = {
    jadwal_perkuliahan: 'PERKULIAHAN',
    jadwal_karya_akhir: 'KARYA_AKHIR',
    jadwal_lain_lain: 'LAIN_LAIN',
  }[tableName];
  const excludedIdSet = new Set(excludedIds.map(String));
  const conflict = (data || []).find(
    (item) =>
      !(
        item.jenis_jadwal === currentType &&
        ((existingId != null && String(item.id_asli) === String(existingId)) ||
          excludedIdSet.has(String(item.id_asli)))
      )
  );
  if (!conflict) return null;

  const typeLabel = {
    PERKULIAHAN: 'Perkuliahan',
    KARYA_AKHIR: 'Karya Akhir',
    LAIN_LAIN: 'Lain-lain',
  }[conflict.jenis_jadwal];
  const roomLabel = roomNameById[String(roomId)] || `Ruangan ${roomId}`;
  return `${roomLabel} sudah dipakai untuk ${typeLabel || conflict.jenis_jadwal} pada ${new Date(conflict.mulai_jadwal).toLocaleString('id-ID')} - ${new Date(conflict.akhir_jadwal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
}

const STRICT_SYNC_WRITE_BATCH_SIZE = 100;

async function upsertStrictSyncRows(
  rows,
  batchTag,
  cachedSchedules = null,
  onProgress = null
) {
  const existingByKey = new Map(
    (cachedSchedules || [])
      .filter(
        (schedule) =>
          schedule.import_source === 'google_jadwal' && schedule.import_key
      )
      .map((schedule) => [schedule.import_key, schedule])
  );
  let inserted = 0;
  let updated = 0;
  let completed = 0;
  const errors = [];

  const preparedRows = rows.map((row) => {
    const record = {
      ...row.record,
      import_source: 'google_jadwal',
      import_batch: batchTag,
      updated_by: batchTag,
    };
    return {
      row,
      record,
      existingSchedule: existingByKey.get(record.import_key) || null,
    };
  });

  const reportCompleted = (count = 1) => {
    completed += count;
    onProgress?.(completed, rows.length);
  };

  const persistIndividually = async (entries) => {
    for (const entry of entries) {
      const { row, record, existingSchedule } = entry;
      try {
        let existingId = existingSchedule?.id || null;

        if (cachedSchedules == null && !existingId) {
          const { data, error } = await supabase
            .from('jadwal_perkuliahan')
            .select('id')
            .eq('import_source', 'google_jadwal')
            .eq('import_key', record.import_key)
            .limit(1);
          if (error) {
            errors.push(`Baris ${row.rowNumber}: ${error.message}`);
            continue;
          }
          existingId = data?.[0]?.id || null;
        }

        if (existingId) {
          const { error } = await supabase
            .from('jadwal_perkuliahan')
            .update(record)
            .eq('id', existingId);
          if (error) {
            errors.push(`Baris ${row.rowNumber}: ${error.message}`);
          } else {
            updated++;
          }
          continue;
        }

        const { error } = await supabase
          .from('jadwal_perkuliahan')
          .insert([{ ...record, created_by: batchTag }]);
        if (error) {
          errors.push(`Baris ${row.rowNumber}: ${error.message}`);
        } else {
          inserted++;
        }
      } finally {
        reportCompleted();
      }
    }
  };

  const persistBatch = async (entries, mode) => {
    if (entries.length === 0) return;

    const payload = entries.map(({ record, existingSchedule }) =>
      mode === 'update'
        ? {
            ...record,
            id: existingSchedule.id,
            created_by: existingSchedule.created_by || batchTag,
          }
        : { ...record, created_by: batchTag }
    );
    const result =
      mode === 'update'
        ? await supabase
            .from('jadwal_perkuliahan')
            .upsert(payload, { onConflict: 'id' })
        : await supabase.from('jadwal_perkuliahan').insert(payload);

    if (result.error) {
      console.warn(
        `[Import] Batch ${mode} gagal, mencoba ulang per baris:`,
        result.error
      );
      await persistIndividually(entries);
      return;
    }

    if (mode === 'update') updated += entries.length;
    else inserted += entries.length;
    reportCompleted(entries.length);
  };

  // Saat cache tersedia, simpan maksimal 100 baris per permintaan. Jika satu
  // batch gagal, persistBatch otomatis kembali ke penyimpanan per baris agar
  // baris yang bermasalah tetap dapat dilaporkan secara spesifik.
  if (cachedSchedules != null) {
    for (
      let offset = 0;
      offset < preparedRows.length;
      offset += STRICT_SYNC_WRITE_BATCH_SIZE
    ) {
      const batch = preparedRows.slice(
        offset,
        offset + STRICT_SYNC_WRITE_BATCH_SIZE
      );
      await persistBatch(
        batch.filter(({ existingSchedule }) => existingSchedule),
        'update'
      );
      await persistBatch(
        batch.filter(({ existingSchedule }) => !existingSchedule),
        'insert'
      );
    }
  } else {
    await persistIndividually(preparedRows);
  }

  return { inserted, updated, errors };
}

function addStrictSyncConflict(results, pendingRow, message) {
  const existing = results.conflicts.find(
    (conflict) => conflict.syncRowId === pendingRow.syncRowId
  );
  if (existing) {
    if (!existing.message.includes(message)) {
      existing.message = `${existing.message} | ${message}`;
    }
    return;
  }

  results.conflicts.push({
    id: `strict-${pendingRow.syncRowId}`,
    syncRowId: pendingRow.syncRowId,
    rowNumber: pendingRow.rowNumber,
    message,
    record: { ...pendingRow.record },
    existingRecord: null,
    existingId: null,
    verificationStatus: 'idle',
    verificationMessage: '',
  });
}

// ================================================================================
// KOMPONEN UTAMA
// ================================================================================
export default function ImportJadwal({
  isOpen,
  onClose,
  jenis,
  options,
  userName,
  onSuccess,
  onNotify,
}) {
  const [file, setFile] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [dateColumn, setDateColumn] = useState('');
  const [dataSource, setDataSource] = useState('file');
  const [step, setStep] = useState(1); // 1=upload, 2=mapping, 3=preview, 4=importing
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importProgressLabel, setImportProgressLabel] = useState(
    'Menyiapkan data import...'
  );
  const [resolvingConflictId, setResolvingConflictId] = useState(null);
  const [checkingConflictId, setCheckingConflictId] = useState(null);
  const [expandedConflictIds, setExpandedConflictIds] = useState([]);
  const [roomAvailabilityByConflict, setRoomAvailabilityByConflict] = useState(
    {}
  );
  const [undoing, setUndoing] = useState(false);
  const [importBatchTag, setImportBatchTag] = useState('');
  const [allRuangan, setAllRuangan] = useState([]);
  const [allImportReferences, setAllImportReferences] = useState({
    dosen: [],
    angkatan: [],
    mataKuliah: [],
  });
  const [googleSheetLoading, setGoogleSheetLoading] = useState(false);
  const [googleSheetError, setGoogleSheetError] = useState('');
  const [googleWorkbook, setGoogleWorkbook] = useState(null);
  const [googleSheetNames, setGoogleSheetNames] = useState([]);
  const [selectedGoogleSheet, setSelectedGoogleSheet] = useState('');
  const fileInputRef = useRef(null);

  // Ambil semua referensi. Jika nama sama muncul beberapa kali, lookup akan
  // memprioritaskan satu data aktif dan tetap menolak kandidat aktif ganda.
  useEffect(() => {
    Promise.all([
      supabase.from('ruangan').select('id, nama_ruangan, aktif_nonaktif'),
      supabase
        .from('dosen')
        .select('id, nama_dosen, id_dosen, id_external, email, aktif_nonaktif'),
      supabase.from('angkatan').select('id, nama_angkatan, aktif_nonaktif'),
      supabase.from('mata_kuliah').select('*'),
    ]).then(
      ([ruanganResult, dosenResult, angkatanResult, mataKuliahResult]) => {
        if (ruanganResult.data) setAllRuangan(ruanganResult.data);
        setAllImportReferences({
          dosen: dosenResult.data || [],
          angkatan: angkatanResult.data || [],
          mataKuliah: mataKuliahResult.data || [],
        });
      }
    );
  }, []);

  // Get the right column map based on jenis
  const columnMap = useMemo(() => {
    if (jenis === 'perkuliahan') return PERKULIAHAN_MAP;
    if (jenis === 'karya_akhir') return KARYA_AKHIR_MAP;
    return LAIN_LAIN_MAP;
  }, [jenis]);

  const filteredPreviewData = useMemo(() => {
    const normalizedHeaders = previewHeaders.map((header) =>
      header.trim().toLowerCase()
    );
    const typeColumn = normalizedHeaders.indexOf('jenis');
    const activityColumn = normalizedHeaders.indexOf('kegiatan');
    const hasRowType = typeColumn >= 0 || activityColumn >= 0;

    const selectedSourceSheet =
      dataSource === 'google' ? selectedGoogleSheet : selectedSheet;
    const isDedicatedKaryaAkhirSource =
      dataSource === 'google' && jenis === 'karya_akhir';
    const isFlatScheduleSheet =
      !isDedicatedKaryaAkhirSource &&
      (selectedSourceSheet.trim().toLowerCase() ===
        GOOGLE_SCHEDULE_SHEET_NAME.toLowerCase() ||
        hasRowType);
    const now = new Date();
    const importStartDay = getImportStartDay(now);
    const selectedDateColumn = Number.parseInt(dateColumn, 10);

    let sectionDate = null;
    let sectionType = null;
    const scheduleRows = [];

    previewData.forEach((row) => {
      if (shouldSkipScheduleImportRow(previewHeaders, row)) return;

      const firstCell = String(row[0] || '').trim();
      const dateFromColumn = Number.isInteger(selectedDateColumn)
        ? excelDateToJS(row[selectedDateColumn])
        : null;
      const dateFromFirstCell =
        /\d{1,2}\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{2,4}/i.test(
          firstCell
        )
          ? excelDateToJS(firstCell)
          : null;
      const scheduleDate = dateFromColumn || dateFromFirstCell;
      const nonEmpty = row.filter((cell) => cell !== '' && cell != null).length;

      // Sumber Google Karya Akhir berupa tabel datar dan setiap baris memiliki
      // tanggal sendiri. Saring secara ketat per baris agar data historis dan
      // baris tanpa tanggal valid tidak masuk preview maupun proses import.
      if (isDedicatedKaryaAkhirSource) {
        if (!scheduleDate) return;

        const scheduleDay = new Date(
          scheduleDate.getFullYear(),
          scheduleDate.getMonth(),
          scheduleDate.getDate()
        );
        if (scheduleDay < importStartDay) return;

        const scheduleRow = [...row];
        scheduleRow._scheduleDate = scheduleDay;
        scheduleRows.push(scheduleRow);
        return;
      }

      // Tabel datar wajib memakai tanggal dari barisnya sendiri. Jangan
      // mewarisi tanggal baris sebelumnya untuk baris kosong/nonjadwal.
      if (isFlatScheduleSheet && !scheduleDate) return;

      if (scheduleDate) {
        sectionDate = new Date(
          scheduleDate.getFullYear(),
          scheduleDate.getMonth(),
          scheduleDate.getDate()
        );
        sectionType = null;

        // Baris kuning hanya penanda tanggal dan nama PIC, bukan jadwal.
        if (nonEmpty <= 3) return;

        // Sheet "Jadwal" adalah tabel datar. Kolom Jenis/Kegiatan menentukan
        // apakah baris masuk ke tab Perkuliahan atau Karya Akhir.
        if (isFlatScheduleSheet) {
          const rowType = getScheduleTypeFromLabel(
            row[typeColumn >= 0 ? typeColumn : activityColumn]
          );
          if (rowType && rowType !== jenis) return;
          if (!rowType && hasRowType) return;
          if (sectionDate >= importStartDay) {
            const scheduleRow = [...row];
            scheduleRow._scheduleDate = sectionDate;
            scheduleRows.push(scheduleRow);
          }
          return;
        }
      }

      // Baris judul kelompok (abu-abu/biru/warna section lainnya) bukan jadwal.
      const isSectionHeader =
        /^(kuliah\s+s[123]|karya\s+akhir|lain[\s-]*lain)/i.test(firstCell) &&
        nonEmpty <= 3;
      if (isSectionHeader) {
        sectionType = getScheduleTypeFromLabel(firstCell);
        return;
      }

      if (isFlatScheduleSheet) {
        const rowType = getScheduleTypeFromLabel(
          row[typeColumn >= 0 ? typeColumn : activityColumn]
        );
        if (rowType && rowType !== jenis) return;
        if (!rowType && hasRowType) return;
      } else if (
        dataSource === 'google' &&
        !isDedicatedKaryaAkhirSource &&
        sectionType !== jenis
      ) {
        return;
      }

      // Hanya baris dengan tanggal yang berhasil dikenali dan masih berada
      // dalam cakupan tanggal import yang boleh lanjut ke proses database.
      // Baris jadwal berkelompok tetap memakai tanggal section sebelumnya.
      if (!sectionDate || sectionDate < importStartDay) return;

      const scheduleRow = [...row];
      if (sectionDate) scheduleRow._scheduleDate = sectionDate;
      scheduleRows.push(scheduleRow);
    });

    return scheduleRows;
  }, [
    dataSource,
    dateColumn,
    previewData,
    previewHeaders,
    selectedGoogleSheet,
    selectedSheet,
    jenis,
  ]);

  // DB columns per type
  const getDbColumns = () => {
    if (jenis === 'perkuliahan') {
      return [
        { key: '_lookup_angkatan', label: 'Angkatan' },
        { key: '_lookup_matkul_kode', label: 'Kode Mata Kuliah' },
        {
          key: '_matkul_nama_source',
          label: 'Nama Mata Kuliah (informasi)',
        },
        { key: 'paralel', label: 'Paralel' },
        { key: 'kelas', label: 'Kelas' },
        { key: 'quota', label: 'Kuota' },
        { key: 'real_perkuliahan', label: 'Pertemuan / Real' },
        { key: '_parse_jam', label: 'Waktu (Mulai - Selesai)' },
        { key: '_waktu_mulai', label: 'Jam Mulai' },
        { key: '_waktu_selesai', label: 'Jam Selesai' },
        { key: '_parse_jenis_pertemuan', label: 'Pelaksanaan (Luring/Daring)' },
        { key: '_lookup_ruangan', label: 'Ruangan' },
        { key: 'petugas_zoom', label: 'Petugas Zoom' },
        { key: '_parse_zoom_info', label: 'Link / Zoom Info' },
        {
          key: '_dosen_id_source',
          label: 'ID Dosen (cocok ke id_external)',
        },
        { key: '_lookup_dosen1', label: 'Dosen Pengampu (referensi)' },
        { key: '_dosen_email_source', label: 'Email Dosen (referensi)' },
        { key: '_lookup_dosen_extra', label: 'Dosen Tambahan (2,3,4)' },
        { key: 'moderator', label: 'Moderator' },
        { key: '_lookup_penguji', label: 'Penguji' },
        { key: 'pintang_sps', label: 'Pintang/SPs' },
        { key: 'note', label: 'Catatan' },
      ];
    }
    if (jenis === 'karya_akhir') {
      return [
        { key: '_lookup_angkatan', label: 'Angkatan' },
        { key: 'nama_mahasiswa', label: 'Nama Mahasiswa' },
        { key: '_lookup_agenda', label: 'Agenda' },
        { key: '_parse_jam', label: 'Jam (Mulai - Selesai)' },
        { key: '_parse_jenis_pertemuan', label: 'Jenis Pertemuan' },
        { key: '_lookup_ruangan', label: 'Ruangan' },
        { key: 'petugas_zoom', label: 'Petugas Zoom' },
        { key: '_parse_zoom_info', label: 'ID & Password Zoom' },
        { key: '_lookup_dosen_ka', label: 'Dosen Pembimbing' },
        { key: 'moderator', label: 'Moderator' },
        { key: '_lookup_penguji', label: 'Penguji' },
        { key: 'pintang_sps', label: 'Pintang/SPs' },
        { key: 'note', label: 'Catatan' },
      ];
    }
    return [
      { key: 'nama_user', label: 'Nama User' },
      { key: 'keterangan', label: 'Keterangan' },
      { key: 'agenda', label: 'Agenda' },
      { key: '_parse_jam', label: 'Jam (Mulai - Selesai)' },
      { key: '_parse_jenis_pertemuan', label: 'Jenis Pertemuan' },
      { key: '_lookup_ruangan', label: 'Ruangan' },
      { key: 'petugas_zoom', label: 'Petugas Zoom' },
      { key: '_parse_zoom_info', label: 'ID & Password Zoom' },
      { key: 'note', label: 'Catatan' },
    ];
  };

  // ──────────── STEP 1: File Upload ────────────
  const handleFileChange = useCallback((e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setGoogleWorkbook(null);
    setGoogleSheetNames([]);
    setSelectedGoogleSheet('');
    setGoogleSheetError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const wb = XLSX.read(data, { type: 'array', cellDates: true });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      setSelectedSheet(wb.SheetNames[0] || '');
    };
    reader.readAsArrayBuffer(f);
  }, []);

  // ──────────── STEP 1→2: Read sheet & auto-map ────────────
  const prepareSheetData = useCallback(
    (jsonData, source = 'file') => {
      if (jsonData.length < 2) {
        alert('Sheet kosong atau tidak memiliki data.');
        return;
      }

      // Find header row (first row with multiple non-empty cells)
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
        const nonEmpty = jsonData[i].filter(
          (c) => c !== '' && c != null
        ).length;
        if (nonEmpty >= 3) {
          headerRowIdx = i;
          break;
        }
      }

      const headers = jsonData[headerRowIdx].map((h) => String(h || '').trim());
      const rows = jsonData
        .slice(headerRowIdx + 1)
        .filter((row) => row.some((cell) => cell !== '' && cell != null));

      setPreviewHeaders(headers);
      setPreviewData(rows);
      setDataSource(source);

      // Auto-map columns
      const colMap = columnMap;
      const autoMapping = {};
      const normalizedHeaderSet = new Set(
        headers.map((header) => header.toLowerCase().trim())
      );
      const isKaryaAkhirRegistrySheet =
        jenis === 'karya_akhir' &&
        normalizedHeaderSet.has('tanggal pelaksanaan') &&
        normalizedHeaderSet.has('ketua komisi pembimbing');
      const ignoredKaryaAkhirHeaders = new Set([
        'id',
        'strata',
        'nim',
        'nomor dokumen',
        'jk',
        'dosen',
        'email',
      ]);
      headers.forEach((header, idx) => {
        const key = header.toLowerCase().trim();
        // Tanggal dipakai sebagai tanggal jadwal, bukan sebagai kolom
        // "Pelaksanaan" (daring/luring). Kolom agregat/metadata pada sumber
        // Karya Akhir juga tidak perlu disimpan kembali ke tabel jadwal.
        if (
          key.includes('tanggal') ||
          key === 'date' ||
          (isKaryaAkhirRegistrySheet && ignoredKaryaAkhirHeaders.has(key))
        )
          return;
        // "Jenis" pada file hasil download menunjukkan kategori jadwal
        // (perkuliahan/karya akhir/lain-lain), bukan jenis pertemuan.
        if (key === 'jenis') return;
        // Try exact match first, then partial match (header contains map key or vice versa)
        let target = colMap[key];
        if (!target) {
          // Try partial: find the longest matching key in colMap
          let bestKey = '';
          for (const mapKey of Object.keys(colMap)) {
            if (
              (key.includes(mapKey) || mapKey.includes(key)) &&
              mapKey.length > bestKey.length
            ) {
              bestKey = mapKey;
            }
          }
          if (bestKey) target = colMap[bestKey];
        }
        if (target) {
          if (
            target === '_lookup_dosen_extra' ||
            target === '_lookup_dosen_ka' ||
            target === '_lookup_penguji' ||
            target === 'moderator'
          ) {
            // Multiple columns can map to same target (dosen 2,3,4)
            if (!autoMapping[idx]) autoMapping[idx] = target;
          } else {
            // Check if target is already used
            const alreadyUsed = Object.values(autoMapping).includes(target);
            if (!alreadyUsed) {
              autoMapping[idx] = target;
            }
          }
        }
      });

      // File hasil Download Jadwal Admin memakai format ringkas yang juga harus
      // dapat diimpor kembali. Arti kolom "Keterangan" berbeda per jenis jadwal.
      const normalizedHeaders = headers.map((header) =>
        header.toLowerCase().trim()
      );
      const isAdminExportFormat = [
        'jenis',
        'agenda',
        'ruangan',
        'waktu mulai',
        'waktu selesai',
        'keterangan',
      ].every((header) => normalizedHeaders.includes(header));

      if (isAdminExportFormat) {
        const keteranganIdx = normalizedHeaders.indexOf('keterangan');
        autoMapping[keteranganIdx] =
          jenis === 'perkuliahan'
            ? '_lookup_dosen1'
            : jenis === 'karya_akhir'
              ? 'nama_mahasiswa'
              : 'keterangan';
      }

      // Pada Google Sheet jadwal, kolom A tidak memiliki judul: baris kuning
      // memuat tanggal, sedangkan baris kegiatan memuat kode angkatan (SB61/SB62).
      if (source === 'google' && !normalizedHeaders[0]) {
        autoMapping[0] = '_lookup_angkatan';
      }

      setColumnMapping(autoMapping);

      // Auto-detect date column, including the combined Indonesian date/time
      // produced by Download Jadwal Admin (for example 26 Agustus 2026, 08.00).
      const exactKaryaAkhirDateIdx = normalizedHeaders.indexOf(
        'tanggal pelaksanaan'
      );
      let dateIdx =
        exactKaryaAkhirDateIdx >= 0
          ? exactKaryaAkhirDateIdx
          : headers.findIndex((h) => {
              const l = h.toLowerCase();
              return (
                l.includes('tanggal') ||
                l.includes('date') ||
                l.includes('waktu mulai')
              );
            });
      if (dateIdx < 0) {
        dateIdx = headers.findIndex((_, idx) =>
          rows
            .slice(0, 5)
            .some((row) => row[idx] && excelDateToJS(row[idx]) instanceof Date)
        );
      }
      if (dateIdx >= 0) setDateColumn(String(dateIdx));

      setStep(2);
    },
    [columnMap, jenis]
  );

  const handleReadSheet = useCallback(() => {
    if (!workbook || !selectedSheet) return;
    const ws = workbook.Sheets[selectedSheet];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    prepareSheetData(jsonData, 'file');
  }, [workbook, selectedSheet, prepareSheetData]);

  const handleLoadGoogleWorkbook = useCallback(async () => {
    setGoogleSheetLoading(true);
    setGoogleSheetError('');

    try {
      let response = null;
      let responseError = null;
      const exportUrls = buildGoogleSheetExportUrls(jenis);

      for (const exportUrl of exportUrls) {
        try {
          const candidateResponse = await fetch(exportUrl, {
            cache: 'no-store',
          });
          if (candidateResponse.ok) {
            response = candidateResponse;
            break;
          }

          responseError =
            candidateResponse.status === 401 || candidateResponse.status === 403
              ? new Error(
                  'Google Sheets belum dapat diakses. Ubah akses spreadsheet menjadi "Siapa saja yang memiliki link" sebagai Pelihat, lalu coba lagi.'
                )
              : new Error(
                  `Google Sheets merespons dengan status ${candidateResponse.status}`
                );
        } catch (fetchError) {
          responseError = fetchError;
        }
      }

      if (!response)
        throw responseError || new Error('Google Sheets gagal dibaca.');

      const workbookData = new Uint8Array(await response.arrayBuffer());
      const remoteWorkbook = XLSX.read(workbookData, {
        type: 'array',
        // Serial angka menjaga tanggal Google Sheet tetap pada tanggal kalender
        // yang terlihat (tanpa pergeseran zona waktu dari nilai Date Excel).
        cellDates: false,
      });
      const selectableSheets = getSelectableGoogleSheets(remoteWorkbook);

      if (selectableSheets.length === 0)
        throw new Error(
          'Google Sheets tidak memiliki sheet yang dapat dibaca.'
        );

      setFile(null);
      setWorkbook(null);
      setSheetNames([]);
      setSelectedSheet('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setGoogleWorkbook(remoteWorkbook);
      setGoogleSheetNames(selectableSheets);
      const scheduleSheet = selectableSheets.find(
        (name) =>
          name.trim().toLowerCase() === GOOGLE_SCHEDULE_SHEET_NAME.toLowerCase()
      );
      const automaticallySelectedSheet =
        scheduleSheet ||
        (isSingleGoogleSheetSource(jenis) && selectableSheets.length === 1
          ? selectableSheets[0]
          : '');
      setSelectedGoogleSheet(automaticallySelectedSheet);

      if (isSingleGoogleSheetSource(jenis) && automaticallySelectedSheet) {
        const remoteWorksheet =
          remoteWorkbook.Sheets[automaticallySelectedSheet];
        const jsonData = XLSX.utils.sheet_to_json(remoteWorksheet, {
          header: 1,
          defval: '',
        });
        prepareSheetData(jsonData, 'google');
      }
    } catch (error) {
      console.error('Gagal membaca Google Sheets:', error);
      setGoogleSheetError(
        error.message ||
          'Google Sheets tidak dapat dibaca. Coba beberapa saat lagi.'
      );
    } finally {
      setGoogleSheetLoading(false);
    }
  }, [jenis, prepareSheetData]);

  const handleReadGoogleSheet = useCallback(() => {
    if (!googleWorkbook || !selectedGoogleSheet) {
      setGoogleSheetError(
        'Pilih sheet yang akan disinkronkan terlebih dahulu.'
      );
      return;
    }

    const remoteWorksheet = googleWorkbook.Sheets[selectedGoogleSheet];
    const jsonData = XLSX.utils.sheet_to_json(remoteWorksheet, {
      header: 1,
      defval: '',
    });

    if (jsonData.length < 2) {
      setGoogleSheetError(`Sheet "${selectedGoogleSheet}" kosong.`);
      return;
    }

    setGoogleSheetError('');
    prepareSheetData(jsonData, 'google');
  }, [googleWorkbook, prepareSheetData, selectedGoogleSheet]);

  // ──────────── STEP 2→3: Preview mapped data ────────────
  const handlePreview = () => setStep(3);

  // ──────────── Build lookup maps ────────────
  const buildLookups = useCallback(() => {
    const dosenSource =
      allImportReferences.dosen.length > 0
        ? allImportReferences.dosen
        : options.dosen || [];
    const dosenByName = buildPreferredImportLookup(
      dosenSource,
      (d) => d.nama_dosen
    );
    const dosenByIdDosen = buildPreferredImportLookup(
      dosenSource,
      (d) => d.id_dosen
    );
    const dosenByExternalId = buildDosenExternalIdImportLookup(
      dosenSource,
      DOSEN_EXTERNAL_ID_ALIASES
    );
    const dosenByEmail = buildPreferredImportLookup(
      dosenSource,
      (d) => d.email
    );

    // Data nonaktif tetap dapat dipakai jika tidak ada kandidat aktif dengan
    // nama yang sama. Untuk nama duplikat, kandidat aktif diprioritaskan.
    const ruanganSource =
      allRuangan.length > 0 ? allRuangan : options.ruangan || [];
    const ruanganByName = buildCanonicalImportLookup(
      ruanganSource,
      (r) => r.nama_ruangan,
      ROOM_CONFLICT_EXEMPT_NAMES
    );

    const mataKuliahSource =
      allImportReferences.mataKuliah.length > 0
        ? allImportReferences.mataKuliah
        : options.mataKuliah || [];
    const matkulByKode = buildPreferredImportLookup(
      mataKuliahSource,
      (m) => m.kode_mata_kuliah
    );

    const angkatanSource =
      allImportReferences.angkatan.length > 0
        ? allImportReferences.angkatan
        : options.angkatan || [];
    const angkatanByName = buildPreferredImportLookup(
      angkatanSource,
      (a) => a.nama_angkatan
    );
    const agendaByName = buildPreferredImportLookup(
      options.agenda || [],
      (a) => a.agenda_karya_akhir
    );
    return {
      dosenByName,
      dosenByIdDosen,
      dosenByExternalId,
      dosenByEmail,
      ruanganByName,
      matkulByKode,
      angkatanByName,
      agendaByName,
    };
  }, [options, allRuangan, allImportReferences]);

  // Fuzzy lookup by name (exact first, then contains match)
  const fuzzyLookup = (name, map) => {
    if (!name) return null;
    const lower = normalizeImportLookup(name);
    if (!lower || lower === '-') return null;
    // Exact match first
    if (map[lower]) return map[lower];
    // Contains match
    for (const [key, id] of Object.entries(map)) {
      if (key.includes(lower) || lower.includes(key)) return id;
    }
    return null;
  };
  const findDosen = (name, dosenByName, dosenByIdDosen, strict = false) => {
    if (!name) return null;
    const val = normalizeImportLookup(name);
    if (!val || val === '-') return null;
    // Try id_dosen match first (most reliable)
    if (dosenByIdDosen && dosenByIdDosen[val]) return dosenByIdDosen[val];
    return strict
      ? exactImportLookup(name, dosenByName)
      : fuzzyLookup(name, dosenByName);
  };

  // ──────────── STEP 3: Import to DB ────────────
  const handleImport = async () => {
    setImportProgress(0);
    setImportProgressLabel('Menyiapkan data import...');
    setImporting(true);
    setStep(4);
    await new Promise((resolve) => setTimeout(resolve, 0));
    setImportProgress(3);

    // Generate unique batch tag for this import session
    const batchTag = `${userName || 'Import'}-${new Date().toISOString().replace('T', ' ').substring(0, 19)}`;
    setImportBatchTag(batchTag);

    const lookups = buildLookups();
    const roomNameById = Object.fromEntries(
      (allRuangan.length > 0 ? allRuangan : options.ruangan || []).map(
        (room) => [String(room.id), room.nama_ruangan]
      )
    );
    console.log('[Import] Column mapping:', columnMapping);
    console.log(
      '[Import] Kode matkul lookup keys:',
      Object.keys(lookups.matkulByKode)
    );
    console.log(
      '[Import] Ruangan lookup keys:',
      Object.keys(lookups.ruanganByName)
    );
    const strictGoogleSync = jenis === 'perkuliahan' && dataSource === 'google';
    const strictReferenceValidation = jenis === 'perkuliahan';
    const results = {
      strictSync: strictGoogleSync,
      success: 0,
      inserted: 0,
      updated: 0,
      deleted: 0,
      errors: [],
      conflicts: [],
      skipped: 0,
      pendingSyncRows: [],
      managedScheduleIds: [],
      syncScopeStart: null,
      syncPending: false,
    };
    const tableName =
      jenis === 'perkuliahan'
        ? 'jadwal_perkuliahan'
        : jenis === 'karya_akhir'
          ? 'jadwal_karya_akhir'
          : 'jadwal_lain_lain';
    const preparedRows = [];
    const preparedImportKeys = new Set();

    // Group column mapping by target
    const mappingByTarget = {};
    Object.entries(columnMapping).forEach(([colIdx, target]) => {
      if (!mappingByTarget[target]) mappingByTarget[target] = [];
      mappingByTarget[target].push(parseInt(colIdx));
    });

    let rowDate = null; // running date for grouped rows
    const importNow = new Date();
    const importStartDay = getImportStartDay(importNow);
    const totalImportRows = filteredPreviewData.length;
    let existingSchedules = null;
    setImportProgressLabel('Memuat referensi jadwal dari database...');
    try {
      existingSchedules = await fetchExistingSchedulesFrom(
        tableName,
        `${dateToLocalStr(importStartDay)}T00:00:00`
      );
    } catch (cacheError) {
      // Tetap lanjut dengan query per baris jika prefetch tidak tersedia.
      console.warn(
        '[Import] Gagal memuat cache jadwal, memakai pencocokan per baris:',
        cacheError
      );
    }
    setImportProgress(5);
    setImportProgressLabel(`Memeriksa 0 dari ${totalImportRows} baris...`);
    const managedScheduleIds = new Set(
      (existingSchedules || [])
        .filter(
          (schedule) =>
            schedule.import_source === 'google_jadwal' ||
            isLegacyScheduleImport(schedule)
        )
        .map((schedule) => String(schedule.id))
    );

    for (let rowIdx = 0; rowIdx < filteredPreviewData.length; rowIdx++) {
      const row = filteredPreviewData[rowIdx];
      try {
        // Skip empty rows
        const nonEmpty = row.filter((c) => c !== '' && c != null).length;
        if (nonEmpty < 2) {
          results.skipped++;
          continue;
        }

        // Google Sheet membawa tanggal dari baris kuning sebagai metadata baris.
        if (row._scheduleDate) rowDate = new Date(row._scheduleDate);

        // Detect date from date column or section headers (e.g. "Selasa, 27 Januari 2026")
        if (dateColumn !== '') {
          const dateVal = row[parseInt(dateColumn)];
          if (dateVal) {
            const parsed = excelDateToJS(dateVal);
            if (parsed) rowDate = parsed;
          }
        }

        // Also detect date from first cell if it looks like a section header
        const firstCell = String(row[0] || '').trim();
        const dateHeaderMatch = firstCell.match(
          /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i
        );
        if (dateHeaderMatch) {
          const monthMap = {
            januari: 0,
            februari: 1,
            maret: 2,
            april: 3,
            mei: 4,
            juni: 5,
            juli: 6,
            agustus: 7,
            september: 8,
            oktober: 9,
            november: 10,
            desember: 11,
          };
          const [, day, monthStr, year] = dateHeaderMatch;
          rowDate = new Date(
            parseInt(year),
            monthMap[monthStr.toLowerCase()],
            parseInt(day)
          );
          results.skipped++;
          continue; // This row is a date header, not data
        }

        // Skip section headers like "Kuliah S1", "KARYA AKHIR", "LAIN-LAIN"
        if (
          /^(kuliah\s+s[12]|karya\s+akhir|lain[\s-]*lain|kuliah\s+s2\/s3)/i.test(
            firstCell
          ) &&
          nonEmpty <= 3
        ) {
          results.skipped++;
          continue;
        }

        // Filter pengaman terakhir: baris tanpa tanggal valid atau di luar
        // cakupan import tidak menjalankan lookup, pengecekan konflik, maupun
        // proses simpan ke database.
        const normalizedRowDay = rowDate
          ? new Date(
              rowDate.getFullYear(),
              rowDate.getMonth(),
              rowDate.getDate()
            )
          : null;
        if (!normalizedRowDay || normalizedRowDay < importStartDay) {
          results.skipped++;
          continue;
        }

        const record = {};
        let jamStr = null;
        let waktuMulai = null;
        let waktuSelesai = null;
        let dosenExtraIds = [];
        let dosenKaIds = [];
        let pengujiIds = [];
        const rowIssues = [];
        let unresolvedRoomLabel = '';
        let sourceLocationLabel = '';
        let sourceDosenId = '';
        let sourceDosenEmail = '';
        const sourceDosenNames = [];
        let meetingTypeWasProvided = false;

        // Process each mapped column
        Object.entries(columnMapping).forEach(([colIdxStr, target]) => {
          const colIdx = parseInt(colIdxStr);
          const cellVal = row[colIdx];
          if (cellVal === '' || cellVal == null) return;
          const val = String(cellVal).trim();

          switch (target) {
            case 'moderator':
            case 'petugas_zoom':
            case 'pintang_sps':
            case 'note':
            case 'nama_mahasiswa':
            case 'nama_user':
            case 'keterangan':
            case 'agenda':
              record[target] = val;
              break;
            case 'kelas':
              record.kelas = normalizeKelasForDatabase(val);
              break;
            case 'paralel':
            case 'real_perkuliahan':
            case 'quota':
              record[target] = parseInt(val) || null;
              break;
            case '_parse_jam':
              jamStr = val;
              break;
            case '_waktu_mulai':
              waktuMulai = val;
              break;
            case '_waktu_selesai':
              waktuSelesai = val;
              break;
            case '_parse_jenis_pertemuan':
              record.jenis_pertemuan = parseJenisPertemuan(val);
              meetingTypeWasProvided = true;
              break;
            case '_lookup_angkatan': {
              const angkatanLabels = splitAngkatanLabels(val);
              const resolvedAngkatanIds = angkatanLabels.map((name) => ({
                name,
                id: strictReferenceValidation
                  ? exactImportLookup(name, lookups.angkatanByName)
                  : fuzzyLookup(name, lookups.angkatanByName),
              }));
              if (strictReferenceValidation) {
                resolvedAngkatanIds
                  .filter(({ id }) => !id)
                  .forEach(({ name }) =>
                    rowIssues.push(
                      `angkatan "${name}" tidak ada di master data`
                    )
                  );
              }
              const angkatanIds = [
                ...new Set(
                  resolvedAngkatanIds.map(({ id }) => id).filter(Boolean)
                ),
              ].slice(0, 3);
              if (jenis === 'karya_akhir') {
                record.nama_angkatan = angkatanIds[0] || null;
              } else if (jenis === 'perkuliahan') {
                record.id_angkatan = angkatanIds[0] || null;
                if (angkatanIds.length) record.id_angkatans = angkatanIds;
              }
              break;
            }
            case '_lookup_ruangan': {
              sourceLocationLabel = val;
              const rid = strictReferenceValidation
                ? exactImportLookup(val, lookups.ruanganByName)
                : fuzzyLookup(val, lookups.ruanganByName);
              if (jenis === 'perkuliahan') record.ruangan_id = rid || null;
              else record.nama_ruangan = rid || null;
              if (!rid) {
                unresolvedRoomLabel = val;
                console.warn(`[Import] Ruangan tidak ditemukan: "${val}"`);
              }
              break;
            }
            case '_matkul_nama_source': {
              // Nama mata kuliah hanya membantu pengguna memeriksa preview.
              // Relasi database selalu ditentukan oleh kode mata kuliah.
              break;
            }
            case '_lookup_matkul_kode': {
              const mid = strictReferenceValidation
                ? exactImportLookup(val, lookups.matkulByKode)
                : fuzzyLookup(val, lookups.matkulByKode);
              if (mid) record.id_mata_kuliah = mid;
              else {
                if (strictReferenceValidation)
                  rowIssues.push(
                    `kode mata kuliah "${val}" tidak ada di master data`
                  );
                console.warn(
                  `[Import] Kode Mata Kuliah tidak ditemukan: "${val}"`
                );
              }
              break;
            }
            case '_lookup_agenda': {
              const normalizedAgenda = normalizeKaryaAkhirAgenda(val);
              const aid =
                lookups.agendaByName[normalizedAgenda.toLowerCase()] ||
                lookups.agendaByName[val.toLowerCase().trim()];
              record.agenda_jadwal_karya_akhir = aid || null;
              break;
            }
            case '_lookup_dosen1': {
              sourceDosenNames.push(...splitDosenLabels(val));
              break;
            }
            case '_dosen_id_source': {
              sourceDosenId = val;
              break;
            }
            case '_lookup_dosen_extra': {
              sourceDosenNames.push(...splitDosenLabels(val));
              break;
            }
            case '_dosen_email_source': {
              sourceDosenEmail = val;
              break;
            }
            case '_lookup_dosen_ka': {
              val
                .split(/[;|]/)
                .map((name) =>
                  findDosen(name, lookups.dosenByName, lookups.dosenByIdDosen)
                )
                .filter(Boolean)
                .forEach((did) => dosenKaIds.push(did));
              break;
            }
            case '_lookup_penguji': {
              val.split(/[;|]/).forEach((name) => {
                const did = findDosen(
                  name,
                  lookups.dosenByName,
                  lookups.dosenByIdDosen,
                  strictReferenceValidation
                );
                if (did) pengujiIds.push(did);
                else if (strictReferenceValidation)
                  rowIssues.push(
                    `penguji "${name.trim()}" tidak ada di master data`
                  );
              });
              break;
            }
            case '_parse_zoom_info': {
              const zi = parseZoomInfo(val);
              if (zi.zoom_id) record.zoom_id = zi.zoom_id;
              if (zi.zoom_password) record.zoom_password = zi.zoom_password;
              break;
            }
            case 'zoom_id':
              if (val !== '-') record.zoom_id = val;
              break;
            case 'zoom_password':
              if (val !== '-') record.zoom_password = val;
              break;
            default:
              break;
          }
        });

        if (jenis === 'perkuliahan') {
          const uniqueDosenNames = [...new Set(sourceDosenNames)];
          const primaryDosenName = uniqueDosenNames[0] || sourceDosenEmail;
          const primaryDosen = resolvePrimaryDosenImport({
            idDosen: sourceDosenId,
            email: sourceDosenEmail,
            name: primaryDosenName,
            dosenByExternalId: lookups.dosenByExternalId,
            dosenByEmail: lookups.dosenByEmail,
            dosenByName: lookups.dosenByName,
            requireExternalId: strictReferenceValidation,
          });
          const primaryDosenId = primaryDosen.id;

          record.dosen_id = primaryDosenId || null;
          if (strictReferenceValidation && !primaryDosenId) {
            rowIssues.push(
              primaryDosen.matchedBy === 'id_external'
                ? primaryDosen.reference
                  ? `ID dosen "${primaryDosen.reference}" tidak ada di master data`
                  : 'ID dosen kosong'
                : `dosen "${primaryDosenName}" tidak ada di master data`
            );
          }

          uniqueDosenNames.slice(1).forEach((name) => {
            const did = findDosen(
              name,
              lookups.dosenByName,
              lookups.dosenByIdDosen,
              strictReferenceValidation
            );
            if (did && String(did) !== String(primaryDosenId)) {
              dosenExtraIds.push(did);
            } else if (!did && strictReferenceValidation) {
              rowIssues.push(
                `dosen tambahan "${name}" tidak ada di master data`
              );
            }
          });
          dosenExtraIds = [...new Set(dosenExtraIds)];
        }

        // Parse jam with date — support combined "HH:MM - HH:MM" or separate Mulai/Selesai columns
        if (jamStr && rowDate) {
          const { mulai, akhir } = parseJam(jamStr, rowDate);
          if (mulai) record.mulai_jadwal = mulai;
          if (akhir) record.akhir_jadwal = akhir;
        } else if (rowDate && (waktuMulai || waktuSelesai)) {
          const dateStr =
            rowDate instanceof Date
              ? dateToLocalStr(rowDate)
              : String(rowDate).split('T')[0];
          if (waktuMulai) {
            const m = waktuMulai.match(/(\d{1,2})[.:](\d{2})/);
            if (m)
              record.mulai_jadwal = `${dateStr}T${m[1].padStart(2, '0')}:${m[2]}:00`;
          }
          if (waktuSelesai) {
            const m = waktuSelesai.match(/(\d{1,2})[.:](\d{2})/);
            if (m)
              record.akhir_jadwal = `${dateStr}T${m[1].padStart(2, '0')}:${m[2]}:00`;
          }
        }

        // Set JSONB arrays
        if (jenis === 'perkuliahan') {
          if (dosenExtraIds.length)
            record.dosen_ids = JSON.stringify(dosenExtraIds);
          if (pengujiIds.length)
            record.penguji_ids = JSON.stringify(pengujiIds);
        }
        if (jenis === 'karya_akhir') {
          const uniqueDosenKaIds = [...new Set(dosenKaIds)].slice(0, 4);
          const uniquePengujiIds = [...new Set(pengujiIds)].slice(0, 4);
          if (uniqueDosenKaIds.length)
            record.dosen_ids = JSON.stringify(uniqueDosenKaIds);
          if (uniquePengujiIds.length)
            record.penguji_ids = JSON.stringify(uniquePengujiIds);
        }

        // Set default jenis_pertemuan
        if (!record.jenis_pertemuan) record.jenis_pertemuan = 'luring';

        // Pertemuan daring tidak membawa reservasi ruangan dari spreadsheet.
        if (!usesPhysicalRoom(record.jenis_pertemuan)) {
          if (jenis === 'perkuliahan') record.ruangan_id = null;
          else record.nama_ruangan = null;
          if (jenis === 'perkuliahan') {
            record.lokasi_virtual = sourceLocationLabel || null;
          }
        } else if (strictReferenceValidation && unresolvedRoomLabel) {
          rowIssues.push(
            `ruangan "${unresolvedRoomLabel}" tidak ada di master data`
          );
        } else if (
          strictReferenceValidation &&
          meetingTypeWasProvided &&
          !record.ruangan_id
        ) {
          rowIssues.push('ruangan wajib diisi untuk pertemuan luring/hybrid');
        }

        // Add user info — gunakan batchTag agar bisa di-rollback
        record.created_by = batchTag;
        record.updated_by = batchTag;

        // Skip rows with almost no useful data
        const usefulKeys = Object.keys(record).filter(
          (k) =>
            !['created_by', 'updated_by', 'jenis_pertemuan'].includes(k) &&
            record[k] != null
        );
        if (usefulKeys.length < 1) {
          results.skipped++;
          continue;
        }

        if (strictReferenceValidation) {
          const validationIssues = validatePerkuliahanImportRecord(
            record,
            rowIssues
          );
          if (validationIssues.length > 0) {
            results.errors.push(
              `Baris ${rowIdx + 1}: ${validationIssues.join('; ')}`
            );
            continue;
          }
        }

        if (strictGoogleSync) {
          const syncRecord = normalizePerkuliahanSyncRecord(record, batchTag);
          if (preparedImportKeys.has(syncRecord.import_key)) {
            results.errors.push(
              `Baris ${rowIdx + 1}: jadwal duplikat di spreadsheet (mata kuliah, waktu, angkatan, paralel, pertemuan, dan dosen sama)`
            );
            continue;
          }

          preparedImportKeys.add(syncRecord.import_key);
          const pendingRow = {
            syncRowId: `${rowIdx + 1}:${syncRecord.import_key}`,
            rowNumber: rowIdx + 1,
            record: syncRecord,
          };
          preparedRows.push(pendingRow);

          const roomConflict = await findImportedRoomConflict({
            record: syncRecord,
            tableName,
            excludedIds: [...managedScheduleIds],
            roomNameById,
          });
          if (roomConflict) {
            addStrictSyncConflict(results, pendingRow, roomConflict);
          }
          continue;
        }

        // Upsert logic: cek apakah data sudah ada → update, belum ada → insert
        let existingRecord = null;
        if (record.mulai_jadwal) {
          if (existingSchedules) {
            existingRecord =
              existingSchedules.find((item) =>
                matchesImportedRecord(item, record, jenis)
              ) || null;
          } else {
            let matchQuery = supabase.from(tableName).select('*');
            if (jenis === 'perkuliahan') {
              matchQuery = matchQuery.eq('mulai_jadwal', record.mulai_jadwal);
              if (record.id_mata_kuliah)
                matchQuery = matchQuery.eq(
                  'id_mata_kuliah',
                  record.id_mata_kuliah
                );
              if (record.paralel != null)
                matchQuery = matchQuery.eq('paralel', record.paralel);
              else matchQuery = matchQuery.is('paralel', null);
              if (record.id_angkatan)
                matchQuery = matchQuery.eq('id_angkatan', record.id_angkatan);
              if (record.kelas)
                matchQuery = matchQuery.eq('kelas', record.kelas);
            } else if (jenis === 'karya_akhir') {
              matchQuery = matchQuery.eq('mulai_jadwal', record.mulai_jadwal);
              if (record.nama_mahasiswa)
                matchQuery = matchQuery.eq(
                  'nama_mahasiswa',
                  record.nama_mahasiswa
                );
            } else {
              matchQuery = matchQuery.eq('mulai_jadwal', record.mulai_jadwal);
              if (record.nama_user)
                matchQuery = matchQuery.eq('nama_user', record.nama_user);
            }
            const { data: existing, error: matchError } =
              await matchQuery.limit(1);
            if (matchError)
              throw new Error(
                `Pengecekan data yang sama gagal: ${matchError.message}`
              );
            existingRecord = existing?.[0] || null;
          }
        }

        if (existingRecord && !hasImportedChanges(existingRecord, record)) {
          results.skipped++;
          continue;
        }

        const effectiveRecord = existingRecord
          ? { ...existingRecord, ...record }
          : record;
        const roomConflict = await findImportedRoomConflict({
          record: effectiveRecord,
          tableName,
          existingId: existingRecord?.id,
          roomNameById,
        });
        if (roomConflict) {
          results.conflicts.push({
            id: `${rowIdx + 1}-${record.mulai_jadwal || Date.now()}`,
            rowNumber: rowIdx + 1,
            message: roomConflict,
            record,
            existingRecord,
            existingId: existingRecord?.id || null,
            verificationStatus: 'idle',
            verificationMessage: '',
          });
          continue;
        }

        let dbError;
        if (existingRecord) {
          // Data sudah ada → update (jangan timpa created_by)
          const updateRecord = { ...record };
          delete updateRecord.created_by;
          const { error } = await supabase
            .from(tableName)
            .update(updateRecord)
            .eq('id', existingRecord.id);
          dbError = error;
          if (!error) {
            results.updated++;
            results.success++;
            if (existingSchedules) {
              const cachedIndex = existingSchedules.findIndex(
                (item) => String(item.id) === String(existingRecord.id)
              );
              if (cachedIndex >= 0) {
                existingSchedules[cachedIndex] = {
                  ...existingRecord,
                  ...updateRecord,
                };
              }
            }
          }
        } else {
          // Data belum ada → insert baru
          const { error } = await supabase.from(tableName).insert([record]);
          dbError = error;
          if (!error) {
            results.inserted++;
            results.success++;
            if (existingSchedules) existingSchedules.push({ ...record });
          }
        }
        if (dbError) {
          results.errors.push(`Baris ${rowIdx + 1}: ${dbError.message}`);
        }
      } catch (err) {
        results.errors.push(`Baris ${rowIdx + 1}: ${err.message}`);
      } finally {
        const completedRows = rowIdx + 1;
        const rowProgress =
          totalImportRows > 0
            ? 5 + Math.round((completedRows / totalImportRows) * 75)
            : 80;
        setImportProgress(Math.min(80, rowProgress));
        setImportProgressLabel(
          `Memeriksa ${completedRows} dari ${totalImportRows} baris...`
        );
      }
    }

    if (strictGoogleSync) {
      setImportProgress(82);
      setImportProgressLabel('Memeriksa konflik antarjadwal...');
      for (let leftIndex = 0; leftIndex < preparedRows.length; leftIndex++) {
        const left = preparedRows[leftIndex];
        if (!usesPhysicalRoom(left.record.jenis_pertemuan)) continue;
        if (
          isRoomConflictExempt(roomNameById[String(left.record.ruangan_id)])
        ) {
          continue;
        }

        for (
          let rightIndex = leftIndex + 1;
          rightIndex < preparedRows.length;
          rightIndex++
        ) {
          const right = preparedRows[rightIndex];
          if (
            !usesPhysicalRoom(right.record.jenis_pertemuan) ||
            !importedSchedulesOverlapInSameRoom(left.record, right.record)
          ) {
            continue;
          }

          addStrictSyncConflict(
            results,
            right,
            `Ruangan yang sama juga dipakai oleh baris ${left.rowNumber} pada waktu yang bertabrakan`
          );
        }
      }

      results.pendingSyncRows = preparedRows;
      results.managedScheduleIds = [...managedScheduleIds];
      results.syncScopeStart = `${dateToLocalStr(importStartDay)}T00:00:00`;
      results.syncPending = results.conflicts.length > 0;
      setImportProgress(86);

      if (preparedRows.length === 0 && results.errors.length === 0) {
        results.errors.push('Tidak ada jadwal valid untuk disinkronkan.');
      }

      if (results.errors.length === 0 && results.conflicts.length === 0) {
        setImportProgress(92);
        setImportProgressLabel('Menyinkronkan jadwal ke database...');
        const { data: syncData, error: syncError } = await supabase.rpc(
          'sync_jadwal_perkuliahan_import',
          {
            p_rows: preparedRows.map(({ record }) => record),
            p_scope_start: results.syncScopeStart,
            p_batch_tag: batchTag,
          }
        );

        if (syncError) {
          const migrationHint = /function|schema cache|does not exist/i.test(
            syncError.message || ''
          )
            ? ' Jalankan MIGRATION_STRICT_JADWAL_PERKULIAHAN_SYNC.sql di Supabase terlebih dahulu.'
            : '';
          results.errors.push(
            `Sinkronisasi database dibatalkan: ${syncError.message}.${migrationHint}`
          );
        } else {
          const summary = Array.isArray(syncData) ? syncData[0] : syncData;
          results.inserted = Number(summary?.inserted || 0);
          results.updated = Number(summary?.updated || 0);
          results.deleted = Number(summary?.deleted || 0);
          results.success = Number(summary?.total || preparedRows.length);
        }
      } else {
        const blockedSyncRowIds = new Set(
          results.conflicts.map((conflict) => conflict.syncRowId)
        );
        const readyRows = preparedRows.filter(
          (row) => !blockedSyncRowIds.has(row.syncRowId)
        );

        if (readyRows.length > 0) {
          setImportProgressLabel(
            `Menyimpan 0 dari ${readyRows.length} baris valid...`
          );
          const partialResult = await upsertStrictSyncRows(
            readyRows,
            batchTag,
            existingSchedules,
            (completedRows, totalRows) => {
              setImportProgress(
                Math.min(99, 86 + Math.round((completedRows / totalRows) * 13))
              );
              setImportProgressLabel(
                `Menyimpan ${completedRows} dari ${totalRows} baris valid...`
              );
            }
          );
          results.inserted = partialResult.inserted;
          results.updated = partialResult.updated;
          results.success = partialResult.inserted + partialResult.updated;
          results.errors.push(...partialResult.errors);
        }
      }
    }

    setImportProgress(100);
    setImportProgressLabel('Proses import selesai.');
    setImportResult(results);
    setExpandedConflictIds([]);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setImporting(false);

    // Kirim notifikasi ke dashboard
    if (onNotify) {
      const jenisLabel =
        {
          perkuliahan: 'Perkuliahan',
          karya_akhir: 'Karya Akhir',
          lain_lain: 'Lain-lain',
        }[jenis] || jenis;
      if (results.updated > 0) {
        onNotify({
          type: 'edit',
          tag: 'UPDATE',
          title: `Import ${jenisLabel}: ${results.updated} Data Diperbarui`,
          description: `${results.updated} data lama memiliki perubahan dan berhasil diperbarui dari file import oleh ${userName || 'User'}.`,
        });
      }
      const failureMessages = [
        ...results.errors,
        ...results.conflicts.map(
          (conflict) =>
            `Baris ${conflict.rowNumber}: Konflik ruangan. ${conflict.message}`
        ),
      ];
      if (failureMessages.length > 0) {
        onNotify({
          type: 'error',
          tag: 'ERROR',
          title: `Import ${jenisLabel}: ${failureMessages.length} Baris Perlu Diperiksa`,
          description:
            failureMessages.slice(0, 3).join(' | ') +
            (failureMessages.length > 3
              ? ` (+${failureMessages.length - 3} lainnya)`
              : ''),
        });
      }
      if (results.inserted > 0) {
        onNotify({
          type: 'tambah',
          tag: 'BARU',
          title: `Import ${jenisLabel}: ${results.inserted} Data Ditambahkan`,
          description: `${results.inserted} data baru berhasil diimport oleh ${userName || 'User'}.`,
        });
      }
      if (results.deleted > 0) {
        onNotify({
          type: 'hapus',
          tag: 'SYNC',
          title: `Import ${jenisLabel}: ${results.deleted} Data Lama Dibersihkan`,
          description: `${results.deleted} data hasil import lama tidak lagi ada di sumber dan telah dibersihkan saat sinkronisasi.`,
        });
      }
    }
  };

  const executePendingStrictSync = async ({
    pendingRows,
    scopeStart,
    batchTag,
  }) => {
    setImportProgress(0);
    setImportProgressLabel('Menyiapkan sinkronisasi akhir...');
    setImporting(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    setImportProgress(92);
    setImportProgressLabel('Menyinkronkan jadwal ke database...');
    try {
      const { data: syncData, error: syncError } = await supabase.rpc(
        'sync_jadwal_perkuliahan_import',
        {
          p_rows: pendingRows.map(({ record }) => record),
          p_scope_start: scopeStart,
          p_batch_tag: batchTag,
        }
      );
      if (syncError) throw syncError;

      const summary = Array.isArray(syncData) ? syncData[0] : syncData;
      const inserted = Number(summary?.inserted || 0);
      const updated = Number(summary?.updated || 0);
      const deleted = Number(summary?.deleted || 0);
      const success = Number(summary?.total || pendingRows.length);
      setImportResult((current) => ({
        ...current,
        success,
        inserted,
        updated,
        deleted,
        conflicts: [],
        errors: [],
        syncPending: false,
        pendingSyncRows: pendingRows,
      }));
      if (onNotify) {
        onNotify({
          type: 'edit',
          tag: 'SYNC',
          title: 'Sinkronisasi jadwal berhasil',
          description: `${success} jadwal diproses setelah seluruh konflik ruangan diselesaikan.`,
        });
      }
      if (onSuccess) onSuccess();
    } catch (error) {
      const migrationHint = /function|schema cache|does not exist/i.test(
        error.message || ''
      )
        ? ' Jalankan MIGRATION_STRICT_JADWAL_PERKULIAHAN_SYNC.sql di Supabase terlebih dahulu.'
        : '';
      setImportResult((current) => ({
        ...current,
        conflicts: [],
        errors: [
          `Sinkronisasi database dibatalkan: ${error.message}.${migrationHint}`,
        ],
        syncPending: false,
        pendingSyncRows: pendingRows,
      }));
    } finally {
      setImportProgress(100);
      setImportProgressLabel('Proses sinkronisasi selesai.');
      await new Promise((resolve) => setTimeout(resolve, 300));
      setImporting(false);
    }
  };

  const handleConflictChange = (conflictId, field, value) => {
    if (
      field === 'mulai_jadwal' ||
      field === 'akhir_jadwal' ||
      field === 'ruangan_id' ||
      field === 'nama_ruangan' ||
      field === 'jenis_pertemuan'
    ) {
      setRoomAvailabilityByConflict((current) => {
        const next = { ...current };
        delete next[conflictId];
        return next;
      });
    }
    setImportResult((current) => {
      if (!current) return current;

      const selectedConflict = current.conflicts.find(
        (conflict) => conflict.id === conflictId
      );
      if (!selectedConflict) return current;

      const nextRecord = {
        ...selectedConflict.record,
        [field]: value,
      };
      if (field === 'jenis_pertemuan' && !usesPhysicalRoom(value)) {
        if (jenis === 'perkuliahan') nextRecord.ruangan_id = null;
        else nextRecord.nama_ruangan = null;
      }

      return {
        ...current,
        pendingSyncRows: (current.pendingSyncRows || []).map((row) =>
          row.syncRowId === selectedConflict.syncRowId
            ? { ...row, record: nextRecord }
            : row
        ),
        conflicts: current.conflicts.map((conflict) =>
          conflict.id === conflictId
            ? {
                ...conflict,
                record: nextRecord,
                saveError: '',
                verificationStatus: 'idle',
                verificationMessage: '',
              }
            : conflict
        ),
      };
    });
  };

  const handleSkipConflict = (conflictId) => {
    setExpandedConflictIds((current) =>
      current.filter((id) => id !== conflictId)
    );
    setRoomAvailabilityByConflict((current) => {
      const next = { ...current };
      delete next[conflictId];
      return next;
    });
    setImportResult((current) => {
      if (!current) return current;
      return {
        ...current,
        conflicts: current.conflicts.filter(
          (conflict) => conflict.id !== conflictId
        ),
        skipped: current.skipped + 1,
      };
    });
  };

  const toggleConflict = (conflictId) => {
    if (!expandedConflictIds.includes(conflictId)) {
      void handleLoadRoomAvailability(conflictId);
    }
    setExpandedConflictIds((current) =>
      current.includes(conflictId)
        ? current.filter((id) => id !== conflictId)
        : [...current, conflictId]
    );
  };

  const handleLoadRoomAvailability = async (conflictId) => {
    const conflict = importResult?.conflicts.find(
      (item) => item.id === conflictId
    );
    if (!conflict) return;
    const roomNameById = Object.fromEntries(
      (allRuangan.length > 0 ? allRuangan : options.ruangan || []).map(
        (room) => [String(room.id), room.nama_ruangan]
      )
    );

    const { mulai_jadwal: mulai, akhir_jadwal: akhir } = conflict.record;
    const start = new Date(mulai);
    const end = new Date(akhir);
    if (
      !mulai ||
      !akhir ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      setRoomAvailabilityByConflict((current) => ({
        ...current,
        [conflictId]: {
          loading: false,
          error:
            'Lengkapi waktu yang valid untuk melihat ketersediaan ruangan.',
          occupied: {},
        },
      }));
      return;
    }

    setRoomAvailabilityByConflict((current) => ({
      ...current,
      [conflictId]: { loading: true, error: '', occupied: {} },
    }));

    try {
      const { data, error } = await supabase
        .from('view_jadwal_union')
        .select('ruangan_id, jenis_jadwal, id_asli, mulai_jadwal, akhir_jadwal')
        .lt('mulai_jadwal', akhir)
        .gt('akhir_jadwal', mulai);
      if (error) throw error;

      const currentType = {
        perkuliahan: 'PERKULIAHAN',
        karya_akhir: 'KARYA_AKHIR',
        lain_lain: 'LAIN_LAIN',
      }[jenis];
      const typeLabels = {
        PERKULIAHAN: 'Perkuliahan',
        KARYA_AKHIR: 'Karya Akhir',
        LAIN_LAIN: 'Lain-lain',
      };
      const occupied = {};
      const managedIdSet = new Set(
        (importResult?.managedScheduleIds || []).map(String)
      );
      (data || []).forEach((schedule) => {
        if (
          schedule.jenis_jadwal === currentType &&
          ((conflict.existingId != null &&
            String(schedule.id_asli) === String(conflict.existingId)) ||
            managedIdSet.has(String(schedule.id_asli)))
        ) {
          return;
        }
        if (!schedule.ruangan_id) return;

        occupied[String(schedule.ruangan_id)] = {
          label: typeLabels[schedule.jenis_jadwal] || schedule.jenis_jadwal,
          start: schedule.mulai_jadwal,
          end: schedule.akhir_jadwal,
        };
      });

      (importResult?.pendingSyncRows || []).forEach((row) => {
        if (
          row.syncRowId === conflict.syncRowId ||
          !usesPhysicalRoom(row.record?.jenis_pertemuan) ||
          !row.record?.ruangan_id ||
          isRoomConflictExempt(roomNameById[String(row.record.ruangan_id)])
        ) {
          return;
        }

        const rowStart = new Date(row.record.mulai_jadwal).getTime();
        const rowEnd = new Date(row.record.akhir_jadwal).getTime();
        if (start.getTime() < rowEnd && end.getTime() > rowStart) {
          occupied[String(row.record.ruangan_id)] = {
            label: `Baris import ${row.rowNumber}`,
            start: row.record.mulai_jadwal,
            end: row.record.akhir_jadwal,
          };
        }
      });

      setRoomAvailabilityByConflict((current) => ({
        ...current,
        [conflictId]: { loading: false, error: '', occupied },
      }));
    } catch (error) {
      setRoomAvailabilityByConflict((current) => ({
        ...current,
        [conflictId]: {
          loading: false,
          error: error.message || 'Ketersediaan ruangan gagal dimuat.',
          occupied: {},
        },
      }));
    }
  };

  const handleCheckConflict = async (conflictId) => {
    const conflict = importResult?.conflicts.find(
      (item) => item.id === conflictId
    );
    if (!conflict) return;

    const start = new Date(conflict.record.mulai_jadwal);
    const end = new Date(conflict.record.akhir_jadwal);
    const roomField = jenis === 'perkuliahan' ? 'ruangan_id' : 'nama_ruangan';
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      setImportResult((current) => ({
        ...current,
        conflicts: current.conflicts.map((item) =>
          item.id === conflictId
            ? {
                ...item,
                verificationStatus: 'invalid',
                verificationMessage:
                  'Waktu mulai dan selesai belum valid. Waktu selesai harus setelah waktu mulai.',
              }
            : item
        ),
      }));
      return;
    }
    if (
      usesPhysicalRoom(conflict.record.jenis_pertemuan) &&
      !conflict.record[roomField]
    ) {
      setImportResult((current) => ({
        ...current,
        conflicts: current.conflicts.map((item) =>
          item.id === conflictId
            ? {
                ...item,
                verificationStatus: 'invalid',
                verificationMessage:
                  'Pilih ruangan untuk pertemuan luring atau hybrid.',
              }
            : item
        ),
      }));
      return;
    }

    setCheckingConflictId(conflictId);
    const tableName =
      jenis === 'perkuliahan'
        ? 'jadwal_perkuliahan'
        : jenis === 'karya_akhir'
          ? 'jadwal_karya_akhir'
          : 'jadwal_lain_lain';
    const roomNameById = Object.fromEntries(
      (allRuangan.length > 0 ? allRuangan : options.ruangan || []).map(
        (room) => [String(room.id), room.nama_ruangan]
      )
    );

    try {
      const effectiveRecord = conflict.existingRecord
        ? { ...conflict.existingRecord, ...conflict.record }
        : conflict.record;
      const databaseConflict = await findImportedRoomConflict({
        record: effectiveRecord,
        tableName,
        existingId: conflict.existingId,
        excludedIds: importResult?.managedScheduleIds || [],
        roomNameById,
      });
      const pendingConflict = findPendingRoomConflict({
        record: effectiveRecord,
        syncRowId: conflict.syncRowId,
        pendingRows: importResult?.pendingSyncRows || [],
        roomNameById,
      });
      const roomConflict = databaseConflict || pendingConflict;

      setImportResult((current) => ({
        ...current,
        conflicts: current.conflicts.map((item) =>
          item.id === conflictId
            ? {
                ...item,
                message: roomConflict || item.message,
                verificationStatus: roomConflict ? 'conflict' : 'ready',
                verificationMessage: roomConflict
                  ? `Masih konflik: ${roomConflict}`
                  : 'Pemeriksaan berhasil. Waktu dan ruangan tersedia; data siap disimpan.',
                saveError: '',
              }
            : item
        ),
      }));
    } catch (error) {
      setImportResult((current) => ({
        ...current,
        conflicts: current.conflicts.map((item) =>
          item.id === conflictId
            ? {
                ...item,
                verificationStatus: 'invalid',
                verificationMessage:
                  error.message || 'Pemeriksaan konflik gagal.',
              }
            : item
        ),
      }));
    } finally {
      setCheckingConflictId(null);
    }
  };

  const handleRetryConflict = async (conflictId) => {
    const conflict = importResult?.conflicts.find(
      (item) => item.id === conflictId
    );
    if (!conflict) return;
    if (conflict.verificationStatus !== 'ready') {
      setImportResult((current) => ({
        ...current,
        conflicts: current.conflicts.map((item) =>
          item.id === conflictId
            ? {
                ...item,
                saveError:
                  'Periksa perubahan terlebih dahulu sebelum menyimpan.',
              }
            : item
        ),
      }));
      return;
    }

    setResolvingConflictId(conflictId);
    const tableName =
      jenis === 'perkuliahan'
        ? 'jadwal_perkuliahan'
        : jenis === 'karya_akhir'
          ? 'jadwal_karya_akhir'
          : 'jadwal_lain_lain';
    const roomNameById = Object.fromEntries(
      (allRuangan.length > 0 ? allRuangan : options.ruangan || []).map(
        (room) => [String(room.id), room.nama_ruangan]
      )
    );

    try {
      const effectiveRecord = conflict.existingRecord
        ? { ...conflict.existingRecord, ...conflict.record }
        : conflict.record;
      const databaseConflict = await findImportedRoomConflict({
        record: effectiveRecord,
        tableName,
        existingId: conflict.existingId,
        excludedIds: importResult?.managedScheduleIds || [],
        roomNameById,
      });
      const pendingConflict = findPendingRoomConflict({
        record: effectiveRecord,
        syncRowId: conflict.syncRowId,
        pendingRows: importResult?.pendingSyncRows || [],
        roomNameById,
      });
      const roomConflict = databaseConflict || pendingConflict;

      if (roomConflict) {
        setImportResult((current) => ({
          ...current,
          conflicts: current.conflicts.map((item) =>
            item.id === conflictId
              ? {
                  ...item,
                  message: roomConflict,
                  saveError: '',
                  verificationStatus: 'conflict',
                  verificationMessage: `Konflik baru ditemukan: ${roomConflict}`,
                }
              : item
          ),
        }));
        return;
      }

      if (importResult?.strictSync) {
        const pendingRows = (importResult.pendingSyncRows || []).map((row) =>
          row.syncRowId === conflict.syncRowId
            ? { ...row, record: conflict.record }
            : row
        );
        const remainingConflicts = importResult.conflicts.filter(
          (item) => item.id !== conflictId
        );

        if (
          remainingConflicts.length === 0 &&
          (importResult.errors || []).length === 0
        ) {
          setExpandedConflictIds((current) =>
            current.filter((id) => id !== conflictId)
          );
          setRoomAvailabilityByConflict((current) => {
            const next = { ...current };
            delete next[conflictId];
            return next;
          });
          setImportResult((current) => ({
            ...current,
            pendingSyncRows: pendingRows,
            conflicts: [],
          }));
          await executePendingStrictSync({
            pendingRows,
            scopeStart: importResult.syncScopeStart,
            batchTag: importBatchTag,
          });
          return;
        }

        const partialResult = await upsertStrictSyncRows(
          [
            {
              syncRowId: conflict.syncRowId,
              rowNumber: conflict.rowNumber,
              record: conflict.record,
            },
          ],
          importBatchTag
        );
        if (partialResult.errors.length > 0) {
          setImportResult((current) => ({
            ...current,
            conflicts: current.conflicts.map((item) =>
              item.id === conflictId
                ? { ...item, saveError: partialResult.errors.join(' | ') }
                : item
            ),
          }));
          return;
        }

        setExpandedConflictIds((current) =>
          current.filter((id) => id !== conflictId)
        );
        setRoomAvailabilityByConflict((current) => {
          const next = { ...current };
          delete next[conflictId];
          return next;
        });
        setImportResult((current) => ({
          ...current,
          success: current.success + 1,
          inserted: current.inserted + partialResult.inserted,
          updated: current.updated + partialResult.updated,
          pendingSyncRows: pendingRows,
          conflicts: remainingConflicts,
          syncPending: remainingConflicts.length > 0,
        }));
        return;
      }

      let dbError;
      if (conflict.existingId) {
        const updateRecord = { ...conflict.record };
        delete updateRecord.created_by;
        const { error } = await supabase
          .from(tableName)
          .update(updateRecord)
          .eq('id', conflict.existingId);
        dbError = error;
      } else {
        const { error } = await supabase
          .from(tableName)
          .insert([conflict.record]);
        dbError = error;
      }
      if (dbError) throw dbError;

      setImportResult((current) => ({
        ...current,
        success: current.success + 1,
        inserted: current.inserted + (conflict.existingId ? 0 : 1),
        updated: current.updated + (conflict.existingId ? 1 : 0),
        conflicts: current.conflicts.filter((item) => item.id !== conflictId),
      }));
      setExpandedConflictIds((current) =>
        current.filter((id) => id !== conflictId)
      );
      setRoomAvailabilityByConflict((current) => {
        const next = { ...current };
        delete next[conflictId];
        return next;
      });
    } catch (error) {
      setImportResult((current) => ({
        ...current,
        conflicts: current.conflicts.map((item) =>
          item.id === conflictId
            ? {
                ...item,
                saveError: error.message || 'Gagal menyimpan perubahan.',
              }
            : item
        ),
      }));
    } finally {
      setResolvingConflictId(null);
    }
  };

  // Reset state
  const handleReset = () => {
    setFile(null);
    setSheetNames([]);
    setSelectedSheet('');
    setWorkbook(null);
    setPreviewData([]);
    setPreviewHeaders([]);
    setColumnMapping({});
    setDateColumn('');
    setDataSource('file');
    setStep(1);
    setImportResult(null);
    setImporting(false);
    setImportProgress(0);
    setImportProgressLabel('Menyiapkan data import...');
    setResolvingConflictId(null);
    setCheckingConflictId(null);
    setExpandedConflictIds([]);
    setRoomAvailabilityByConflict({});
    setUndoing(false);
    setImportBatchTag('');
    setGoogleSheetLoading(false);
    setGoogleSheetError('');
    setGoogleWorkbook(null);
    setGoogleSheetNames([]);
    setSelectedGoogleSheet('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
    if (importResult && importResult.success > 0 && onSuccess) {
      onSuccess();
    }
  };

  // ──────────── Rollback/Undo import ────────────
  const handleUndo = async () => {
    if (!importBatchTag) return;
    if (
      !confirm(
        `Batalkan import ini? ${importResult?.inserted || 0} data baru dari import "${importBatchTag}" akan dihapus. Data yang diupdate tidak dapat di-rollback otomatis.`
      )
    )
      return;

    setUndoing(true);
    try {
      const tableMap = {
        perkuliahan: 'jadwal_perkuliahan',
        karya_akhir: 'jadwal_karya_akhir',
        lain_lain: 'jadwal_lain_lain',
      };
      const { error } = await supabase
        .from(tableMap[jenis])
        .delete()
        .eq('created_by', importBatchTag);
      if (error) throw error;
      alert(
        `Import berhasil dibatalkan. Semua data dari batch ini telah dihapus.`
      );
      if (onSuccess) onSuccess();
      handleReset();
      onClose();
    } catch (err) {
      alert(`Gagal membatalkan import: ${err.message}`);
    } finally {
      setUndoing(false);
    }
  };

  if (!isOpen) return null;

  const jenisLabels = {
    perkuliahan: 'Perkuliahan',
    karya_akhir: 'Karya Akhir',
    lain_lain: 'Lain-lain',
  };
  const findOptionById = (items, id) =>
    (items || []).find((item) => String(item.id) === String(id));
  const parseRecordIds = (value) => {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const getConflictDetails = (record) => {
    const details = [{ label: 'Kategori', value: jenisLabels[jenis] || jenis }];

    if (jenis === 'perkuliahan') {
      const mataKuliah = findOptionById(
        options.mataKuliah,
        record.id_mata_kuliah
      );
      const mataKuliahName =
        mataKuliah?.mata_kuliah || mataKuliah?.nama_matkul || record.kegiatan;
      const mataKuliahCode = mataKuliah?.kode_mata_kuliah;
      const angkatanIds = parseRecordIds(record.id_angkatans);
      if (angkatanIds.length === 0 && record.id_angkatan) {
        angkatanIds.push(record.id_angkatan);
      }
      const angkatanNames = angkatanIds
        .map((id) => findOptionById(options.angkatan, id)?.nama_angkatan || id)
        .join(', ');
      const dosen = findOptionById(options.dosen, record.dosen_id);

      details.push(
        {
          label: 'Kegiatan',
          value: mataKuliahName
            ? `${mataKuliahCode ? `${mataKuliahCode} — ` : ''}${mataKuliahName}`
            : '-',
        },
        { label: 'Angkatan', value: angkatanNames || '-' },
        {
          label: 'Kelas / Paralel',
          value: [
            record.kelas && `Kelas ${record.kelas}`,
            record.paralel != null && `Paralel ${record.paralel}`,
          ]
            .filter(Boolean)
            .join(' · '),
        },
        { label: 'Dosen', value: dosen?.nama_dosen || '-' }
      );
    } else if (jenis === 'karya_akhir') {
      const agenda = findOptionById(
        options.agenda,
        record.agenda_jadwal_karya_akhir
      );
      const angkatan = findOptionById(options.angkatan, record.nama_angkatan);
      details.push(
        {
          label: 'Kegiatan',
          value: agenda?.agenda_karya_akhir || '-',
        },
        { label: 'Mahasiswa', value: record.nama_mahasiswa || '-' },
        { label: 'Angkatan', value: angkatan?.nama_angkatan || '-' }
      );
    } else {
      details.push(
        { label: 'Kegiatan', value: record.agenda || '-' },
        { label: 'Pengguna', value: record.nama_user || '-' },
        { label: 'Keterangan', value: record.keterangan || '-' }
      );
    }

    return details.filter((detail) => detail.value);
  };
  const steps = [
    { number: 1, label: 'Sumber data' },
    { number: 2, label: 'Mapping kolom' },
    { number: 3, label: 'Periksa data' },
    { number: 4, label: 'Hasil import' },
  ];
  const mappedColumnCount = Object.keys(columnMapping).length;
  const karyaAkhirDateColumnIndex = previewHeaders.findIndex(
    (header) => header.trim().toLowerCase() === 'tanggal pelaksanaan'
  );
  const isKaryaAkhirDateColumnLocked =
    dataSource === 'google' &&
    jenis === 'karya_akhir' &&
    karyaAkhirDateColumnIndex >= 0;
  const unresolvedConflictCount = importResult?.conflicts?.length || 0;
  const failureCount =
    (importResult?.errors?.length || 0) + unresolvedConflictCount;
  const fileSize = file
    ? file.size < 1024 * 1024
      ? `${Math.max(1, Math.round(file.size / 1024))} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    : '';
  const importStartDay = getImportStartDay();
  const googleSyncDateLabel = `Mulai ${importStartDay.toLocaleDateString(
    'id-ID',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }
  )} dan seluruh tanggal setelahnya`;
  const handleDownloadErrorReport = () => {
    if (!importResult || failureCount === 0) return;

    const conflictErrors = (importResult.conflicts || []).map(
      (conflict) => `Baris ${conflict.rowNumber}: ${conflict.message}`
    );
    const report = buildImportErrorReport({
      errors: [...(importResult.errors || []), ...conflictErrors],
      headers: previewHeaders,
      rows: filteredPreviewData,
      metadata: {
        batch_id: importBatchTag,
        schedule_type: jenis,
        schedule_label: jenisLabels[jenis] || jenis,
        data_source: dataSource,
        source_file: file?.name || null,
        sheet_name:
          dataSource === 'google' ? selectedGoogleSheet : selectedSheet,
      },
    });
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .replace('Z', '');
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = `kegagalan-import-${jenis}-${timestamp}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6"
      onClick={importing ? undefined : handleClose}
      role="presentation"
    >
      <div
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/20 bg-white shadow-2xl shadow-slate-950/25"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-jadwal-title"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 ring-1 ring-primary-100">
              <FileSpreadsheet size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="import-jadwal-title"
                  className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl"
                >
                  Import Jadwal
                </h2>
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700 ring-1 ring-inset ring-primary-100">
                  {jenisLabels[jenis]}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Step {step}/4 —{' '}
                {step === 1
                  ? 'Pilih Sumber Data'
                  : step === 2
                    ? 'Mapping Kolom'
                    : step === 3
                      ? 'Preview & Import'
                      : 'Hasil Import'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={importing}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Tutup popup import"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <ol className="mt-5 grid grid-cols-4 gap-1 sm:gap-3">
            {steps.map((item, index) => {
              const isComplete = step > item.number;
              const isCurrent = step === item.number;
              return (
                <li key={item.number} className="flex min-w-0 items-center">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ring-inset ${
                        isComplete
                          ? 'bg-emerald-500 text-white ring-emerald-500'
                          : isCurrent
                            ? 'bg-primary-600 text-white ring-primary-600'
                            : 'bg-slate-100 text-slate-500 ring-slate-200'
                      }`}
                      aria-current={isCurrent ? 'step' : undefined}
                    >
                      {isComplete ? (
                        <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                      ) : (
                        item.number
                      )}
                    </span>
                    <span
                      className={`hidden truncate text-xs font-medium sm:block ${
                        isCurrent ? 'text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`mx-1.5 h-px min-w-2 flex-1 sm:mx-3 ${
                        isComplete ? 'bg-emerald-300' : 'bg-slate-200'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="bg-slate-50/70 p-5 sm:p-7">
          {/* ──────────── STEP 1: Upload File ──────────── */}
          {step === 1 && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h3 className="text-base font-semibold text-slate-900">
                    Ambil data jadwal
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Baca langsung dari Google Sheets atau unggah file lokal.
                  </p>
                </div>

                {(jenis === 'perkuliahan' || jenis === 'karya_akhir') && (
                  <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 ring-1 ring-emerald-200">
                        <FileSpreadsheet size={20} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {getGoogleSheetSourceLabel(jenis)}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {jenis === 'karya_akhir'
                            ? 'Ambil data terbaru langsung dari sheet Karya Akhir yang terhubung.'
                            : `Muat spreadsheet. Sheet Jadwal akan dipilih otomatis, lalu hanya baris ${jenisLabels[jenis]} yang akan diproses.`}
                        </p>
                        <a
                          href={getGoogleSheetSourceUrl(jenis)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                        >
                          Buka spreadsheet sumber ↗
                        </a>
                      </div>
                    </div>

                    {googleSheetError && (
                      <div className="mt-3 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">
                        {googleSheetError}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleLoadGoogleWorkbook}
                      disabled={googleSheetLoading}
                      className="ui-button ui-button-primary mt-4 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {googleSheetLoading ? (
                        <>
                          <LoaderCircle
                            size={16}
                            className="animate-spin"
                            aria-hidden="true"
                          />
                          Membaca jadwal terbaru...
                        </>
                      ) : (
                        <>
                          {googleSheetNames.length > 0
                            ? 'Muat ulang daftar sheet'
                            : 'Ambil data terbaru'}
                          <ArrowRight size={16} aria-hidden="true" />
                        </>
                      )}
                    </button>

                    {googleSheetNames.length > 0 && (
                      <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3">
                        <label
                          htmlFor="google-import-sheet"
                          className="mb-1.5 block text-xs font-semibold text-slate-700"
                        >
                          Sheet yang akan disinkronkan
                        </label>
                        <select
                          id="google-import-sheet"
                          value={selectedGoogleSheet}
                          onChange={(event) => {
                            setSelectedGoogleSheet(event.target.value);
                            setGoogleSheetError('');
                          }}
                          className="ui-field w-full bg-white text-sm"
                        >
                          <option value="">Pilih sheet dahulu</option>
                          {googleSheetNames.map((name, index) => (
                            <option key={name} value={name}>
                              Sheet {index + 1} — {name}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
                          Hanya data dari sheet yang dipilih yang akan masuk ke
                          tahap mapping dan sinkronisasi.
                        </p>

                        <button
                          type="button"
                          onClick={handleReadGoogleSheet}
                          disabled={!selectedGoogleSheet}
                          className="ui-button ui-button-primary mt-3 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Baca sheet dan cek mapping
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {(jenis === 'perkuliahan' || jenis === 'karya_akhir') && (
                  <div className="mb-5 flex items-center gap-3 text-xs font-medium text-slate-400">
                    <span className="h-px flex-1 bg-slate-200" />
                    atau unggah file
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>
                )}
                <input
                  id="import-schedule-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <label
                  htmlFor="import-schedule-file"
                  className="group flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-6 py-8 text-center transition-colors hover:border-primary-400 hover:bg-primary-50/40"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary-600 shadow-sm ring-1 ring-slate-200 transition-transform group-hover:-translate-y-0.5">
                    <UploadCloud size={27} aria-hidden="true" />
                  </span>
                  <span className="mt-4 text-sm font-semibold text-slate-900">
                    Klik untuk memilih file
                  </span>
                  <span className="mt-1.5 text-xs text-slate-500">
                    Mendukung XLSX, XLS, dan CSV
                  </span>
                </label>

                {file && sheetNames.length > 0 && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 ring-1 ring-emerald-200">
                        <FileSpreadsheet size={20} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {file.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {fileSize} · {sheetNames.length} sheet terdeteksi
                        </p>
                      </div>
                      <CheckCircle2
                        size={20}
                        className="shrink-0 text-emerald-600"
                        aria-label="File berhasil dibaca"
                      />
                    </div>

                    <div className="mt-4">
                      <label
                        htmlFor="import-sheet"
                        className="mb-1.5 block text-xs font-semibold text-slate-700"
                      >
                        Sheet yang akan diproses
                      </label>
                      <select
                        id="import-sheet"
                        value={selectedSheet}
                        onChange={(e) => setSelectedSheet(e.target.value)}
                        className="ui-field w-full bg-white text-sm"
                      >
                        {sheetNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleReadSheet}
                      className="ui-button ui-button-primary mt-4 w-full justify-center"
                    >
                      Baca dan lanjutkan
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </section>

              {/* Guide */}
              <aside className="rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-600 shadow-sm">
                <div className="flex items-center gap-2 text-slate-900">
                  <Info
                    size={18}
                    className="text-primary-600"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-semibold">Panduan file</p>
                </div>
                <ul className="mt-4 list-disc space-y-2 pl-4 leading-5 marker:text-primary-500">
                  {(jenis === 'perkuliahan' || jenis === 'karya_akhir') && (
                    <li>
                      Google Sheets terhubung otomatis memisahkan data sesuai
                      tab {jenisLabels[jenis]}
                    </li>
                  )}
                  <li>File Excel (.xlsx/.xls) — bisa pilih sheet</li>
                  <li>File CSV (.csv) — langsung diproses</li>
                  <li>
                    Baris pertama (header) akan digunakan sebagai nama kolom
                  </li>
                  <li>
                    Kolom akan di-mapping otomatis berdasarkan nama header
                  </li>
                </ul>
                <div className="mt-5 rounded-lg bg-amber-50 p-3 leading-5 text-amber-800 ring-1 ring-inset ring-amber-200">
                  ID eksternal menjadi acuan utama. Nama dan email hanya
                  digunakan untuk file lama yang belum memiliki ID tersebut.
                </div>
              </aside>
            </div>
          )}

          {/* ──────────── STEP 2: Column Mapping ──────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Cocokkan kolom
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Periksa hasil mapping otomatis sebelum melanjutkan.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    {previewHeaders.length} kolom file
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    {mappedColumnCount} terpetakan
                  </span>
                </div>
              </div>

              {/* Date column selector */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex items-center gap-2 text-amber-950">
                  <AlertCircle size={18} aria-hidden="true" />
                  <label
                    htmlFor="import-date-column"
                    className="text-sm font-semibold"
                  >
                    Kolom tanggal jadwal
                  </label>
                </div>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  Pilih kolom yang berisi tanggal untuk setiap jadwal.
                </p>
                <select
                  id="import-date-column"
                  value={dateColumn}
                  onChange={(e) => setDateColumn(e.target.value)}
                  disabled={isKaryaAkhirDateColumnLocked}
                  className="ui-field mt-3 w-full border-amber-300 bg-white text-sm disabled:cursor-not-allowed disabled:bg-amber-100/60"
                >
                  <option value="">
                    -- Tidak ada (tanggal dari section header) --
                  </option>
                  {previewHeaders.map((h, idx) => (
                    <option key={idx} value={String(idx)}>
                      {h || `Kolom ${idx + 1}`}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-5 text-amber-700">
                  {isKaryaAkhirDateColumnLocked
                    ? 'Kolom Tanggal Pelaksanaan dipilih otomatis untuk sumber Karya Akhir ini.'
                    : 'Jika spreadsheet menggunakan baris section header seperti "Selasa, 27 Januari 2026", biarkan kosong.'}
                </p>
              </div>

              {/* Column mapping table */}
              <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[680px] border-collapse text-sm">
                  <thead>
                    <tr className="sticky top-0 z-10 bg-slate-100">
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Kolom File
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Contoh Data
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Map ke →
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewHeaders.map((header, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-slate-100 ${columnMapping[idx] ? 'bg-emerald-50/40' : 'bg-white'}`}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {header || (
                            <span className="text-slate-400">(kosong)</span>
                          )}
                        </td>
                        <td className="max-w-[220px] truncate px-4 py-3 text-xs text-slate-500">
                          {previewData.length > 0
                            ? String(previewData[0][idx] || '-')
                            : '-'}
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            value={columnMapping[idx] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setColumnMapping((prev) => {
                                const next = { ...prev };
                                if (val) next[idx] = val;
                                else delete next[idx];
                                return next;
                              });
                            }}
                            className={`ui-field min-h-9 w-full py-1.5 text-xs ${columnMapping[idx] ? 'border-emerald-300 bg-emerald-50/60' : 'bg-white'}`}
                          >
                            <option value="">-- Lewati --</option>
                            {getDbColumns().map((col) => (
                              <option key={col.key} value={col.key}>
                                {col.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="ui-button ui-button-secondary justify-center sm:min-w-32"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={mappedColumnCount === 0}
                  className="ui-button ui-button-primary justify-center disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-44"
                >
                  Periksa data
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* ──────────── STEP 3: Preview & Confirm ──────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Cakupan import
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Hanya jadwal bertanggal valid mulai hari ini, dihitung saat
                    proses dijalankan, dan seluruh tanggal setelahnya yang
                    diambil. Jadwal sebelum hari ini atau baris tanpa tanggal
                    tidak ikut diproses ke database.
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-700">
                    {googleSyncDateLabel}
                  </p>
                </div>

                <p className="mt-3 text-xs font-medium text-emerald-700">
                  {filteredPreviewData.length} baris akan diproses. Data yang
                  {jenis === 'perkuliahan' && dataSource === 'google'
                    ? ' tidak lolos validasi akan membatalkan seluruh sinkronisasi. Data import lama yang tidak lagi ada di Google Sheet akan dibersihkan.'
                    : ' sama dilewati, sedangkan konflik dapat diedit atau dilewati pada hasil import.'}
                </p>
              </div>

              <div className="rounded-xl border border-primary-200 bg-primary-50/70 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary-600 ring-1 ring-primary-200">
                    <Database size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Siap mengimpor {filteredPreviewData.length} baris
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Tujuan: <strong>Jadwal {jenisLabels[jenis]}</strong>.
                      Baris kosong akan dilewati otomatis.
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview table - first 10 rows */}
              <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-max border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100">
                    <tr>
                      <th className="border-b border-slate-200 px-3 py-3 text-left font-semibold text-slate-500">
                        No.
                      </th>
                      {Object.entries(columnMapping).map(([colIdx, target]) => (
                        <th
                          key={colIdx}
                          className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left font-semibold text-slate-500"
                        >
                          {getDbColumns().find((c) => c.key === target)
                            ?.label || target}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPreviewData.slice(0, 15).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-medium text-slate-400">
                          {rIdx + 1}
                        </td>
                        {Object.entries(columnMapping).map(([colIdx]) => (
                          <td
                            key={colIdx}
                            className="max-w-[220px] truncate px-3 py-2.5 text-slate-700"
                          >
                            {String(row[parseInt(colIdx)] || '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredPreviewData.length > 15 && (
                <p className="text-center text-xs text-slate-500">
                  {filteredPreviewData.length - 15} baris lainnya juga akan
                  diproses.
                </p>
              )}

              <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="ui-button ui-button-secondary justify-center sm:min-w-32"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={filteredPreviewData.length === 0}
                  className="ui-button justify-center bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-52"
                >
                  <UploadCloud size={16} aria-hidden="true" />
                  Import {filteredPreviewData.length} baris
                </button>
              </div>
            </div>
          )}

          {/* ──────────── STEP 4: Result ──────────── */}
          {step === 4 && (
            <div className="space-y-4">
              {importing ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-center shadow-sm">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
                    <LoaderCircle
                      size={30}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-slate-900">
                    Sedang memproses data
                  </h3>
                  <div className="mt-5 w-full max-w-md">
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                      <span className="text-slate-600">Progress</span>
                      <span
                        className="tabular-nums text-primary-700"
                        aria-live="polite"
                      >
                        {importProgress}%
                      </span>
                    </div>
                    <div
                      className="h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200"
                      role="progressbar"
                      aria-label="Progress import jadwal"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={importProgress}
                    >
                      <div
                        className="h-full rounded-full bg-primary-600 transition-[width] duration-300 ease-out"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-500" aria-live="polite">
                    {importProgressLabel}
                  </p>
                  <p className="mt-4 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                    Mohon tunggu, jangan tutup halaman ini
                  </p>
                </div>
              ) : (
                importResult && (
                  <div className="space-y-4">
                    <div
                      className={`rounded-xl border p-5 text-center ${
                        failureCount > 0
                          ? 'border-amber-200 bg-amber-50/70'
                          : 'border-emerald-200 bg-emerald-50/70'
                      }`}
                    >
                      <span
                        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm ${
                          failureCount > 0
                            ? 'bg-amber-500 shadow-amber-500/25'
                            : 'bg-emerald-500 shadow-emerald-500/25'
                        }`}
                      >
                        {failureCount > 0 ? (
                          <AlertCircle size={24} aria-hidden="true" />
                        ) : (
                          <Check
                            size={24}
                            strokeWidth={2.5}
                            aria-hidden="true"
                          />
                        )}
                      </span>
                      <h3
                        className={`mt-3 text-base font-semibold ${
                          failureCount > 0
                            ? 'text-amber-950'
                            : 'text-emerald-950'
                        }`}
                      >
                        {failureCount > 0
                          ? 'Import perlu diperiksa'
                          : 'Proses import selesai'}
                      </h3>
                      <p
                        className={`mt-1 text-sm ${
                          failureCount > 0
                            ? 'text-amber-800'
                            : 'text-emerald-800'
                        }`}
                      >
                        {importResult.errors.length > 0
                          ? unresolvedConflictCount > 0
                            ? 'Konflik ruangan dapat diperbaiki langsung di bawah. Kegagalan lainnya perlu diperbaiki pada sumber data sebelum import ulang.'
                            : 'Perbaiki kegagalan pada sumber data, lalu jalankan import kembali.'
                          : unresolvedConflictCount > 0
                            ? 'Baris tanpa masalah sudah diimport. Pilih ruangan pengganti untuk baris konflik langsung di bawah.'
                            : 'Ringkasan hasil pemrosesan file Anda.'}
                      </p>
                    </div>

                    {/* Batch tag info */}
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
                      <span className="font-medium text-slate-600">
                        ID Import:{' '}
                      </span>
                      <span className="font-mono">{importBatchTag}</span>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      <div className="rounded-xl border border-emerald-200 bg-white p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-emerald-600">
                          {importResult.inserted ?? importResult.success}
                        </div>
                        <div className="mt-1 text-xs font-medium text-slate-500">
                          Data baru
                        </div>
                      </div>
                      <div className="rounded-xl border border-blue-200 bg-white p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-blue-600">
                          {importResult.updated ?? 0}
                        </div>
                        <div className="mt-1 text-xs font-medium text-slate-500">
                          Diperbarui
                        </div>
                      </div>
                      <div className="rounded-xl border border-orange-200 bg-white p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-orange-600">
                          {importResult.deleted ?? 0}
                        </div>
                        <div className="mt-1 text-xs font-medium text-slate-500">
                          Data lama dibersihkan
                        </div>
                      </div>
                      <div className="rounded-xl border border-red-200 bg-white p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-red-600">
                          {failureCount}
                        </div>
                        <div className="mt-1 text-xs font-medium text-slate-500">
                          Perlu diperiksa
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-slate-600">
                          {importResult.skipped}
                        </div>
                        <div className="mt-1 text-xs font-medium text-slate-500">
                          Dilewati
                        </div>
                      </div>
                    </div>

                    {failureCount > 0 && (
                      <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-sky-900">
                            Laporan diagnosis tersedia
                          </p>
                          <p className="mt-1 text-xs leading-5 text-sky-700">
                            JSON berisi kode masalah, nomor baris, pesan, dan
                            data sumber agar kegagalan mudah ditelusuri.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadErrorReport}
                          className="ui-button shrink-0 justify-center border border-sky-300 bg-white text-sky-800 hover:bg-sky-100"
                        >
                          <Download size={15} aria-hidden="true" />
                          Unduh JSON
                        </button>
                      </div>
                    )}

                    {/* Editable room conflicts */}
                    {unresolvedConflictCount > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                          <AlertCircle size={17} aria-hidden="true" />
                          Konflik ruangan ({unresolvedConflictCount})
                        </p>
                        <p className="mt-1 text-xs leading-5 text-amber-800">
                          {importResult.strictSync
                            ? 'Baris tanpa konflik sudah diimport. Buka konflik, pilih ruangan yang tersedia, lalu periksa dan gunakan pilihan. Konflik yang belum diperbaiki tidak ikut diinput.'
                            : 'Buka setiap konflik, ubah datanya, lalu pilih Periksa perubahan. Tombol Simpan aktif setelah tidak ada konflik. Pilih Lewati jika data tidak perlu diimpor.'}
                        </p>

                        <div className="mt-3 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                          {importResult.conflicts.map((conflict) => {
                            const roomField =
                              jenis === 'perkuliahan'
                                ? 'ruangan_id'
                                : 'nama_ruangan';
                            const isResolving =
                              resolvingConflictId === conflict.id;
                            const isChecking =
                              checkingConflictId === conflict.id;
                            const isExpanded = expandedConflictIds.includes(
                              conflict.id
                            );
                            const roomOptions =
                              allRuangan.length > 0
                                ? allRuangan
                                : options.ruangan || [];
                            const conflictDetails = getConflictDetails(
                              conflict.record
                            );
                            const activityDetail = conflictDetails.find(
                              (detail) => detail.label === 'Kegiatan'
                            );
                            const selectedRoom = roomOptions.find(
                              (room) =>
                                String(room.id) ===
                                String(conflict.record[roomField])
                            );
                            const roomAvailability =
                              roomAvailabilityByConflict[conflict.id];
                            const isBusy = isChecking || isResolving;

                            return (
                              <div
                                key={conflict.id}
                                className="overflow-hidden rounded-lg border border-amber-200 bg-white shadow-sm"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleConflict(conflict.id)}
                                  aria-expanded={isExpanded}
                                  className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-amber-50/70"
                                >
                                  <span className="min-w-0">
                                    <span className="block text-xs font-semibold text-slate-900">
                                      Baris {conflict.rowNumber} ·{' '}
                                      {activityDetail?.value ||
                                        jenisLabels[jenis]}
                                    </span>
                                    <span className="mt-1 block truncate text-[11px] text-slate-600">
                                      {conflict.record.mulai_jadwal
                                        ? new Date(
                                            conflict.record.mulai_jadwal
                                          ).toLocaleString('id-ID', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })
                                        : 'Waktu belum tersedia'}
                                      {' · '}
                                      {selectedRoom?.nama_ruangan ||
                                        (usesPhysicalRoom(
                                          conflict.record.jenis_pertemuan
                                        )
                                          ? 'Ruangan belum dipilih'
                                          : 'Daring')}
                                    </span>
                                  </span>
                                  <span className="flex shrink-0 items-center gap-2">
                                    <span
                                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                        conflict.verificationStatus === 'ready'
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : conflict.verificationStatus ===
                                              'idle'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-red-100 text-red-700'
                                      }`}
                                    >
                                      {conflict.verificationStatus === 'ready'
                                        ? 'Siap disimpan'
                                        : conflict.verificationStatus === 'idle'
                                          ? 'Belum diperiksa'
                                          : 'Masih konflik'}
                                    </span>
                                    <ChevronDown
                                      size={17}
                                      aria-hidden="true"
                                      className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    />
                                  </span>
                                </button>

                                {isExpanded && (
                                  <div className="border-t border-amber-100 p-3">
                                    <p className="text-xs font-semibold text-red-700">
                                      Konflik awal: {conflict.message}
                                    </p>

                                    <div className="mt-3 grid gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
                                      {conflictDetails.map((detail) => (
                                        <div
                                          key={detail.label}
                                          className={
                                            detail.label === 'Kegiatan'
                                              ? 'sm:col-span-2'
                                              : undefined
                                          }
                                        >
                                          <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                            {detail.label}
                                          </span>
                                          <span className="mt-0.5 block text-xs font-medium text-slate-800">
                                            {detail.value}
                                          </span>
                                        </div>
                                      ))}
                                    </div>

                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                      <label className="text-xs font-medium text-slate-700">
                                        Mulai
                                        <input
                                          type="datetime-local"
                                          value={
                                            conflict.record.mulai_jadwal?.slice(
                                              0,
                                              16
                                            ) || ''
                                          }
                                          onChange={(event) =>
                                            handleConflictChange(
                                              conflict.id,
                                              'mulai_jadwal',
                                              event.target.value
                                            )
                                          }
                                          className="ui-field mt-1 w-full text-xs"
                                        />
                                      </label>
                                      <label className="text-xs font-medium text-slate-700">
                                        Selesai
                                        <input
                                          type="datetime-local"
                                          value={
                                            conflict.record.akhir_jadwal?.slice(
                                              0,
                                              16
                                            ) || ''
                                          }
                                          onChange={(event) =>
                                            handleConflictChange(
                                              conflict.id,
                                              'akhir_jadwal',
                                              event.target.value
                                            )
                                          }
                                          className="ui-field mt-1 w-full text-xs"
                                        />
                                      </label>
                                      <label className="text-xs font-medium text-slate-700">
                                        Jenis pertemuan
                                        <select
                                          value={
                                            conflict.record.jenis_pertemuan ||
                                            'luring'
                                          }
                                          onChange={(event) =>
                                            handleConflictChange(
                                              conflict.id,
                                              'jenis_pertemuan',
                                              event.target.value
                                            )
                                          }
                                          onFocus={() =>
                                            handleLoadRoomAvailability(
                                              conflict.id
                                            )
                                          }
                                          className="ui-field mt-1 w-full text-xs"
                                        >
                                          <option value="luring">Luring</option>
                                          <option value="hybrid">Hybrid</option>
                                          <option value="daring">Daring</option>
                                        </select>
                                      </label>
                                      <label className="text-xs font-medium text-slate-700">
                                        Ruangan
                                        <select
                                          value={
                                            conflict.record[roomField] == null
                                              ? ''
                                              : String(
                                                  conflict.record[roomField]
                                                )
                                          }
                                          onChange={(event) =>
                                            handleConflictChange(
                                              conflict.id,
                                              roomField,
                                              event.target.value || null
                                            )
                                          }
                                          onFocus={() =>
                                            handleLoadRoomAvailability(
                                              conflict.id
                                            )
                                          }
                                          disabled={
                                            !usesPhysicalRoom(
                                              conflict.record.jenis_pertemuan
                                            )
                                          }
                                          className="ui-field mt-1 w-full text-xs disabled:bg-slate-100"
                                        >
                                          <option value="">
                                            Tanpa ruangan
                                          </option>
                                          {roomOptions.map((room) => {
                                            const occupancy =
                                              roomAvailability?.occupied?.[
                                                String(room.id)
                                              ];
                                            return (
                                              <option
                                                key={room.id}
                                                value={room.id}
                                                disabled={Boolean(occupancy)}
                                              >
                                                {room.nama_ruangan}
                                                {roomAvailability?.loading
                                                  ? ' — Memeriksa...'
                                                  : occupancy
                                                    ? ` — Sedang dipakai (${occupancy.label})`
                                                    : roomAvailability
                                                      ? ' — ✓ Tersedia'
                                                      : ''}
                                              </option>
                                            );
                                          })}
                                        </select>
                                        {roomAvailability?.loading && (
                                          <span className="mt-1 block text-[11px] text-blue-600">
                                            Memeriksa seluruh ruangan pada waktu
                                            tersebut...
                                          </span>
                                        )}
                                        {roomAvailability?.error && (
                                          <span className="mt-1 block text-[11px] text-red-600">
                                            {roomAvailability.error}
                                          </span>
                                        )}
                                        {roomAvailability &&
                                          !roomAvailability.loading &&
                                          !roomAvailability.error && (
                                            <span className="mt-1 block text-[11px] text-slate-500">
                                              Ruangan bertanda tersedia dapat
                                              dipilih; ruangan terpakai
                                              dinonaktifkan.
                                            </span>
                                          )}
                                      </label>
                                    </div>

                                    {conflict.verificationMessage && (
                                      <p
                                        className={`mt-3 rounded-lg border px-3 py-2 text-xs font-medium ${
                                          conflict.verificationStatus ===
                                          'ready'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-red-200 bg-red-50 text-red-700'
                                        }`}
                                      >
                                        {conflict.verificationMessage}
                                      </p>
                                    )}

                                    {conflict.saveError && (
                                      <p className="mt-2 text-xs font-medium text-red-700">
                                        {conflict.saveError}
                                      </p>
                                    )}

                                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                                      {!importResult.strictSync && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSkipConflict(conflict.id)
                                          }
                                          disabled={isBusy}
                                          className="ui-button ui-button-secondary justify-center text-xs"
                                        >
                                          Lewati
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleCheckConflict(conflict.id)
                                        }
                                        disabled={isBusy}
                                        className="ui-button justify-center border border-blue-200 bg-blue-50 text-xs text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                                      >
                                        {isChecking
                                          ? 'Memeriksa...'
                                          : 'Periksa perubahan'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRetryConflict(conflict.id)
                                        }
                                        disabled={
                                          isBusy ||
                                          conflict.verificationStatus !==
                                            'ready'
                                        }
                                        className="ui-button justify-center bg-emerald-600 text-xs text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        {isResolving
                                          ? importResult.strictSync
                                            ? 'Menerapkan...'
                                            : 'Menyimpan...'
                                          : importResult.strictSync
                                            ? 'Gunakan ruangan'
                                            : 'Simpan'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Error details */}
                    {importResult.errors.length > 0 && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-800">
                          <AlertCircle size={17} aria-hidden="true" />
                          Kegagalan lainnya
                        </p>
                        <div className="max-h-40 space-y-1 overflow-y-auto text-xs leading-5 text-red-700">
                          {importResult.errors.map((err, idx) => (
                            <div key={idx}>• {err}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="ui-button ui-button-secondary justify-center"
                      >
                        <RotateCcw size={15} aria-hidden="true" />
                        Import Lagi
                      </button>
                      {!importResult.strictSync &&
                        (importResult.inserted ?? importResult.success) > 0 && (
                          <button
                            type="button"
                            onClick={handleUndo}
                            disabled={undoing}
                            className="ui-button justify-center border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            {undoing
                              ? 'Membatalkan...'
                              : `↩ Batalkan Insert (${importResult.inserted ?? importResult.success} data baru)`}
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={handleClose}
                        className="ui-button ui-button-primary justify-center sm:min-w-28"
                      >
                        Selesai
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
