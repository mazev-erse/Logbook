/**
 * Stale-While-Revalidate (SWR) Client Cache Utility
 *
 * Provides synchronous cache reads for instant 0ms initial renders,
 * followed by asynchronous background revalidation and cache persistence.
 */

export function getCachedData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      return JSON.parse(raw) as T;
    }
  } catch (err) {
    console.warn(`[SWR] Failed reading cache for "${key}":`, err);
  }
  return fallback;
}

export function setCachedData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[SWR] Failed writing cache for "${key}":`, err);
  }
}

export function removeCachedData(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[SWR] Failed removing cache for "${key}":`, err);
  }
}
