import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, getAuthUser } from '../lib/supabaseClient';
import { getCachedData, setCachedData } from '../lib/swrCache';
import type { SupplementLog } from '../types/database';

const SUPPLEMENT_HISTORY_CACHE_KEY = 'gymtracker_supplement_history_cache';

export function useSupplementHistory() {
  const [logs, setLogs] = useState<SupplementLog[]>(() =>
    getCachedData<SupplementLog[]>(SUPPLEMENT_HISTORY_CACHE_KEY, [])
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
        .from('supplement_logs')
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
            const next = [...prev, ...(data as SupplementLog[])];
            setCachedData(SUPPLEMENT_HISTORY_CACHE_KEY, next);
            return next;
          });
        } else {
          const fresh = data as SupplementLog[];
          setLogs(fresh);
          setCachedData(SUPPLEMENT_HISTORY_CACHE_KEY, fresh);
        }
      }
    } catch (err) {
      console.error('Error fetching supplement history:', err);
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
    let prevLogs: SupplementLog[] = [];
    setLogs((prev) => {
      prevLogs = prev;
      const updated = prev.filter((log) => log.id !== id);
      setCachedData(SUPPLEMENT_HISTORY_CACHE_KEY, updated);
      return updated;
    });
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('supplement_logs').delete().eq('id', id);
        if (error) {
          console.error('Failed to delete supplement log:', error);
          setLogs(prevLogs);
          setCachedData(SUPPLEMENT_HISTORY_CACHE_KEY, prevLogs);
        }
      } catch (err) {
        console.error('Failed to delete supplement log:', err);
        setLogs(prevLogs);
        setCachedData(SUPPLEMENT_HISTORY_CACHE_KEY, prevLogs);
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
