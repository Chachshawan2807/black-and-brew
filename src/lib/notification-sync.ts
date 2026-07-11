import {
  MAX_STORED_NOTIFICATIONS,
  type InventoryNotification,
} from '@/lib/notification-types';
import {
  countUnread,
  isAfterNotificationClearWatermark,
  saveStoredNotifications,
} from '@/lib/notification-storage';
import {
  loadMergedStoredNotifications,
  loadUnreadCounterFromIdb,
  mirrorNotificationsToIdb,
  saveUnreadCounterToIdb,
} from '@/lib/notification-idb';
import {
  loadUnreadCounter,
  saveUnreadCounter,
} from '@/lib/notification-unread-counter';

export function prependToNotificationList(
  list: InventoryNotification[],
  notification: InventoryNotification,
): { list: InventoryNotification[]; unreadCount: number; isNewNotification: boolean } {
  const isNewNotification = !list.some((n) => n.logId === notification.logId);
  const deduped = list.filter((n) => n.logId !== notification.logId);
  const next = [notification, ...deduped].slice(0, MAX_STORED_NOTIFICATIONS);
  return { list: next, unreadCount: countUnread(next), isNewNotification };
}

export function mergeNotificationLists(
  ...lists: InventoryNotification[][]
): InventoryNotification[] {
  const byLogId = new Map<string, InventoryNotification>();

  for (const list of lists) {
    for (const item of list) {
      const existing = byLogId.get(item.logId);
      if (!existing) {
        byLogId.set(item.logId, item);
        continue;
      }

      const newer = item.occurredAt >= existing.occurredAt ? item : existing;
      const older = newer === item ? existing : item;
      byLogId.set(item.logId, {
        ...older,
        ...newer,
        read: older.read && newer.read,
      });
    }
  }

  return Array.from(byLogId.values())
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, MAX_STORED_NOTIFICATIONS);
}

async function resolveHydratedUnreadCount(notifications: InventoryNotification[]): Promise<number> {
  const listUnread = countUnread(notifications);
  const idbCounter = await loadUnreadCounterFromIdb();
  const localCounter = loadUnreadCounter();
  const reconciled = Math.max(localCounter, idbCounter, listUnread);
  saveUnreadCounter(reconciled);
  await saveUnreadCounterToIdb(reconciled);
  return reconciled;
}

/** Read merged local + IDB notifications without writing (safe for cross-tab storage events). */
export async function readNotificationState(): Promise<{
  notifications: InventoryNotification[];
  unreadCount: number;
}> {
  const merged = (await loadMergedStoredNotifications()).filter((item) =>
    isAfterNotificationClearWatermark(item.occurredAt),
  );
  return { notifications: merged, unreadCount: await resolveHydratedUnreadCount(merged) };
}

/** Load merged local + IDB notifications and mirror to both stores. */
export async function hydrateNotificationState(): Promise<{
  notifications: InventoryNotification[];
  unreadCount: number;
}> {
  const merged = (await loadMergedStoredNotifications()).filter((item) =>
    isAfterNotificationClearWatermark(item.occurredAt),
  );
  saveStoredNotifications(merged);
  await mirrorNotificationsToIdb(merged);
  return { notifications: merged, unreadCount: await resolveHydratedUnreadCount(merged) };
}
