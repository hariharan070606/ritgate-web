// All date/time formatting uses the device's current local timezone.
const LOCAL_TZ = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
  catch { return undefined; }
})();
const LOCAL_TZ_OPTS: Intl.DateTimeFormatOptions = LOCAL_TZ ? { timeZone: LOCAL_TZ } : {};

/**
 * Parse a date value to a JS Date.
 * The backend sends LocalDateTime strings WITHOUT a timezone suffix (e.g. "2026-04-16T06:46:00").
 * Without a suffix, new Date() treats them as LOCAL time on the device — which is wrong when
 * the backend stores UTC. We append "Z" to bare ISO strings so they are always parsed as UTC,
 * then all display functions apply the IST offset correctly via Intl.
 */
const toDate = (d: Date | string | null | undefined): Date => {
  if (!d) return new Date();
  if (typeof d === 'string') {
    const bare = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(d.trim());
    return new Date(bare ? d.trim() + 'Z' : d);
  }
  return d;
};

/**
 * Parse a date value treating bare ISO strings as IST (UTC+5:30).
 * The backend stores LocalDateTime values (requestDate, createdAt, etc.)
 * in IST without a timezone suffix — append +05:30 so JS parses them correctly.
 */
const toDateLocal = (d: Date | string | null | undefined): Date => {
  if (!d) return new Date();
  if (typeof d === 'string') {
    const bare = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(d.trim());
    return new Date(bare ? d.trim() + '+05:30' : d);
  }
  return d;
};

/**
 * Parse a date value treating bare ISO strings as IST (UTC+5:30).
 * Use this for Visitor/Vendor createdAt fields which the backend stores in IST.
 */
const toDateIST = (d: Date | string | null | undefined): Date => {
  if (!d) return new Date();
  if (typeof d === 'string') {
    const bare = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(d.trim());
    return new Date(bare ? d.trim() + '+05:30' : d);
  }
  return d;
};

// ── Display formatters ────────────────────────────────────────────────────────

/** "15 Jan 2025, 02:30 PM" — for visitor/vendor dates stored as IST in backend */
export const formatDateTimeIST = (date: Date | string): string => {
  const d = toDateIST(date);
  return d.toLocaleString('en-IN', {
    ...LOCAL_TZ_OPTS,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

/** "15 Jan 2025" */
export const formatDate = (date: Date | string): string => {
  const d = toDate(date);
  return d.toLocaleDateString('en-IN', { ...LOCAL_TZ_OPTS, year: 'numeric', month: 'short', day: 'numeric' });
};

/** "15 Jan 2025" using local wall-clock parsing for bare timestamps */
export const formatDateLocal = (date: Date | string): string => {
  const d = toDateLocal(date);
  return d.toLocaleDateString('en-IN', { ...LOCAL_TZ_OPTS, year: 'numeric', month: 'short', day: 'numeric' });
};

/** "02:30 PM" */
export const formatTime = (date: Date | string): string => {
  const d = toDate(date);
  return d.toLocaleTimeString('en-IN', { ...LOCAL_TZ_OPTS, hour: '2-digit', minute: '2-digit', hour12: true });
};

/** "02:30 PM" using local wall-clock parsing for bare timestamps */
export const formatTimeLocal = (date: Date | string): string => {
  const d = toDateLocal(date);
  return d.toLocaleTimeString('en-IN', { ...LOCAL_TZ_OPTS, hour: '2-digit', minute: '2-digit', hour12: true });
};

/** "15 Jan 2025, 02:30 PM" */
export const formatDateTime = (date: Date | string): string => {
  const d = toDate(date);
  return d.toLocaleString('en-IN', {
    ...LOCAL_TZ_OPTS,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

/** "15 Jan 2025, 02:30 PM" using local wall-clock parsing for bare timestamps */
export const formatDateTimeLocal = (date: Date | string): string => {
  const d = toDateLocal(date);
  return d.toLocaleString('en-IN', {
    ...LOCAL_TZ_OPTS,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

/** "15 Jan, 2:30 PM" — compact for cards */
export const formatDateTimeShort = (date: Date | string): string => {
  const d = toDate(date);
  return d.toLocaleString('en-IN', {
    ...LOCAL_TZ_OPTS,
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

/** "15 Jan, 2:30 PM" using local wall-clock parsing for bare timestamps */
export const formatDateTimeShortLocal = (date: Date | string): string => {
  const d = toDateLocal(date);
  return d.toLocaleString('en-IN', {
    ...LOCAL_TZ_OPTS,
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

/** "15/01/2025" */
export const formatDateGB = (date: Date | string): string => {
  const d = toDate(date);
  return d.toLocaleDateString('en-GB', { ...LOCAL_TZ_OPTS, day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** "15 Jan" */
export const formatDateShort = (date: Date | string): string => {
  const d = toDate(date);
  return d.toLocaleDateString('en-IN', { ...LOCAL_TZ_OPTS, month: 'short', day: 'numeric' });
};

/** "15 Jan" using local wall-clock parsing for bare timestamps */
export const formatDateShortLocal = (date: Date | string): string => {
  const d = toDateLocal(date);
  return d.toLocaleDateString('en-IN', { ...LOCAL_TZ_OPTS, month: 'short', day: 'numeric' });
};

// ── Relative time ─────────────────────────────────────────────────────────────

/** "2m ago", "3h ago", "2d ago" */
export const getRelativeTime = (date: Date | string): string => {
  const d = toDate(date);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
};

/** Relative time using local wall-clock parsing for bare timestamps */
export const getRelativeTimeLocal = (date: Date | string): string => {
  const d = toDateLocal(date);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { ...LOCAL_TZ_OPTS, year: 'numeric', month: 'short', day: 'numeric' });
};

/** "2m", "3h" — ultra-compact for badges */
export const getRelativeTimeShort = (date: Date | string): string => {
  const d = toDate(date);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

/** Alias kept for backward compatibility */
export const relativeTime = getRelativeTime;

// ── Boolean checks ────────────────────────────────────────────────────────────

export const isToday = (date: Date | string): boolean => {
  const d = toDate(date);
  const todayStr = new Date().toLocaleDateString('en-IN', LOCAL_TZ_OPTS);
  return d.toLocaleDateString('en-IN', LOCAL_TZ_OPTS) === todayStr;
};

/** Is today using local wall-clock parsing for bare timestamps */
export const isTodayLocal = (date: Date | string): boolean => {
  const d = toDateLocal(date);
  const todayStr = new Date().toLocaleDateString('en-IN', LOCAL_TZ_OPTS);
  return d.toLocaleDateString('en-IN', LOCAL_TZ_OPTS) === todayStr;
};

export const isThisWeek = (date: Date | string): boolean => {
  const d = toDate(date);
  return d >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
};

export const isThisMonth = (date: Date | string): boolean => {
  const d = toDate(date);
  return d >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
};

/** Check if current time is past 3 PM IST */
export function isPast3PM(): boolean {
  const now = new Date();
  const istHour = parseInt(
    now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' })
  );
  return istHour >= 15;
}

// ── Numeric helpers ───────────────────────────────────────────────────────────

/** Numeric timestamp using local wall-clock parsing for bare timestamps */
export const toTimestampLocal = (date: Date | string | null | undefined): number => {
  const d = toDateLocal(date);
  return d.getTime();
};

/** Within last 24 hours using local wall-clock parsing for bare timestamps */
export const isWithinLast24HoursLocal = (date: Date | string | null | undefined): boolean => {
  if (!date) return false;
  const diff = Date.now() - toTimestampLocal(date);
  return diff >= 0 && diff < 24 * 60 * 60 * 1000;
};

// ── API / backend helpers ─────────────────────────────────────────────────────

/** Get today's date in YYYY-MM-DD format (IST) */
export function getTodayIST(): string {
  const now = new Date();
  const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return istDate.toISOString().split('T')[0];
}

/** Get formatted date for API request */
export function getRequestDate(): string {
  return getTodayIST();
}

/**
 * Current IST time as ISO 8601 string with +05:30 suffix.
 * Use instead of new Date().toISOString() for any datetime sent to the backend.
 */
export const nowIST = (): string => {
  const now = new Date();
  const offsetMs = 330 * 60 * 1000; // IST = UTC+5:30
  const istMs = now.getTime() + offsetMs;
  return new Date(istMs).toISOString().replace('Z', '+05:30');
};

/**
 * IST time offset by `hours` from now, as ISO 8601 string with +05:30 suffix.
 */
export const nowISTPlus = (hours: number): string => {
  const now = new Date();
  const offsetMs = 330 * 60 * 1000;
  const istMs = now.getTime() + offsetMs + hours * 60 * 60 * 1000;
  return new Date(istMs).toISOString().replace('Z', '+05:30');
};

/** Time headers for API requests */
export function timeHeaders(): Record<string, string> {
  return {
    'X-Client-Time': new Date().toISOString(),
    'X-Client-Timezone': 'Asia/Kolkata',
  };
}
