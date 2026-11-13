export const SCHEDULE_REVIEW_CONFIG = {
  karya_akhir: {
    label: 'Karya Akhir',
    table: 'karya_akhir_import_review',
    syncRpc: 'sync_jadwal_karya_akhir_review_import',
    reviewRpc: 'review_jadwal_karya_akhir_import',
    migration: 'MIGRATION_STRICT_JADWAL_KARYA_AKHIR_SYNC.sql',
  },
  perkuliahan: {
    label: 'Perkuliahan',
    table: 'perkuliahan_import_review',
    syncRpc: 'begin_jadwal_perkuliahan_review_import',
    processRpc: 'process_jadwal_perkuliahan_review_import',
    reviewRpc: 'review_jadwal_perkuliahan_import',
    migration: 'MIGRATION_STRICT_JADWAL_PERKULIAHAN_SYNC.sql',
  },
};

export async function syncScheduleReviewImport(
  client,
  parameters,
  jenis,
  onProgress
) {
  const config = SCHEDULE_REVIEW_CONFIG[jenis];
  const migrationMessage = `Alur Perlu diperiksa belum aktif di database. Jalankan SELURUH file ${config.migration} terbaru, termasuk BEGIN sampai COMMIT, di Supabase SQL Editor. Setelah berhasil, refresh halaman dan ulangi import.`;
  try {
    // Endpoint khusus mencegah frontend baru memakai fungsi strict versi lama.
    const result = await client.rpc(config.syncRpc, parameters);
    if (result.error) {
      if (/statement timeout/i.test(result.error.message || '')) {
        return {
          data: null,
          error: {
            ...result.error,
            message: `Proses import melewati batas waktu database sehingga perubahan batch ini dibatalkan. Jalankan seluruh ${config.migration} terbaru dari BEGIN sampai COMMIT, lalu ulangi import. Jika masih terjadi, periksa proses database yang sedang berjalan.`,
          },
        };
      }
      const missingFunction =
        ['PGRST202', '42883'].includes(result.error.code) ||
        /could not find.*function|function.*does not exist|schema cache/i.test(
          result.error.message || ''
        );
      return missingFunction
        ? { data: null, error: { ...result.error, message: migrationMessage } }
        : result;
    }
    let summary = Array.isArray(result.data) ? result.data[0] : result.data;
    if (summary?.workflow_version !== (config.processRpc ? 3 : 2)) {
      return {
        data: null,
        error: {
          message: `Versi sinkronisasi database tidak sesuai. ${migrationMessage}`,
        },
      };
    }
    if (config.processRpc) {
      if (
        !summary.batch_id ||
        !Number.isInteger(summary.remaining) ||
        summary.remaining < 0
      ) {
        return {
          data: null,
          error: { message: 'Respons antrean import tidak valid.' },
        };
      }
      return processScheduleReviewImport(client, summary, jenis, onProgress);
    }
    return result;
  } catch (error) {
    return {
      data: null,
      error: {
        message: error.message || 'Koneksi sinkronisasi gagal. Coba kembali.',
      },
    };
  }
}

export async function processScheduleReviewImport(
  client,
  initialSummary,
  jenis,
  onProgress
) {
  const config = SCHEDULE_REVIEW_CONFIG[jenis];
  let summary = initialSummary;
  let stagedSummary = initialSummary;
  const partialFailure = (error) => ({
    data: stagedSummary,
    error: {
      ...error,
      persistedReview: true,
      message: `Antrean import sudah tersimpan. Pemeriksaan belum selesai: ${error.message || 'Koneksi terputus'}. Jadwal yang sudah lolos tetap tersimpan; buka Perlu diperiksa lalu pilih Lanjutkan pemeriksaan.`,
    },
  });
  try {
    const total = summary.remaining;
    onProgress?.({ processed: 0, total });
    while (!summary.complete) {
      const next = await client.rpc(config.processRpc, {
        p_batch_id: summary.batch_id,
      });
      if (next.error) return partialFailure(next.error);
      const processed = Array.isArray(next.data) ? next.data[0] : next.data;
      if (
        processed?.workflow_version !== 3 ||
        processed.batch_id !== summary.batch_id ||
        !Number.isInteger(processed.remaining) ||
        processed.remaining < 0 ||
        (!processed.complete && processed.remaining >= summary.remaining)
      ) {
        return partialFailure({
          message:
            'Kemajuan pemeriksaan tidak valid. Muat ulang sebelum melanjutkan',
        });
      }
      summary = processed;
      stagedSummary = summary;
      onProgress?.({ processed: total - summary.remaining, total });
    }
    return { data: summary, error: null };
  } catch (error) {
    return partialFailure(error);
  }
}
