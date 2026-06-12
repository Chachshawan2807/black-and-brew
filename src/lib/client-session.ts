const SESSION_KEY = 'bb_client_session_id';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** Stable per-browser-tab session id for suppressing self-notifications. */
export function getClientSessionId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = generateId();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return generateId();
  }
}

export function isOwnChange(metadata: Record<string, unknown> | undefined, sessionId: string): boolean {
  if (!metadata || !sessionId) return false;
  return metadata.clientSessionId === sessionId;
}
