import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { parseImportIdList } from '../utils/scheduleImport';
import {
  SCHEDULE_REVIEW_CONFIG,
  processScheduleReviewImport,
} from '../services/scheduleImportReview';
import {
  reviewFields,
  reviewDate,
  reviewIssue,
  reviewIssueDetails,
  conflictingLecturerIds,
} from '../utils/scheduleReviewDisplay';

function ConflictBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
      Konflik
    </span>
  );
}

function ReviewIssues({ issues = [], dosen = [] }) {
  if (!issues.length) return null;
  const details = reviewIssueDetails(issues, dosen);
  const lecturerCount = conflictingLecturerIds(issues).length;
  const scheduleCount = details.filter(
    (issue) => issue.lecturers.length > 0 && issue.activity
  ).length;
  return (
    <div
      className="mt-3 space-y-3 text-sm text-amber-950"
      aria-label="Penyebab konflik"
    >
      {scheduleCount > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-100 p-3 font-medium leading-relaxed">
          {lecturerCount} dosen pada jadwal ini bentrok dengan {scheduleCount}{' '}
          jadwal lain. Nama yang muncul di beberapa benturan tetap dihitung
          sebagai satu dosen.
        </p>
      )}
      {details.map((issue, index) => (
        <section
          key={index}
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 leading-relaxed break-words"
        >
          <h4 className="font-semibold">
            Benturan {index + 1}: {issue.title}
          </h4>
          {issue.lecturers.length > 0 && (
            <>
              <p className="mt-2">
                Dosen yang juga terjadwal pada waktu bersamaan:
              </p>
              <ul className="mt-2 list-outside list-disc space-y-1 pl-5">
                {issue.lecturers.map((name, index) => (
                  <li key={index}>
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span>{name}</span>
                      <ConflictBadge />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {issue.activity && (
            <dl className="mt-3 space-y-1">
              {[
                ['Jadwal lain', issue.activity],
                [
                  'Tanggal',
                  issue.start.slice(0, 10) === issue.end.slice(0, 10)
                    ? issue.start.slice(0, 10)
                    : `${issue.start.slice(0, 10)} – ${issue.end.slice(0, 10)}`,
                ],
                ['Jam', `${issue.start.slice(11)} – ${issue.end.slice(11)}`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid gap-x-3 sm:grid-cols-[5rem_1fr]"
                >
                  <dt className="font-medium">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      ))}
    </div>
  );
}

function DosenPicker({
  label,
  value,
  options,
  onChange,
  displayKey = 'nama_dosen',
  maxSelections = 4,
  itemLabel = 'dosen',
  conflictIds = [],
}) {
  const ids = parseImportIdList(value);
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
        <select
          className="ui-input mt-1 w-full"
          value=""
          disabled={ids.length >= maxSelections}
          onChange={(event) => {
            if (event.target.value)
              onChange([...ids, Number(event.target.value)]);
          }}
        >
          <option value="">
            Tambah {itemLabel} (maks. {maxSelections})
          </option>
          {options
            .filter((dosen) => !ids.map(String).includes(String(dosen.id)))
            .map((dosen) => (
              <option key={dosen.id} value={dosen.id}>
                {dosen[displayKey]} · ID {dosen.id}
              </option>
            ))}
        </select>
      </label>
      <ul className="space-y-1">
        {ids.map((id) => (
          <li
            key={id}
            className={`flex items-center justify-between gap-2 text-sm ${conflictIds.includes(String(id)) ? 'rounded-lg border border-red-200 bg-red-50 p-2' : ''}`}
          >
            <span className="flex flex-wrap items-center gap-2">
              <span>
                {options.find((dosen) => String(dosen.id) === String(id))?.[
                  displayKey
                ] || `ID ${id}`}
              </span>
              {conflictIds.includes(String(id)) && <ConflictBadge />}
            </span>
            <button
              type="button"
              className="text-red-700 underline"
              onClick={() =>
                onChange(ids.filter((item) => String(item) !== String(id)))
              }
              aria-label={`Hapus ${itemLabel} ID ${id}`}
            >
              Hapus
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ScheduleImportReview({
  options,
  refreshKey,
  onActivated,
  jenis = 'karya_akhir',
}) {
  const config = SCHEDULE_REVIEW_CONFIG[jenis];
  const isKuliah = jenis === 'perkuliahan';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showOverrides, setShowOverrides] = useState(false);
  const [page, setPage] = useState(0);
  const [processingBatch, setProcessingBatch] = useState(null);
  const [resuming, setResuming] = useState(false);
  useEffect(() => {
    if (!selected) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !saving) setSelected(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [selected, saving]);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const allRows = [];
      for (let from = 0; ; from += 1000) {
        const { data, error: readError } = await supabase
          .from(config.table)
          .select('*')
          .in(
            'status',
            showOverrides
              ? ['active']
              : ['pending', 'invalid', 'conflict', 'source_changed']
          )
          .order('id', { ascending: true })
          .range(from, from + 999);
        if (readError) throw readError;
        allRows.push(...(data || []));
        if ((data || []).length < 1000) break;
      }
      const visible = showOverrides
        ? allRows.filter((row) => row.locally_modified)
        : allRows;
      setRows(visible);
      if (isKuliah) {
        const { data: latest, error: batchError } = await supabase
          .from('perkuliahan_import_batches')
          .select('id,processing_status')
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (batchError) throw batchError;
        setProcessingBatch(
          latest?.processing_status === 'processing' ? latest.id : null
        );
      }
      setSelected((current) =>
        current ? visible.find((row) => row.id === current.id) || null : null
      );
      setPage((current) =>
        Math.min(current, Math.max(0, Math.ceil(visible.length / 10) - 1))
      );
    } catch (readError) {
      setError(
        `Daftar pemeriksaan belum dapat dimuat: ${readError.message}. Pastikan migrasi ${config.label} terbaru sudah dijalankan.`
      );
    } finally {
      setLoading(false);
    }
  }, [showOverrides, config, isKuliah]);
  useEffect(() => {
    load();
  }, [load, refreshKey]);
  const fields = reviewFields(selected);
  const conflictIds = conflictingLecturerIds(selected?.issues);
  const activity = (payload) =>
    isKuliah
      ? options.mataKuliah?.find(
          (item) => String(item.id) === String(payload.id_mata_kuliah)
        )?.mata_kuliah || 'Mata kuliah belum dikenali'
      : options.agenda?.find(
          (item) =>
            String(item.id) === String(payload.agenda_jadwal_karya_akhir)
        )?.agenda_karya_akhir || 'Kegiatan belum dikenali';
  const change = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const open = (row) => {
    setSelected(row);
    setDraft(row.payload);
    setMessage('');
  };
  const resume = async () => {
    setResuming(true);
    setError('');
    try {
      const remaining = rows.filter(
        (row) => row.batch_id === processingBatch && row.status === 'pending'
      ).length;
      const result = await processScheduleReviewImport(
        supabase,
        {
          workflow_version: 3,
          batch_id: processingBatch,
          remaining,
          complete: false,
        },
        jenis
      );
      await load();
      if (result.error) setError(result.error.message);
      if (onActivated) onActivated();
    } finally {
      setResuming(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { data, error: saveError } = await supabase.rpc(config.reviewRpc, {
        p_id: selected.id,
        p_payload: draft,
        p_expected_updated_at: selected.updated_at,
      });
      if (saveError) throw saveError;
      if (data.activated) {
        setSelected(null);
        if (onActivated) onActivated();
      } else
        setMessage(
          'Perubahan tersimpan, tetapi belum aktif. Periksa rincian masalah di atas.'
        );
      await load();
    } catch (saveError) {
      setMessage(saveError.message);
    } finally {
      setSaving(false);
    }
  };
  const referenceSelect = (label, key, items, displayKey) => (
    <label className="block text-sm font-medium">
      {label}
      {key === 'dosen_id' && conflictIds.includes(String(draft[key])) && (
        <span className="ml-2">
          <ConflictBadge />
        </span>
      )}
      <select
        className="ui-input mt-1 w-full"
        value={draft[key] ?? ''}
        onChange={(event) =>
          change(key, event.target.value ? Number(event.target.value) : null)
        }
      >
        <option value="">Pilih {label.toLowerCase()}</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item[displayKey]}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section
      className="mb-5 rounded-xl border border-amber-200 bg-amber-50/50 p-4"
      aria-label={`Pemeriksaan import ${config.label}`}
    >
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
          <span>
            {showOverrides ? 'Koreksi lokal' : 'Perlu diperiksa'} ({rows.length}
            )
            {loading && (
              <span className="ml-2 text-xs font-normal">Memuat…</span>
            )}
            {error && (
              <span className="ml-2 text-xs text-red-700">Gagal dimuat</span>
            )}
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
          >
            <path
              d="m5 7.5 5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </summary>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-600">
              Data tersimpan. Perbaiki dan aktifkan tanpa import ulang. Data
              yang belum aktif tidak tampil di monitor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {processingBatch && !showOverrides && (
              <button
                type="button"
                className="ui-button ui-button-primary"
                disabled={resuming || loading}
                onClick={resume}
              >
                {resuming ? 'Pemeriksaan berjalan…' : 'Lanjutkan pemeriksaan'}
              </button>
            )}
            <button
              type="button"
              className="ui-button"
              disabled={resuming}
              onClick={() => {
                setSelected(null);
                setPage(0);
                setShowOverrides(!showOverrides);
              }}
            >
              {showOverrides ? 'Perlu diperiksa' : 'Lihat koreksi lokal'}
            </button>
            <button
              type="button"
              className="ui-button"
              onClick={load}
              disabled={loading || resuming}
            >
              Muat ulang
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading && (
          <p role="status" className="mt-3 text-sm">
            Memuat daftar pemeriksaan…
          </p>
        )}
        {!loading && !error && rows.length === 0 && (
          <p className="mt-3 text-sm text-slate-600">
            {showOverrides
              ? 'Belum ada koreksi lokal.'
              : 'Tidak ada data yang perlu diperiksa.'}
          </p>
        )}
        <div className="mt-3 space-y-2">
          {rows.slice(page * 10, page * 10 + 10).map((row) => (
            <article
              key={row.id}
              className="rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{activity(row.payload)}</p>
                  <p className="text-sm text-slate-600">
                    {reviewDate(row.payload.mulai_jadwal)}
                  </p>
                </div>
                <button
                  type="button"
                  className="ui-button"
                  disabled={resuming}
                  onClick={() => open(row)}
                >
                  Periksa
                </button>
              </div>
              <ReviewIssues issues={row.issues} dosen={options.dosen} />
            </article>
          ))}
        </div>
        {rows.length > 10 && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <button
              type="button"
              className="ui-button"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Sebelumnya
            </button>
            <span>
              {page + 1} / {Math.ceil(rows.length / 10)}
            </span>
            <button
              type="button"
              className="ui-button"
              disabled={(page + 1) * 10 >= rows.length}
              onClick={() => setPage(page + 1)}
            >
              Berikutnya
            </button>
          </div>
        )}
      </details>
      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-title"
        >
          <form
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-5 shadow-xl"
            onSubmit={submit}
          >
            <h3 id="review-title" className="text-lg font-semibold">
              Periksa jadwal {config.label}
            </h3>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed">
              <p className="font-semibold">Jadwal yang sedang diperiksa</p>
              <p>{activity(selected.payload)}</p>
              <p>
                {reviewIssue(
                  selected.payload.mulai_jadwal || 'Waktu mulai belum valid'
                )}
                {' – '}
                {reviewIssue(
                  selected.payload.akhir_jadwal || 'Waktu selesai belum valid'
                )}
              </p>
            </div>
            <ReviewIssues issues={selected.issues} dosen={options.dosen} />
            <fieldset
              disabled={saving}
              className="mt-4 grid gap-4 sm:grid-cols-2"
            >
              {fields.activity &&
                referenceSelect(
                  'Kegiatan',
                  isKuliah ? 'id_mata_kuliah' : 'agenda_jadwal_karya_akhir',
                  isKuliah ? options.mataKuliah || [] : options.agenda || [],
                  isKuliah ? 'mata_kuliah' : 'agenda_karya_akhir'
                )}
              {fields.student && !isKuliah && (
                <label className="text-sm font-medium">
                  Nama mahasiswa
                  <input
                    className="ui-input mt-1 w-full"
                    required
                    value={draft.nama_mahasiswa || ''}
                    onChange={(event) =>
                      change('nama_mahasiswa', event.target.value)
                    }
                  />
                </label>
              )}
              {fields.cohorts &&
                (isKuliah ? (
                  <>
                    <DosenPicker
                      label="Angkatan peserta"
                      value={draft.id_angkatans}
                      options={options.angkatan || []}
                      displayKey="nama_angkatan"
                      itemLabel="angkatan"
                      maxSelections={3}
                      onChange={(ids) =>
                        setDraft((current) => ({
                          ...current,
                          id_angkatans: ids,
                          id_angkatan: ids
                            .map(String)
                            .includes(String(current.id_angkatan))
                            ? current.id_angkatan
                            : (ids[0] ?? null),
                        }))
                      }
                    />
                    {referenceSelect(
                      'Angkatan utama',
                      'id_angkatan',
                      (options.angkatan || []).filter((item) =>
                        parseImportIdList(draft.id_angkatans)
                          .map(String)
                          .includes(String(item.id))
                      ),
                      'nama_angkatan'
                    )}
                  </>
                ) : (
                  referenceSelect(
                    'Angkatan',
                    'nama_angkatan',
                    options.angkatan || [],
                    'nama_angkatan'
                  )
                ))}
              {fields.time &&
                ['mulai_jadwal', 'akhir_jadwal'].map((key) => (
                  <label key={key} className="text-sm font-medium">
                    {key === 'mulai_jadwal' ? 'Mulai' : 'Selesai'}
                    <input
                      className="ui-input mt-1 w-full"
                      type="datetime-local"
                      required
                      value={(draft[key] || '').slice(0, 16)}
                      onChange={(event) =>
                        change(
                          key,
                          event.target.value ? event.target.value + ':00' : null
                        )
                      }
                    />
                  </label>
                ))}
              {fields.room &&
                referenceSelect(
                  'Ruangan',
                  isKuliah ? 'ruangan_id' : 'nama_ruangan',
                  options.ruangan || [],
                  'nama_ruangan'
                )}
              {fields.lecturers && (
                <>
                  {isKuliah &&
                    referenceSelect(
                      'Dosen pengampu utama',
                      'dosen_id',
                      options.dosen || [],
                      'nama_dosen'
                    )}
                  <DosenPicker
                    label={isKuliah ? 'Dosen tambahan' : 'Dosen pembimbing'}
                    value={draft.dosen_ids}
                    conflictIds={conflictIds}
                    options={(options.dosen || []).filter(
                      (dosen) =>
                        !isKuliah || String(dosen.id) !== String(draft.dosen_id)
                    )}
                    maxSelections={isKuliah ? 8 : 4}
                    onChange={(ids) => change('dosen_ids', ids)}
                  />
                  <DosenPicker
                    label="Dosen penguji"
                    value={draft.penguji_ids}
                    conflictIds={conflictIds}
                    options={options.dosen || []}
                    onChange={(ids) => change('penguji_ids', ids)}
                  />
                </>
              )}
            </fieldset>
            {message && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
              >
                {message}
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                className="ui-button"
                onClick={() => setSelected(null)}
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={saving}
                className="ui-button ui-button-primary"
              >
                {saving ? 'Memeriksa…' : 'Periksa dan aktifkan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
