import { supabase } from '../supabaseClient';

export const MONITOR_SLIDES_TABLE = 'monitor_slides';
export const MONITOR_SLIDES_BUCKET = 'monitor-slides';
export const LEGACY_MONITOR_SLIDES_KEY = 'jadwal_monitor_slides';

export const mapMonitorSlide = (row) => ({
  id: row.id,
  type: 'image',
  url: row.image_url,
  title: row.title,
  storagePath: row.storage_path,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
});

export const fetchMonitorSlides = async () => {
  const { data, error } = await supabase
    .from(MONITOR_SLIDES_TABLE)
    .select(
      'id, title, image_url, storage_path, sort_order, is_active, created_at'
    )
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapMonitorSlide);
};

export const readLegacyMonitorSlides = () => {
  try {
    const saved = localStorage.getItem(LEGACY_MONITOR_SLIDES_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
