import { supabase } from './supabase';

/**
 * Ensures the browser Supabase client has an authenticated session.
 * Required after RLS hardening: inventory tables allow `authenticated` only.
 * Call after PIN verification or on app mount when PIN session is active.
 */
export async function ensureSupabaseSession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return true;

  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error('[Supabase] Anonymous sign-in failed:', error.message);
    return false;
  }
  return true;
}

export async function clearSupabaseSession(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[Supabase] Sign-out failed:', error.message);
  }
}
