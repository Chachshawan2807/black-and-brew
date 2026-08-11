import { clearAuth } from '@/app/actions/auth';
import { clearClientAuthSession } from '@/lib/client-auth-storage';
import { collectClientDeviceInfo } from '@/lib/client-device-info';
import { NOTIFICATION_IDB_NAME } from '@/lib/notification-idb';
import { OFFLINE_MUTATION_DB_NAME } from '@/lib/offline-mutation-types';
import { clearSupabaseSession } from '@/lib/supabase-session';

export const PWA_KNOWN_IDB_NAMES = [
  NOTIFICATION_IDB_NAME,
  OFFLINE_MUTATION_DB_NAME,
] as const;

export async function deleteIndexedDatabase(name: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    const finish = () => resolve();
    request.onsuccess = finish;
    request.onerror = finish;
    request.onblocked = finish;
  });
}

export async function deleteAllCacheStorage(): Promise<number> {
  if (typeof caches === 'undefined') return 0;

  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    return keys.length;
  } catch {
    return 0;
  }
}

export async function unregisterAllServiceWorkers(): Promise<number> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return 0;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    return registrations.length;
  } catch {
    return 0;
  }
}

export function clearWebStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // Private browsing or storage disabled
  }
}

/** Wipe client storage the app controls, then allow a clean PWA install overlay. */
export async function prepareFreshPwaInstall(): Promise<void> {
  clearClientAuthSession();

  await clearSupabaseSession();

  try {
    await clearAuth(collectClientDeviceInfo());
  } catch {
    // Non-fatal when cookies are already absent on the PIN screen
  }

  await Promise.all([
    deleteAllCacheStorage(),
    ...PWA_KNOWN_IDB_NAMES.map((name) => deleteIndexedDatabase(name)),
  ]);

  clearWebStorage();
  await unregisterAllServiceWorkers();
}
