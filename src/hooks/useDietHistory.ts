import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, getAuthUser } from '../lib/supabaseClient';
import { getCachedData, setCachedData } from '../lib/swrCache';
import type { DietLog } from '../types/database';

const DIET_HISTORY_CACHE_KEY = 'gymtracker_diet_history_cache';

export function useDietHistory() {
  const [logs, setLogs] = useState<DietLog[]>(() =>
    getCachedData<DietLog[]>(DIET_HISTORY_CACHE_KEY, [])
  );
  const [isLoading, setIsLoading] = useState<boolean>(() => logs.length === 0);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const fetchHistory = useCallback(async (currentPage: number, append = false) => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }
    
    if (!append) {
      setLogs((curr) => {
        if (curr.length === 0) setIsLoading(true);
        return curr;
      });
    }

    try {
      const user = await getAuthUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('diet_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      if (data) {
        if (data.length < PAGE_SIZE) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
        
        if (append) {
          setLogs(prev => {
            const next = [...prev, ...(data as DietLog[])];
            setCachedData(DIET_HISTORY_CACHE_KEY, next);
            return next;
          });
        } else {
          const fresh = data as DietLog[];
          setLogs(fresh);
          setCachedData(DIET_HISTORY_CACHE_KEY, fresh);
        }
      }
    } catch (err) {
      console.error('Error fetching diet history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [PAGE_SIZE]);

  useEffect(() => {
    fetchHistory(0, false);
  }, [fetchHistory]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistory(nextPage, true);
  };

  const deleteLog = async (id: string) => {
    let prevLogs: DietLog[] = [];
    setLogs((prev) => {
      prevLogs = prev;
      const updated = prev.filter((log) => log.id !== id);
      setCachedData(DIET_HISTORY_CACHE_KEY, updated);
      return updated;
    });
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('diet_logs').delete().eq('id', id);
        if (error) {
          console.error('Failed to delete diet log:', error);
          setLogs(prevLogs);
          setCachedData(DIET_HISTORY_CACHE_KEY, prevLogs);
        }
      } catch (err) {
        console.error('Failed to delete diet log:', err);
        setLogs(prevLogs);
        setCachedData(DIET_HISTORY_CACHE_KEY, prevLogs);
      }
    }
  };

  return {
    logs,
    isLoading,
    hasMore,
    loadMore,
    deleteLog,
    refetch: () => fetchHistory(0, false),
  };
}
