import { clearAuth } from '@/app/actions/auth';
import { collectClientDeviceInfo } from '@/lib/client-device-info';
import { clearClientAuthSession } from '@/lib/client-auth-storage';
import { clearSupabaseSession } from '@/lib/supabase-session';

/** Clear server cookies, client storage, and Supabase — then reload. */
export async function performClientLogout(): Promise<void> {
  await clearAuth(collectClientDeviceInfo());
  clearClientAuthSession();
  await clearSupabaseSession();
  window.location.reload();
}
