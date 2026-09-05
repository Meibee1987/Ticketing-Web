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
  Database,
  FileSpreadsheet,
  Info,
  LoaderCircle,
  RotateCcw,
  UploadCloud,
  X,
} from 'lucide-react';
import { supabase } from '../supabaseClient';

// ================================================================================
// COLUMN MAPPING: Spreadsheet Header → Database Column
// ================================================================================

// Mapping kolom spreadsheet (case-insensitive) ke kolom DB
const PERKULIAHAN_MAP = {
  // Header spreadsheet → kolom database
  // Angkatan
  angkatan: '_lookup_angkatan',
  // Mata Kuliah (by code or name)
  'matakuliah h': '_lookup_matkul_kode',
  'matakuliah h (kode)': '_lookup_matkul_kode',
  kode_mata_kuliah: '_lookup_matkul_kode',
  'kode mata kuliah': '_lookup_matkul_kode',
  'mata kuliah': '_lookup_matkul',
  'mata kuliah (nama)': '_lookup_matkul',
  agenda: '_lookup_matkul',
  'mahasiswa/mata kuliah': '_lookup_matkul',
  matakuliah: '_lookup_matkul',
  mata_kuliah: '_lookup_matkul',
  konsentrasi: '_lookup_matkul', // Kolom Konsentrasi diperlakukan sebagai Mata Kuliah
  // Numerik
  paralel: 'paralel',
  'real perkuliahan': 'real_perkuliahan',
  real_perkuliahan: 'real_perkuliahan',
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
  zoom_id: 'zoom_id',
  'zoom password': 'zoom_password',
  zoom_password: 'zoom_password',
  // Dosen
  'dosen pengampu': '_lookup_dosen1',
  'dosen 1': '_lookup_dosen1',
  dosen1: '_lookup_dosen1',
  dosen: '_lookup_dosen1',
  id_dosen: '_lookup_dosen1',
  'id dosen': '_lookup_dosen1',
  'dosen 2': '_lookup_dosen_extra',
  dosen2: '_lookup_dosen_extra',
  'dosen 3': '_lookup_dosen_extra',
  dosen3: '_lookup_dosen_extra',
  'dosen 4': '_lookup_dosen_extra',
  dosen4: '_lookup_dosen_extra',
  moderator: 'moderator',
  'penguji 1': '_lookup_penguji',
  penguji1: '_lookup_penguji',
  'penguji 2': '_lookup_penguji',
  penguji2: '_lookup_penguji',
  'pintang/sps': 'pintang_sps',
  pintang_sps: 'pintang_sps',
  // Catatan
  catatan: 'note',
  note: 'note',
};

const KARYA_AKHIR_MAP = {
  mahasiswa: 'nama_mahasiswa',
  'nama mahasiswa': 'nama_mahasiswa',
  nama_mahasiswa: 'nama_mahasiswa',
  jam: '_parse_jam',
  waktu: '_parse_jam',
  mulai: '_waktu_mulai',
  'waktu mulai': '_waktu_mulai',
  selesai: '_waktu_selesai',
  'waktu selesai': '_waktu_selesai',
  status: '_parse_jenis_pertemuan',
  'jenis pertemuan': '_parse_jenis_pertemuan',
  ruangan: '_lookup_ruangan',
  agenda: '_lookup_agenda',
  'petugas zoom': 'petugas_zoom',
  petugas_zoom: 'petugas_zoom',
  'id - password': '_parse_zoom_info',
  'zoom id': 'zoom_id',
  'zoom password': 'zoom_password',
  'dosen 1': '_lookup_dosen_ka',
  dosen1: '_lookup_dosen_ka',
  dosen: '_lookup_dosen_ka',
  'dosen 2': '_lookup_dosen_ka',
  dosen2: '_lookup_dosen_ka',
  'dosen 3': '_lookup_dosen_ka',
  'dosen 4': '_lookup_dosen_ka',
  moderator: 'moderator',
  'penguji 1': '_lookup_penguji',
  penguji1: '_lookup_penguji',
  'penguji 2': '_lookup_penguji',
  penguji2: '_lookup_penguji',
  'pintang/sps': 'pintang_sps',
  catatan: 'note',
  note: 'note',
};

const LAIN_LAIN_MAP = {
  'nama user': 'nama_user',
  nama_user: 'nama_user',
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
  'zoom password': 'zoom_password',
  catatan: 'note',
  note: 'note',
};

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
  if (lower.includes('daring') || lower.includes('online')) return 'daring';
  if (lower.includes('hybrid')) return 'hybrid';
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

// Excel serial date → JS Date
function excelDateToJS(serial) {
  if (serial instanceof Date) return serial;
  if (typeof serial === 'number') {
    // Excel serial → local date (avoid UTC timezone shift)
    const utcDays = Math.floor(serial - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    // Compensate: create local date to avoid timezone offset
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  // Try to parse Indonesian date string like "2 Maret 2026"
  const str = String(serial).trim();
  const idMatch = str.match(
    /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i
  );
  if (idMatch) {
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
    return new Date(
      parseInt(idMatch[3]),
      monthMap[idMatch[2].toLowerCase()],
      parseInt(idMatch[1])
    );
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// Format Date to 'YYYY-MM-DD' string using local timezone
function dateToLocalStr(d) {
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
  const [step, setStep] = useState(1); // 1=upload, 2=mapping, 3=preview, 4=importing
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [importBatchTag, setImportBatchTag] = useState('');
  const [allRuangan, setAllRuangan] = useState([]);
  const fileInputRef = useRef(null);

  // Fetch semua ruangan (tanpa filter aktif) untuk keperluan import lookup
  useEffect(() => {
    supabase
      .from('ruangan')
      .select('id, nama_ruangan')
      .then(({ data }) => {
        if (data) setAllRuangan(data);
      });
  }, []);

  // Get the right column map based on jenis
  const columnMap = useMemo(() => {
    if (jenis === 'perkuliahan') return PERKULIAHAN_MAP;
    if (jenis === 'karya_akhir') return KARYA_AKHIR_MAP;
    return LAIN_LAIN_MAP;
  }, [jenis]);

  // DB columns per type
  const getDbColumns = () => {
    if (jenis === 'perkuliahan') {
      return [
        { key: '_lookup_angkatan', label: 'Angkatan' },
        { key: '_lookup_matkul_kode', label: 'Kode Mata Kuliah' },
        { key: '_lookup_matkul', label: 'Nama Mata Kuliah' },
        { key: 'paralel', label: 'Paralel' },
        { key: 'real_perkuliahan', label: 'Pertemuan / Real' },
        { key: '_parse_jam', label: 'Waktu (Mulai - Selesai)' },
        { key: '_waktu_mulai', label: 'Jam Mulai' },
        { key: '_waktu_selesai', label: 'Jam Selesai' },
        { key: '_parse_jenis_pertemuan', label: 'Pelaksanaan (Luring/Daring)' },
        { key: '_lookup_ruangan', label: 'Ruangan' },
        { key: 'petugas_zoom', label: 'Petugas Zoom' },
        { key: '_parse_zoom_info', label: 'Link / Zoom Info' },
        { key: '_lookup_dosen1', label: 'Dosen Pengampu' },
        { key: '_lookup_dosen_extra', label: 'Dosen Tambahan (2,3,4)' },
        { key: 'moderator', label: 'Moderator' },
        { key: '_lookup_penguji', label: 'Penguji' },
        { key: 'pintang_sps', label: 'Pintang/SPs' },
        { key: 'note', label: 'Catatan' },
      ];
    }
    if (jenis === 'karya_akhir') {
      return [
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
  const handleReadSheet = useCallback(() => {
    if (!workbook || !selectedSheet) return;
    const ws = workbook.Sheets[selectedSheet];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (jsonData.length < 2) {
      alert('Sheet kosong atau tidak memiliki data.');
      return;
    }

    // Find header row (first row with multiple non-empty cells)
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
      const nonEmpty = jsonData[i].filter((c) => c !== '' && c != null).length;
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

    // Auto-map columns
    const colMap = columnMap;
    const autoMapping = {};
    headers.forEach((header, idx) => {
      const key = header.toLowerCase().trim();
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
          target === '_lookup_penguji'
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
            : 'nama_user';
    }

    setColumnMapping(autoMapping);

    // Auto-detect date column, including the combined Indonesian date/time
    // produced by Download Jadwal Admin (for example 26 Agustus 2026, 08.00).
    const dateIdx = headers.findIndex((h, idx) => {
      const l = h.toLowerCase();
      if (
        l.includes('tanggal') ||
        l.includes('date') ||
        l.includes('hari') ||
        l.includes('waktu mulai')
      ) {
        return true;
      }

      return rows
        .slice(0, 5)
        .some((row) => row[idx] && excelDateToJS(row[idx]) instanceof Date);
    });
    if (dateIdx >= 0) setDateColumn(String(dateIdx));

    setStep(2);
  }, [workbook, selectedSheet, columnMap, jenis]);

  // ──────────── STEP 2→3: Preview mapped data ────────────
  const handlePreview = () => setStep(3);

  // ──────────── Build lookup maps ────────────
  const buildLookups = useCallback(() => {
    const dosenByName = {};
    const dosenByIdDosen = {};
    (options.dosen || []).forEach((d) => {
      dosenByName[d.nama_dosen.toLowerCase().trim()] = d.id;
      if (d.id_dosen) dosenByIdDosen[d.id_dosen.toLowerCase().trim()] = d.id;
    });
    const ruanganByName = {};
    // Gunakan allRuangan (semua, tanpa filter aktif) agar ruangan non-aktif tetap bisa di-import
    const ruanganSource =
      allRuangan.length > 0 ? allRuangan : options.ruangan || [];
    ruanganSource.forEach((r) => {
      ruanganByName[r.nama_ruangan.toLowerCase().trim()] = r.id;
    });
    const matkulByName = {};
    const matkulByKode = {};
    (options.mataKuliah || []).forEach((m) => {
      const name = (m.mata_kuliah || m.nama_matkul || '').toLowerCase().trim();
      if (name) matkulByName[name] = m.id;
      const kode = (m.kode_mata_kuliah || '').toLowerCase().trim();
      if (kode) matkulByKode[kode] = m.id;
    });
    const angkatanByName = {};
    (options.angkatan || []).forEach((a) => {
      angkatanByName[a.nama_angkatan.toLowerCase().trim()] = a.id;
    });
    const agendaByName = {};
    (options.agenda || []).forEach((a) => {
      agendaByName[a.agenda_karya_akhir.toLowerCase().trim()] = a.id;
    });
    return {
      dosenByName,
      dosenByIdDosen,
      ruanganByName,
      matkulByName,
      matkulByKode,
      angkatanByName,
      agendaByName,
    };
  }, [options, allRuangan]);

  // Fuzzy lookup by name (exact first, then contains match)
  const fuzzyLookup = (name, map) => {
    if (!name) return null;
    const lower = String(name).toLowerCase().trim();
    if (!lower || lower === '-') return null;
    // Exact match first
    if (map[lower]) return map[lower];
    // Contains match
    for (const [key, id] of Object.entries(map)) {
      if (key.includes(lower) || lower.includes(key)) return id;
    }
    return null;
  };
  const findDosen = (name, dosenByName, dosenByIdDosen) => {
    if (!name) return null;
    const val = String(name).toLowerCase().trim();
    if (!val || val === '-') return null;
    // Try id_dosen match first (most reliable)
    if (dosenByIdDosen && dosenByIdDosen[val]) return dosenByIdDosen[val];
    // Fallback to name lookup
    return fuzzyLookup(name, dosenByName);
  };

  // ──────────── STEP 3: Import to DB ────────────
  const handleImport = async () => {
    setImporting(true);
    setStep(4);

    // Generate unique batch tag for this import session
    const batchTag = `${userName || 'Import'}-${new Date().toISOString().replace('T', ' ').substring(0, 19)}`;
    setImportBatchTag(batchTag);

    const lookups = buildLookups();
    console.log('[Import] Column mapping:', columnMapping);
    console.log(
      '[Import] Matkul lookup keys:',
      Object.keys(lookups.matkulByName)
    );
    console.log(
      '[Import] Ruangan lookup keys:',
      Object.keys(lookups.ruanganByName)
    );
    const results = {
      success: 0,
      inserted: 0,
      updated: 0,
      errors: [],
      skipped: 0,
    };
    const tableName =
      jenis === 'perkuliahan'
        ? 'jadwal_perkuliahan'
        : jenis === 'karya_akhir'
          ? 'jadwal_karya_akhir'
          : 'jadwal_lain_lain';

    // Group column mapping by target
    const mappingByTarget = {};
    Object.entries(columnMapping).forEach(([colIdx, target]) => {
      if (!mappingByTarget[target]) mappingByTarget[target] = [];
      mappingByTarget[target].push(parseInt(colIdx));
    });

    let rowDate = null; // running date for grouped rows

    for (let rowIdx = 0; rowIdx < previewData.length; rowIdx++) {
      const row = previewData[rowIdx];
      try {
        // Skip empty rows
        const nonEmpty = row.filter((c) => c !== '' && c != null).length;
        if (nonEmpty < 2) {
          results.skipped++;
          continue;
        }

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

        const record = {};
        let jamStr = null;
        let waktuMulai = null;
        let waktuSelesai = null;
        let dosenExtraIds = [];
        let dosenKaIds = [];
        let pengujiIds = [];

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
            case 'agenda':
              record[target] = val;
              break;
            case 'paralel':
            case 'real_perkuliahan':
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
              break;
            case '_lookup_angkatan': {
              const angkatanIds = val
                .split(/[,;|]/)
                .map((name) => fuzzyLookup(name, lookups.angkatanByName))
                .filter(Boolean)
                .slice(0, 3);
              record.id_angkatan = angkatanIds[0] || null;
              if (angkatanIds.length) record.id_angkatans = angkatanIds;
              break;
            }
            case '_lookup_ruangan': {
              const rid = fuzzyLookup(val, lookups.ruanganByName);
              if (jenis === 'perkuliahan') record.ruangan_id = rid || null;
              else record.nama_ruangan = rid || null;
              if (!rid)
                console.warn(`[Import] Ruangan tidak ditemukan: "${val}"`);
              break;
            }
            case '_lookup_matkul': {
              // Lookup by name, but only if not already set by kode
              if (!record.id_mata_kuliah) {
                const mid = fuzzyLookup(val, lookups.matkulByName);
                record.id_mata_kuliah = mid || null;
                if (!mid)
                  console.warn(
                    `[Import] Mata Kuliah tidak ditemukan: "${val}"`
                  );
              }
              break;
            }
            case '_lookup_matkul_kode': {
              const mid = fuzzyLookup(val, lookups.matkulByKode);
              if (mid) record.id_mata_kuliah = mid;
              else
                console.warn(
                  `[Import] Kode Mata Kuliah tidak ditemukan: "${val}"`
                );
              break;
            }
            case '_lookup_agenda': {
              const aid = lookups.agendaByName[val.toLowerCase().trim()];
              record.agenda_jadwal_karya_akhir = aid || null;
              break;
            }
            case '_lookup_dosen1': {
              const did = findDosen(
                val,
                lookups.dosenByName,
                lookups.dosenByIdDosen
              );
              record.dosen_id = did || null;
              break;
            }
            case '_lookup_dosen_extra': {
              const did = findDosen(
                val,
                lookups.dosenByName,
                lookups.dosenByIdDosen
              );
              if (did) dosenExtraIds.push(did);
              break;
            }
            case '_lookup_dosen_ka': {
              const did = findDosen(
                val,
                lookups.dosenByName,
                lookups.dosenByIdDosen
              );
              if (did) dosenKaIds.push(did);
              break;
            }
            case '_lookup_penguji': {
              const did = findDosen(
                val,
                lookups.dosenByName,
                lookups.dosenByIdDosen
              );
              if (did) pengujiIds.push(did);
              break;
            }
            case '_parse_zoom_info': {
              const zi = parseZoomInfo(val);
              if (zi.zoom_id) record.zoom_id = zi.zoom_id;
              if (zi.zoom_password) record.zoom_password = zi.zoom_password;
              break;
            }
            case 'zoom_id':
              record.zoom_id = val;
              break;
            case 'zoom_password':
              record.zoom_password = val;
              break;
            default:
              break;
          }
        });

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
          if (dosenKaIds.length) record.dosen_ids = JSON.stringify(dosenKaIds);
          if (pengujiIds.length)
            record.penguji_ids = JSON.stringify(pengujiIds);
        }

        // Set default jenis_pertemuan
        if (!record.jenis_pertemuan) record.jenis_pertemuan = 'luring';

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

        // Upsert logic: cek apakah data sudah ada → update, belum ada → insert
        let existingId = null;
        if (record.mulai_jadwal) {
          let matchQuery = supabase.from(tableName).select('id');
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
          const { data: existing } = await matchQuery.limit(1);
          existingId = existing?.[0]?.id || null;
        }

        let dbError;
        if (existingId) {
          // Data sudah ada → update (jangan timpa created_by)
          const updateRecord = { ...record };
          delete updateRecord.created_by;
          const { error } = await supabase
            .from(tableName)
            .update(updateRecord)
            .eq('id', existingId);
          dbError = error;
          if (!error) {
            results.updated++;
            results.success++;
          }
        } else {
          // Data belum ada → insert baru
          const { error } = await supabase.from(tableName).insert([record]);
          dbError = error;
          if (!error) {
            results.inserted++;
            results.success++;
          }
        }
        if (dbError) {
          results.errors.push(`Baris ${rowIdx + 1}: ${dbError.message}`);
        }
      } catch (err) {
        results.errors.push(`Baris ${rowIdx + 1}: ${err.message}`);
      }
    }

    setImportResult(results);
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
          description: `${results.updated} data duplikat ditemukan dan diperbarui dari file import oleh ${userName || 'User'}.`,
        });
      }
      if (results.errors.length > 0) {
        onNotify({
          type: 'error',
          tag: 'ERROR',
          title: `Import ${jenisLabel}: ${results.errors.length} Baris Gagal`,
          description:
            results.errors.slice(0, 3).join(' | ') +
            (results.errors.length > 3
              ? ` (+${results.errors.length - 3} lainnya)`
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
    setStep(1);
    setImportResult(null);
    setImporting(false);
    setUndoing(false);
    setImportBatchTag('');
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
  const steps = [
    { number: 1, label: 'Pilih file' },
    { number: 2, label: 'Mapping kolom' },
    { number: 3, label: 'Periksa data' },
    { number: 4, label: 'Hasil import' },
  ];
  const mappedColumnCount = Object.keys(columnMapping).length;
  const fileSize = file
    ? file.size < 1024 * 1024
      ? `${Math.max(1, Math.round(file.size / 1024))} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    : '';

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
                  ? 'Upload File'
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
                    Pilih file jadwal
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Pastikan baris pertama berisi nama kolom.
                  </p>
                </div>
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
                  Periksa kembali nama dosen dan referensi Master Data sebelum
                  menyimpan.
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
                  className="ui-field mt-3 w-full border-amber-300 bg-white text-sm"
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
                  Jika spreadsheet menggunakan baris section header seperti
                  "Selasa, 27 Januari 2026", biarkan kosong.
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
              <div className="rounded-xl border border-primary-200 bg-primary-50/70 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary-600 ring-1 ring-primary-200">
                    <Database size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Siap mengimpor {previewData.length} baris
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
                    {previewData.slice(0, 15).map((row, rIdx) => (
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

              {previewData.length > 15 && (
                <p className="text-center text-xs text-slate-500">
                  {previewData.length - 15} baris lainnya juga akan diproses.
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
                  className="ui-button justify-center bg-emerald-600 text-white hover:bg-emerald-700 sm:min-w-52"
                >
                  <UploadCloud size={16} aria-hidden="true" />
                  Import {previewData.length} baris
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
                  <p className="mt-1.5 text-sm text-slate-500">
                    Jadwal sedang disimpan ke database.
                  </p>
                  <p className="mt-4 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                    Mohon tunggu, jangan tutup halaman ini
                  </p>
                </div>
              ) : (
                importResult && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-center">
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/25">
                        <Check size={24} strokeWidth={2.5} aria-hidden="true" />
                      </span>
                      <h3 className="mt-3 text-base font-semibold text-emerald-950">
                        Proses import selesai
                      </h3>
                      <p className="mt-1 text-sm text-emerald-800">
                        Ringkasan hasil pemrosesan file Anda.
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
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                      <div className="rounded-xl border border-red-200 bg-white p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-red-600">
                          {importResult.errors.length}
                        </div>
                        <div className="mt-1 text-xs font-medium text-slate-500">
                          Gagal
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

                    {/* Error details */}
                    {importResult.errors.length > 0 && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-800">
                          <AlertCircle size={17} aria-hidden="true" />
                          Detail kegagalan
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
                      {(importResult.inserted ?? importResult.success) > 0 && (
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
