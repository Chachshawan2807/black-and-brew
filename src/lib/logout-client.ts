import { clearAuth } from '@/app/actions/auth';
import { collectClientDeviceInfo } from '@/lib/client-device-info';
import { clearClientAuthSession } from '@/lib/client-auth-storage';
import { clearOfflineMutationQueue } from '@/lib/offline-mutation-queue';
import { clearSupabaseSession } from '@/lib/supabase-session';

/** Clear client auth storage, offline queue, and Supabase session. */
export async function teardownLocalAuthState(): Promise<void> {
  clearClientAuthSession();
  await clearOfflineMutationQueue();
  await clearSupabaseSession();
}

/** Clear server cookies, client storage, offline queue, and Supabase — then reload. */
export async function performClientLogout(): Promise<void> {
  await clearAuth(collectClientDeviceInfo());
  await teardownLocalAuthState();
  window.location.reload();
}
