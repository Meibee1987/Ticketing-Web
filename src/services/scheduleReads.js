// Keep admin reads (raw result) and import reads (throw on error) distinct.
const SUPABASE_PAGE_SIZE = 1000;

export const fetchAllTableRows = async (supabase, table, columns = '*') => {
  const rows = [];
  let from = 0;

  while (true) {
    const result = await supabase
      .from(table)
      .select(columns)
      .order('id', { ascending: true })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (result.error) return result;

    const pageRows = result.data || [];
    rows.push(...pageRows);

    if (pageRows.length < SUPABASE_PAGE_SIZE) {
      return { ...result, data: rows };
    }

    from += SUPABASE_PAGE_SIZE;
  }
};

export async function fetchExistingSchedulesFrom(
  supabase,
  tableName,
  startTimestamp
) {
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
