import { supabase } from './supabase';

let sessionReady = false;
let ensureSessionPromise: Promise<boolean> | null = null;

async function ensureSupabaseSessionInternal(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return true;

  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error('[Supabase] Anonymous sign-in failed:', error.message);
    return false;
  }
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

export async function clearSupabaseSession(): Promise<void> {
  sessionReady = false;
  ensureSessionPromise = null;

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[Supabase] Sign-out failed:', error.message);
  }
}
