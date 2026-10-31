function classifyImportIssue(message) {
  const value = String(message || '').toLowerCase();

  if (/waktu (mulai|selesai).*tidak valid/.test(value)) {
    return 'INVALID_DATETIME';
  }
  if (/tidak ada di master data|tidak ditemukan/.test(value)) {
    return 'REFERENCE_NOT_FOUND';
  }
  if (/duplikat/.test(value)) return 'DUPLICATE_SCHEDULE';
  if (/konflik|bertabrakan/.test(value)) return 'SCHEDULE_CONFLICT';
  if (/database|sinkronisasi/.test(value)) return 'DATABASE_ERROR';
  if (/tidak valid|wajib|harus/.test(value)) return 'VALIDATION_ERROR';
  return 'IMPORT_ERROR';
}

function detectImportField(message) {
  const value = String(message || '').toLowerCase();

  if (value.includes('waktu mulai')) return 'mulai_jadwal';
  if (value.includes('waktu selesai')) return 'akhir_jadwal';
  if (value.includes('kode mata kuliah') || value.includes('mata kuliah')) {
    return 'id_mata_kuliah';
  }
  if (value.includes('ruangan')) return 'ruangan_id';
  if (value.includes('dosen')) return 'dosen_id';
  if (value.includes('angkatan')) return 'id_angkatan';
  if (value.includes('duplikat')) return 'import_key';
  return null;
}

function parseImportError(error, errorIndex) {
  const originalMessage =
    typeof error === 'string' ? error : String(error?.message || error);
  const rowMatch = originalMessage.match(
    /^Baris\s+(\d+)(?:\s+dan\s+(\d+))?:\s*(.*)$/i
  );
  const rowNumbers = rowMatch
    ? [rowMatch[1], rowMatch[2]].filter(Boolean).map((value) => Number(value))
    : [];
  const message = rowMatch ? rowMatch[3] : originalMessage;
  const issues = message
    .split(/\s*;\s*/)
    .map((issue) => issue.trim())
    .filter(Boolean);

  return (issues.length > 0 ? issues : [message]).map((issue, issueIndex) => ({
    id: `${errorIndex + 1}.${issueIndex + 1}`,
    code: classifyImportIssue(issue),
    field: detectImportField(issue),
    row_numbers: rowNumbers,
    message: issue,
    original_message: originalMessage,
  }));
}

function buildSourceRow(headers, row) {
  if (!row) return null;

  return Object.fromEntries(
    (headers || []).map((header, index) => [
      String(header || `kolom_${index + 1}`),
      row[index] instanceof Date ? row[index].toISOString() : row[index],
    ])
  );
}

export function buildImportErrorReport({
  errors = [],
  headers = [],
  rows = [],
  metadata = {},
  generatedAt = new Date(),
}) {
  const details = errors.flatMap((error, index) =>
    parseImportError(error, index)
  );

  const detailedErrors = details.map((detail) => ({
    ...detail,
    source_rows: detail.row_numbers.map((rowNumber) => ({
      row_number: rowNumber,
      data: buildSourceRow(headers, rows[rowNumber - 1]),
    })),
  }));
  const affectedRows = [
    ...new Set(detailedErrors.flatMap((error) => error.row_numbers)),
  ].sort((left, right) => left - right);
  const byCode = detailedErrors.reduce((summary, error) => {
    summary[error.code] = (summary[error.code] || 0) + 1;
    return summary;
  }, {});

  return {
    format: 'ticketing-import-error-report',
    version: 1,
    generated_at: generatedAt.toISOString(),
    import: metadata,
    summary: {
      error_entries: errors.length,
      total_issues: detailedErrors.length,
      affected_rows: affectedRows,
      by_code: byCode,
    },
    errors: detailedErrors,
  };
}
