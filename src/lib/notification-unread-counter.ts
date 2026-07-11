export const UNREAD_COUNTER_KEY = 'bb-notification-unread-total';

export function loadUnreadCounter(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(UNREAD_COUNTER_KEY);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  } catch {
    return 0;
  }
}

export function saveUnreadCounter(count: number): void {
  if (typeof window === 'undefined') return;
  try {
    const safe = Math.max(0, Math.floor(Number(count) || 0));
    localStorage.setItem(UNREAD_COUNTER_KEY, String(safe));
  } catch {
    // ignore quota / private mode
  }
}

export function reconcileUnreadCounter(listUnread: number): number {
  const listSafe = Math.max(0, Math.floor(Number(listUnread) || 0));
  const stored = loadUnreadCounter();
  const reconciled = Math.max(stored, listSafe);
  if (reconciled !== stored) saveUnreadCounter(reconciled);
  return reconciled;
}

export function incrementUnreadCounter(delta = 1): number {
  const next = loadUnreadCounter() + Math.max(0, Math.floor(Number(delta) || 0));
  saveUnreadCounter(next);
  return next;
}

export function decrementUnreadCounter(delta = 1): number {
  const next = Math.max(0, loadUnreadCounter() - Math.max(0, Math.floor(Number(delta) || 0)));
  saveUnreadCounter(next);
  return next;
}

export function resetUnreadCounter(): void {
  saveUnreadCounter(0);
}
