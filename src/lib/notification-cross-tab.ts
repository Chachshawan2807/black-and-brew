import { NOTIFICATION_STORAGE_KEY } from '@/lib/notification-types';
import { UNREAD_COUNTER_KEY } from '@/lib/notification-unread-counter';

export function isNotificationStorageKey(key: string | null): boolean {
  return key === NOTIFICATION_STORAGE_KEY || key === UNREAD_COUNTER_KEY;
}

/**
 * Keep FAB / panel in sync across tabs on the same device (desktop + mobile browsers).
 * Cross-device sync uses Supabase Realtime + Web Push instead.
 */
export function subscribeNotificationSync(onSync: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const onStorage = (event: StorageEvent) => {
    if (isNotificationStorageKey(event.key)) onSync();
  };

  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
