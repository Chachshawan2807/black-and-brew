import { supabase } from './supabase';

let sessionReady = false;
let cachedAccessToken: string | null = null;
let ensureSessionPromise: Promise<boolean> | null = null;

async function ensureSupabaseSessionInternal(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    cachedAccessToken = session.access_token ?? null;
    return true;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error('[Supabase] Anonymous sign-in failed:', error.message);
    return false;
  }

  cachedAccessToken = data.session?.access_token ?? null;
  return true;
}

/**
 * Ensures the browser Supabase client has an authenticated session.
 * Required after RLS hardening: inventory tables allow `authenticated` only.
 * Call after PIN verification or on app mount when PIN session is active.
 *
 * Concurrent callers share one in-flight auth round-trip; successful sessions
 * are cached until clearSupabaseSession().
 */
export async function ensureSupabaseSession(): Promise<boolean> {
  if (sessionReady) return true;

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
 * Reuses the cached token from ensureSupabaseSession() — avoids a second
 * auth.getSession() call that can orphan the GoTrue storage lock.
 */
export async function getSupabaseAccessToken(): Promise<string | null> {
  const ok = await ensureSupabaseSession();
  if (!ok) return null;
  return cachedAccessToken;
}

export async function clearSupabaseSession(): Promise<void> {
  sessionReady = false;
  cachedAccessToken = null;
  ensureSessionPromise = null;

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[Supabase] Sign-out failed:', error.message);
  }
}
