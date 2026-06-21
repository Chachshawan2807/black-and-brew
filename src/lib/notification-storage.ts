import {
  MAX_STORED_NOTIFICATIONS,
  NOTIFICATION_CLEAR_WATERMARK_KEY,
  NOTIFICATION_STORAGE_KEY,
  type InventoryNotification,
} from '@/lib/notification-types';

export function loadStoredNotifications(): InventoryNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InventoryNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredNotifications(notifications: InventoryNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = notifications.slice(0, MAX_STORED_NOTIFICATIONS);
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

export function loadNotificationClearWatermark(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(NOTIFICATION_CLEAR_WATERMARK_KEY);
  } catch {
    return null;
  }
}

export function saveNotificationClearWatermark(value: string = new Date().toISOString()): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATION_CLEAR_WATERMARK_KEY, value);
  } catch {
    // ignore
  }
}

export function isAfterNotificationClearWatermark(
  occurredAt: string,
  clearWatermark: string | null = loadNotificationClearWatermark(),
): boolean {
  if (!clearWatermark) return true;
  return occurredAt > clearWatermark;
}

export function countUnread(notifications: InventoryNotification[]): number {
  return notifications.filter((n) => !n.read).length;
}
