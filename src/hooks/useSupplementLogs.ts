import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, getAuthUser } from '../lib/supabaseClient';
import { generateUUID } from '../lib/utils';
import { getCachedData, setCachedData } from '../lib/swrCache';
import type { SupplementLog } from '../types/database';

const SUPPLEMENT_STORAGE_KEY = 'gymtracker_supplement_logs_v1';

export function useSupplementLogs() {
  // Helper to determine if an ISO string is today (in local timezone)
  const isToday = useCallback((isoString: string) => {
    try {
      const date = new Date(isoString);
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    } catch {
      return false;
    }
  }, []);

  // Stale-While-Revalidate: Read cached supplement logs immediately for 0ms initial render
  const [supplements, setSupplements] = useState<SupplementLog[]>(() => {
    const saved = getCachedData<SupplementLog[]>(SUPPLEMENT_STORAGE_KEY, []);
    return saved.filter((item) => {
      try {
        const d = new Date(item.logged_at);
        const t = new Date();
        return (
          d.getDate() === t.getDate() &&
          d.getMonth() === t.getMonth() &&
          d.getFullYear() === t.getFullYear()
        );
      } catch {
        return false;
      }
    });
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => supplements.length === 0);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);

  // Fetch today's supplement logs
  const fetchTodaySupplements = useCallback(async () => {
    setSupplements((curr) => {
      if (curr.length === 0) setIsLoading(true);
      else setIsRevalidating(true);
      return curr;
    });

    if (!isSupabaseConfigured) {
      // Local storage fallback
      const saved = getCachedData<SupplementLog[]>(SUPPLEMENT_STORAGE_KEY, []);
      if (saved.length > 0) {
        setSupplements(saved.filter((item) => isToday(item.logged_at)));
      }
      setIsLoading(false);
      setIsRevalidating(false);
      return;
    }

    try {
      const user = await getAuthUser();
      if (!user) {
        setIsLoading(false);
        setIsRevalidating(false);
        return;
      }

      // Local day boundaries in ISO
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('supplement_logs')
        .select('*')
        .gte('logged_at', startOfDay.toISOString())
        .lte('logged_at', endOfDay.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching supplement logs from Supabase:', error.message);
        // Fallback to local cache if offline
        const saved = getCachedData<SupplementLog[]>(SUPPLEMENT_STORAGE_KEY, []);
        if (saved.length > 0) {
          setSupplements(saved.filter((item) => isToday(item.logged_at)));
        }
      } else if (data) {
        setSupplements(data);
        setCachedData(SUPPLEMENT_STORAGE_KEY, data);
      }
    } catch (err) {
      console.error('Failed to fetch supplements:', err);
    } finally {
      setIsLoading(false);
      setIsRevalidating(false);
    }
  }, [isToday]);

  useEffect(() => {
    fetchTodaySupplements();
  }, [fetchTodaySupplements]);

  // Insert a new supplement log
  const addSupplement = async (name: string, dosage: string) => {
    const tempId = generateUUID();
    const nowIso = new Date().toISOString();

    const newLog: SupplementLog = {
      id: tempId,
      user_id: 'local_user',
      name: name.trim(),
      dosage: dosage.trim(),
      taken: false,
      logged_at: nowIso,
      created_at: nowIso,
    };

    // Optimistically update UI
    setSupplements((prev) => {
      const updated = [...prev, newLog];
      setCachedData(SUPPLEMENT_STORAGE_KEY, updated);
      return updated;
    });

    if (isSupabaseConfigured) {
      try {
        const user = await getAuthUser();
        if (user) {
          const { data, error } = await supabase
            .from('supplement_logs')
            .insert({
              user_id: user.id,
              name: newLog.name,
              dosage: newLog.dosage,
              taken: newLog.taken,
              logged_at: newLog.logged_at,
            })
            .select()
            .single();

          if (error) {
            console.error('Failed to insert supplement into Supabase:', error.message);
          } else if (data) {
            // Replace local temp ID with remote Supabase ID
            setSupplements((prev) => {
              const updated = prev.map((item) => (item.id === tempId ? data : item));
              setCachedData(SUPPLEMENT_STORAGE_KEY, updated);
              return updated;
            });
          }
        }
      } catch (err) {
        console.error('Supabase supplement insert error:', err);
      }
    }
  };

  // Toggle 'taken' status
  const toggleTaken = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;

    // Optimistically update UI
    setSupplements((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, taken: nextStatus } : item));
      setCachedData(SUPPLEMENT_STORAGE_KEY, updated);
      return updated;
    });

    if (isSupabaseConfigured) {
      try {
        const user = await getAuthUser();
        if (user) {
          const { error } = await supabase
            .from('supplement_logs')
            .update({ taken: nextStatus })
            .eq('id', id);

          if (error) {
            console.error('Failed to update supplement status in Supabase:', error.message);
            // Revert state on error
            setSupplements((prev) => {
              const reverted = prev.map((item) => (item.id === id ? { ...item, taken: currentStatus } : item));
              setCachedData(SUPPLEMENT_STORAGE_KEY, reverted);
              return reverted;
            });
          }
        }
      } catch (err) {
        console.error('Supabase supplement update error:', err);
        setSupplements((prev) => {
          const reverted = prev.map((item) => (item.id === id ? { ...item, taken: currentStatus } : item));
          setCachedData(SUPPLEMENT_STORAGE_KEY, reverted);
          return reverted;
        });
      }
    }
  };

  // Delete a supplement log
  const deleteSupplement = async (id: string) => {
    let prevList: SupplementLog[] = [];

    // Optimistically update UI
    setSupplements((prev) => {
      prevList = prev;
      const updated = prev.filter((item) => item.id !== id);
      setCachedData(SUPPLEMENT_STORAGE_KEY, updated);
      return updated;
    });

    if (isSupabaseConfigured) {
      try {
        const user = await getAuthUser();
        if (user) {
          const { error } = await supabase
            .from('supplement_logs')
            .delete()
            .eq('id', id);

          if (error) {
            console.error('Failed to delete supplement from Supabase:', error.message);
            setSupplements(prevList);
            setCachedData(SUPPLEMENT_STORAGE_KEY, prevList);
          }
        }
      } catch (err) {
        console.error('Supabase supplement delete error:', err);
        setSupplements(prevList);
        setCachedData(SUPPLEMENT_STORAGE_KEY, prevList);
      }
    }
  };

  return {
    supplements,
    isLoading,
    isRevalidating,
    addSupplement,
    toggleTaken,
    deleteSupplement,
    refreshSupplements: fetchTodaySupplements,
  };
}
