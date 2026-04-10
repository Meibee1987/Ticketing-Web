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
import { useState, useRef, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
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
  selesai: '_waktu_selesai',
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
  const getColumnMap = () => {
    if (jenis === 'perkuliahan') return PERKULIAHAN_MAP;
    if (jenis === 'karya_akhir') return KARYA_AKHIR_MAP;
    return LAIN_LAIN_MAP;
  };

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
    const colMap = getColumnMap();
    const autoMapping = {};
    headers.forEach((header, idx) => {
      const key = header.toLowerCase().trim();
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

    setColumnMapping(autoMapping);

    // Auto-detect date column (look for "tanggal", "date", or date-like content)
    const dateIdx = headers.findIndex((h) => {
      const l = h.toLowerCase();
      return l.includes('tanggal') || l.includes('date') || l.includes('hari');
    });
    if (dateIdx >= 0) setDateColumn(String(dateIdx));

    setStep(2);
  }, [workbook, selectedSheet, jenis]);

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
  }, [options]);

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

    // Collect multi-column targets per row
    const multiColTargets = [
      '_lookup_dosen_extra',
      '_lookup_dosen_ka',
      '_lookup_penguji',
    ];

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
              const aid = lookups.angkatanByName[val.toLowerCase().trim()];
              record.id_angkatan = aid || null;
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
      const { error, count } = await supabase
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Import Jadwal {jenisLabels[jenis]}
            </h3>
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
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 text-xl"
          >
            &times;
          </button>
        </div>

        <div className="p-6">
          {/* ──────────── STEP 1: Upload File ──────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors">
                <svg
                  className="mx-auto h-12 w-12 text-slate-400 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-sm text-slate-600 mb-3">
                  Upload file <strong>.xlsx</strong>, <strong>.xls</strong>,
                  atau <strong>.csv</strong>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="block mx-auto text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              {file && sheetNames.length > 0 && (
                <div className="space-y-3 bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-500">&#10003;</span>
                    <span className="font-medium text-slate-700">
                      {file.name}
                    </span>
                    <span className="text-slate-400">
                      ({sheetNames.length} sheet)
                    </span>
                  </div>

                  {sheetNames.length > 1 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Pilih Sheet:
                      </label>
                      <select
                        value={selectedSheet}
                        onChange={(e) => setSelectedSheet(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      >
                        {sheetNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={handleReadSheet}
                    className="w-full px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                  >
                    Baca File &rarr;
                  </button>
                </div>
              )}

              {/* Guide */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">Format yang didukung:</p>
                <ul className="list-disc ml-4 space-y-0.5">
                  <li>File Excel (.xlsx/.xls) — bisa pilih sheet</li>
                  <li>File CSV (.csv) — langsung diproses</li>
                  <li>
                    Baris pertama (header) akan digunakan sebagai nama kolom
                  </li>
                  <li>
                    Kolom akan di-mapping otomatis berdasarkan nama header
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* ──────────── STEP 2: Column Mapping ──────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Cocokkan kolom dari file Anda ke kolom database. Kolom yang
                sudah terdeteksi otomatis ditandai.
              </p>

              {/* Date column selector */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Kolom Tanggal (untuk menentukan tanggal jadwal):
                </label>
                <select
                  value={dateColumn}
                  onChange={(e) => setDateColumn(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg bg-white"
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
                <p className="text-xs text-amber-600 mt-1">
                  Jika spreadsheet menggunakan baris section header seperti
                  "Selasa, 27 Januari 2026", biarkan kosong.
                </p>
              </div>

              {/* Column mapping table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="py-2 px-3 text-left font-medium text-slate-600 border">
                        Kolom File
                      </th>
                      <th className="py-2 px-3 text-left font-medium text-slate-600 border">
                        Contoh Data
                      </th>
                      <th className="py-2 px-3 text-left font-medium text-slate-600 border">
                        Map ke →
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewHeaders.map((header, idx) => (
                      <tr
                        key={idx}
                        className={`border-b ${columnMapping[idx] ? 'bg-green-50' : ''}`}
                      >
                        <td className="py-2 px-3 border font-medium text-slate-700">
                          {header || (
                            <span className="text-slate-400">(kosong)</span>
                          )}
                        </td>
                        <td className="py-2 px-3 border text-slate-500 text-xs max-w-[200px] truncate">
                          {previewData.length > 0
                            ? String(previewData[0][idx] || '-')
                            : '-'}
                        </td>
                        <td className="py-2 px-3 border">
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
                            className={`w-full px-2 py-1 text-xs border rounded ${columnMapping[idx] ? 'border-green-400 bg-green-50' : 'border-slate-300'}`}
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

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  &larr; Kembali
                </button>
                <button
                  onClick={handlePreview}
                  disabled={Object.keys(columnMapping).length === 0}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Preview Data &rarr;
                </button>
              </div>
            </div>
          )}

          {/* ──────────── STEP 3: Preview & Confirm ──────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  <strong>{previewData.length}</strong> baris data akan diimport
                  ke tabel <strong>jadwal_{jenis}</strong>
                </p>
                <span className="text-xs text-slate-400">
                  (Data kosong akan diskip otomatis)
                </span>
              </div>

              {/* Preview table - first 10 rows */}
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0">
                    <tr className="bg-slate-100">
                      <th className="py-2 px-2 border text-slate-600">#</th>
                      {Object.entries(columnMapping).map(([colIdx, target]) => (
                        <th
                          key={colIdx}
                          className="py-2 px-2 border text-slate-600 whitespace-nowrap"
                        >
                          {getDbColumns().find((c) => c.key === target)
                            ?.label || target}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 15).map((row, rIdx) => (
                      <tr key={rIdx} className="border-b hover:bg-slate-50">
                        <td className="py-1 px-2 border text-slate-400">
                          {rIdx + 1}
                        </td>
                        {Object.entries(columnMapping).map(
                          ([colIdx, target]) => (
                            <td
                              key={colIdx}
                              className="py-1 px-2 border text-slate-700 max-w-[150px] truncate"
                            >
                              {String(row[parseInt(colIdx)] || '-')}
                            </td>
                          )
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewData.length > 15 && (
                <p className="text-xs text-slate-400 text-center">
                  ...dan {previewData.length - 15} baris lainnya
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  &larr; Kembali
                </button>
                <button
                  onClick={handleImport}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  Import {previewData.length} Baris
                </button>
              </div>
            </div>
          )}

          {/* ──────────── STEP 4: Result ──────────── */}
          {step === 4 && (
            <div className="space-y-4">
              {importing ? (
                <div className="flex flex-col items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4" />
                  <p className="text-sm text-slate-600">
                    Mengimport data ke database...
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Mohon tunggu, jangan tutup halaman ini
                  </p>
                </div>
              ) : (
                importResult && (
                  <div className="space-y-4">
                    {/* Batch tag info */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-500">
                      <span className="font-medium text-slate-600">
                        ID Import:{' '}
                      </span>
                      <span className="font-mono">{importBatchTag}</span>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {importResult.inserted ?? importResult.success}
                        </div>
                        <div className="text-xs text-green-700">
                          Baru (Insert)
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {importResult.updated ?? 0}
                        </div>
                        <div className="text-xs text-blue-700">
                          Diperbarui (Update)
                        </div>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {importResult.errors.length}
                        </div>
                        <div className="text-xs text-red-700">Gagal</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-slate-600">
                          {importResult.skipped}
                        </div>
                        <div className="text-xs text-slate-700">Diskip</div>
                      </div>
                    </div>

                    {/* Error details */}
                    {importResult.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-red-700 mb-2">
                          Detail Error:
                        </p>
                        <div className="max-h-[150px] overflow-y-auto text-xs text-red-600 space-y-1">
                          {importResult.errors.map((err, idx) => (
                            <div key={idx}>• {err}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleReset}
                        className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        Import Lagi
                      </button>
                      {(importResult.inserted ?? importResult.success) > 0 && (
                        <button
                          onClick={handleUndo}
                          disabled={undoing}
                          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-60"
                        >
                          {undoing
                            ? 'Membatalkan...'
                            : `↩ Batalkan Insert (${importResult.inserted ?? importResult.success} data baru)`}
                        </button>
                      )}
                      <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
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
