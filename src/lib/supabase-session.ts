import { supabase } from './supabase';

const TOKEN_EXPIRY_SKEW_MS = 60_000;

let sessionReady = false;
let cachedAccessToken: string | null = null;
let cachedExpiresAtMs = 0;
let ensureSessionPromise: Promise<boolean> | null = null;

type SessionLike = {
  access_token?: string | null;
  expires_at?: number | null;
} | null;

function rememberSession(session: SessionLike): boolean {
  if (!session) {
    cachedAccessToken = null;
    cachedExpiresAtMs = 0;
    return false;
  }

  cachedAccessToken = session.access_token ?? null;
  cachedExpiresAtMs = typeof session.expires_at === 'number' ? session.expires_at * 1000 : 0;
  return true;
}

function isCachedTokenFresh(): boolean {
  if (!sessionReady) return false;
  if (!cachedExpiresAtMs) return true;
  return Date.now() < cachedExpiresAtMs - TOKEN_EXPIRY_SKEW_MS;
}

function sessionTokenNeedsRefresh(session: SessionLike): boolean {
  if (!session?.access_token || typeof session.expires_at !== 'number') return false;
  return session.expires_at * 1000 <= Date.now() + TOKEN_EXPIRY_SKEW_MS;
}

async function ensureSupabaseSessionInternal(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session && !sessionTokenNeedsRefresh(session)) {
    return rememberSession(session);
  }

  if (session && sessionTokenNeedsRefresh(session)) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      return rememberSession(data.session);
    }
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error('[Supabase] Anonymous sign-in failed:', error.message);
    return session ? rememberSession(session) : false;
  }

  return rememberSession(data.session);
}

/**
 * Ensures the browser Supabase client has an authenticated session.
 * Required after RLS hardening: inventory tables allow `authenticated` only.
 * Call after PIN verification or on app mount when PIN session is active.
 *
 * Concurrent callers share one in-flight auth round-trip; successful sessions
 * are cached until clearSupabaseSession() or the JWT is near expiry.
 */
export async function ensureSupabaseSession(): Promise<boolean> {
  if (isCachedTokenFresh()) return true;

  if (sessionReady && !isCachedTokenFresh()) {
    sessionReady = false;
    ensureSessionPromise = null;
  }

  if (!ensureSessionPromise) {
    ensureSessionPromise = ensureSupabaseSessionInternal()
      .then((ok) => {
        if (ok) {
          sessionReady = true;
        } else {
          ensureSessionPromise = null;
        }
        return ok;
      })
      .catch((err) => {
        ensureSessionPromise = null;
        throw err;
      });
  }

  return ensureSessionPromise;
}

/**
 * Returns the browser Supabase access token after ensuring a session exists.
 * Reuses the cached token from ensureSupabaseSession() avoids a second
 * auth.getSession() call that can orphan the GoTrue storage lock.
 * Expired anonymous JWTs are refreshed before they are returned.
 */
export async function getSupabaseAccessToken(): Promise<string | null> {
  const ok = await ensureSupabaseSession();
  if (!ok) return null;
  return cachedAccessToken;
}

/** Drop the in-memory JWT so the next register attempt can refresh or re-anon. */
export async function refreshSupabaseAccessToken(): Promise<string | null> {
  sessionReady = false;
  cachedAccessToken = null;
  cachedExpiresAtMs = 0;
  ensureSessionPromise = null;
  return getSupabaseAccessToken();
}

export async function clearSupabaseSession(): Promise<void> {
  sessionReady = false;
  cachedAccessToken = null;
  cachedExpiresAtMs = 0;
  const pendingEnsure = ensureSessionPromise;
  ensureSessionPromise = null;

  if (pendingEnsure) {
    await pendingEnsure.catch(() => false);
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[Supabase] Sign-out failed:', error.message);
  }
}
