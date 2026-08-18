export const DASHBOARD_WEEKLY_START_COOKIE = 'dashboard_start_date';
export const DASHBOARD_WEEKLY_END_COOKIE = 'dashboard_end_date';
export const DASHBOARD_ROSTER_START_COOKIE = 'dashboard_roster_start_date';
export const DASHBOARD_ROSTER_END_COOKIE = 'dashboard_roster_end_date';

export const DASHBOARD_WEEKLY_START_STORAGE = 'bb-dashboard-weekly-start-date';
export const DASHBOARD_WEEKLY_END_STORAGE = 'bb-dashboard-weekly-end-date';
export const DASHBOARD_ROSTER_START_STORAGE = 'bb-dashboard-roster-start-date';
export const DASHBOARD_ROSTER_END_STORAGE = 'bb-dashboard-roster-end-date';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

type DateRangeInput = {
  urlStart?: string;
  urlEnd?: string;
  cookieStart?: string;
  cookieEnd?: string;
  fallbackStart: string;
  fallbackEnd: string;
};

function isIsoDate(value?: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function resolveDashboardDateRange({
  urlStart,
  urlEnd,
  cookieStart,
  cookieEnd,
  fallbackStart,
  fallbackEnd,
}: DateRangeInput): { start: string; end: string } {
  if (isIsoDate(urlStart) && isIsoDate(urlEnd)) {
    return { start: urlStart, end: urlEnd };
  }

  if (isIsoDate(cookieStart) && isIsoDate(cookieEnd)) {
    return { start: cookieStart, end: cookieEnd };
  }

  return { start: fallbackStart, end: fallbackEnd };
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function writeStorage(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore quota/private-mode failures.
  }
}

export function persistDashboardWeeklyRange(start: string, end: string) {
  writeCookie(DASHBOARD_WEEKLY_START_COOKIE, start);
  writeCookie(DASHBOARD_WEEKLY_END_COOKIE, end);
  writeStorage(DASHBOARD_WEEKLY_START_STORAGE, start);
  writeStorage(DASHBOARD_WEEKLY_END_STORAGE, end);
}

export function persistDashboardRosterRange(start: string, end: string) {
  writeCookie(DASHBOARD_ROSTER_START_COOKIE, start);
  writeCookie(DASHBOARD_ROSTER_END_COOKIE, end);
  writeStorage(DASHBOARD_ROSTER_START_STORAGE, start);
  writeStorage(DASHBOARD_ROSTER_END_STORAGE, end);
}

export function readDashboardWeeklyRangeFromStorage(): { start: string; end: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const start = localStorage.getItem(DASHBOARD_WEEKLY_START_STORAGE);
    const end = localStorage.getItem(DASHBOARD_WEEKLY_END_STORAGE);
    if (!isIsoDate(start) || !isIsoDate(end)) return null;
    return { start, end };
  } catch {
    return null;
  }
}

export function readDashboardRosterRangeFromStorage(): { start: string; end: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const start = localStorage.getItem(DASHBOARD_ROSTER_START_STORAGE);
    const end = localStorage.getItem(DASHBOARD_ROSTER_END_STORAGE);
    if (!isIsoDate(start) || !isIsoDate(end)) return null;
    return { start, end };
  } catch {
    return null;
  }
}
