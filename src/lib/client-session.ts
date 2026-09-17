const SESSION_KEY = 'bb_client_session_id';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Stable per-device session id for push registration and self-notification suppression.
 * Persisted in localStorage so PWA restarts keep the same id (sessionStorage was too volatile).
 */
export function getClientSessionId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    let existing = localStorage.getItem(SESSION_KEY);
    if (!existing) {
      const legacy = sessionStorage.getItem(SESSION_KEY);
      if (legacy) {
        localStorage.setItem(SESSION_KEY, legacy);
        existing = legacy;
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch {
          // ignore
        }
      }
    }
    if (existing) return existing;
    const id = generateId();
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return generateId();
  }
}

export function clearClientSessionId(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function isOwnChange(metadata: Record<string, unknown> | undefined, sessionId: string): boolean {
  if (!metadata || !sessionId) return false;
  return metadata.clientSessionId === sessionId;
}
