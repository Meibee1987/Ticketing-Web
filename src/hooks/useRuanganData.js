import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { fetchRoomData } from '../services/roomReads.js';
import { getErrorMessage } from '../utils/supabaseResults.js';

const isSameDate = (d1, d2) => d1.toDateString() === d2.toDateString();

export function useRuanganData(selectedDate) {
  const [state, setState] = useState({
    ruangan: [],
    allBookings: [],
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));

      const { ruangan, allBookings } = await fetchRoomData(supabase);

      setState({ ruangan, allBookings, loading: false, error: null });
    } catch (err) {
      console.error('Error fetching data:', err);
      setState({
        ruangan: [],
        allBookings: [],
        loading: false,
        error: getErrorMessage(err),
      });
    }
  }, []);

  useEffect(() => {
    // Initial synchronization with the external room data source.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // Realtime subscriptions
  useEffect(() => {
    const tables = [
      'ruangan',
      'jadwal_perkuliahan',
      'jadwal_karya_akhir',
      'jadwal_lain_lain',
    ];
    const channels = tables.map((t) =>
      supabase
        .channel(`ruangan-rt-${t}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: t },
          fetchData
        )
        .subscribe()
    );
    return () => channels.forEach((c) => supabase.removeChannel(c));
  }, [fetchData]);

  const filteredBookings = useMemo(
    () => state.allBookings.filter((b) => isSameDate(b.mulai, selectedDate)),
    [state.allBookings, selectedDate]
  );

  return { ...state, filteredBookings };
}
