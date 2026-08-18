import { useState, useEffect, useCallback } from 'react';
import { getGatePassConfig } from '../services/api.service';
import { isPastCurfew, formatCurfewTime } from '../utils/dateUtils';

let cachedCurfewTime: string | null = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export function useGatePassCurfew() {
  const [curfewTime, setCurfewTime] = useState<string>(cachedCurfewTime || '15:00');
  const [isCurfewPassed, setIsCurfewPassed] = useState<boolean>(() => isPastCurfew(cachedCurfewTime || '15:00'));
  const [loading, setLoading] = useState<boolean>(!cachedCurfewTime);

  const evaluate = useCallback((cTime: string) => {
    setIsCurfewPassed(isPastCurfew(cTime));
  }, []);

  const fetchConfig = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedCurfewTime && now - lastFetchedAt < CACHE_TTL_MS) {
      setCurfewTime(cachedCurfewTime);
      evaluate(cachedCurfewTime);
      setLoading(false);
      return;
    }

    try {
      const res = await getGatePassConfig();
      const time = res.curfewTime || '15:00';
      cachedCurfewTime = time;
      lastFetchedAt = Date.now();
      setCurfewTime(time);
      evaluate(time);
    } catch {
      evaluate(cachedCurfewTime || '15:00');
    } finally {
      setLoading(false);
    }
  }, [evaluate]);

  useEffect(() => {
    fetchConfig();

    // Re-evaluate against current IST time every 15 seconds
    const interval = setInterval(() => {
      evaluate(cachedCurfewTime || '15:00');
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchConfig, evaluate]);

  const curfewDisplay = formatCurfewTime(curfewTime);

  return {
    curfewTime,
    curfewDisplay,
    isCurfewPassed,
    loading,
    refetch: () => fetchConfig(true),
  };
}
