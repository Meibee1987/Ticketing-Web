import { syncScheduleReviewImport } from './scheduleImportReview.js';
export const syncKaryaAkhirReviewImport = (client, parameters) =>
  syncScheduleReviewImport(client, parameters, 'karya_akhir');
