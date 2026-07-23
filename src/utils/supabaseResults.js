export function assertSupabaseResults(entries) {
  for (const [label, result] of entries) {
    if (!result?.error) continue;

    const error = new Error(
      `${label}: ${result.error.message || 'Permintaan database gagal'}`
    );
    error.cause = result.error;
    throw error;
  }
}

export function getErrorMessage(
  error,
  fallback = 'Gagal mengambil data. Silakan coba lagi.'
) {
  return error?.message || fallback;
}
