/**
 * Utility functions for reliable timezone-aware date and time formatting.
 * Synchronizes with standardized network time (Google/NTP UTC aligned)
 * to bypass local machine clock inaccuracies and eliminate UTC midnight-split bugs.
 */

let serverTimeOffsetMs = 0;
let isTimeSynced = false;

// Attempt initial synchronization with backend standard time endpoint
export const syncStandardTime = async () => {
  try {
    const t0 = Date.now();
    const res = await fetch('/api/v1/system/time');
    const t1 = Date.now();
    if (res.ok) {
      const data = await res.json();
      const serverMs = data.timestamp_ms || new Date(data.utc_iso).getTime();
      const roundTrip = t1 - t0;
      serverTimeOffsetMs = serverMs + roundTrip / 2 - t1;
      isTimeSynced = true;
    }
  } catch {
    // If backend endpoint is offline or unavailable, default to client clock with offset 0
    serverTimeOffsetMs = 0;
  }
};

// Immediately invoke synchronization
syncStandardTime();

/**
 * Returns a standardized Date object corrected for server/network time offset.
 */
export const getStandardNow = (): Date => {
  return new Date(Date.now() + serverTimeOffsetMs);
};

/**
 * Formats a Date object as YYYY-MM-DD using standardized local calendar date.
 * Unlike new Date().toISOString().split('T')[0], this correctly avoids yesterday's date in IST.
 */
export const getStandardDateString = (d: Date = getStandardNow()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats standard time string (e.g. 02:45:30 PM).
 */
export const getStandardTimeString = (
  d: Date = getStandardNow(),
  includeSeconds = true
): string => {
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
    hour12: true,
  });
};

export const parseUtcDate = (isoString?: string | null): Date | null => {
  if (!isoString) return null;
  const trimmed = isoString.trim();
  if (!trimmed) return null;

  // If the ISO string does not specify timezone offset or 'Z', treat it as UTC
  const normalized = (!trimmed.endsWith('Z') && !trimmed.includes('+') && !trimmed.includes('-', 10))
    ? trimmed + 'Z'
    : trimmed;

  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
};

export const formatLocalTime = (isoString?: string | null, includeSeconds = false): string => {
  const date = parseUtcDate(isoString);
  if (!date) return '—';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
    hour12: true,
  });
};

export const formatLocalDate = (isoString?: string | null): string => {
  const date = parseUtcDate(isoString);
  if (!date) return '—';

  return date.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatLocalDateTime = (isoString?: string | null): string => {
  const date = parseUtcDate(isoString);
  if (!date) return '—';

  return `${formatLocalDate(isoString)} at ${formatLocalTime(isoString)}`;
};

