import type { InventoryNotification } from '@/lib/notification-types';

export type TimeGroupKey = 'today' | 'yesterday' | 'earlier';

export function getTimeGroupKey(iso: string, now = new Date()): TimeGroupKey {
  const date = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) return 'today';
  if (date >= startOfYesterday) return 'yesterday';
  return 'earlier';
}

export function groupNotificationsByTime(
  notifications: InventoryNotification[],
  locale: string
): { key: TimeGroupKey; label: string; items: InventoryNotification[] }[] {
  const isTh = locale === 'th';
  const labels: Record<TimeGroupKey, string> = {
    today: isTh ? 'วันนี้' : 'Today',
    yesterday: isTh ? 'เมื่อวาน' : 'Yesterday',
    earlier: isTh ? 'ก่อนหน้า' : 'Earlier',
  };

  const buckets: Record<TimeGroupKey, InventoryNotification[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  for (const n of notifications) {
    buckets[getTimeGroupKey(n.occurredAt)].push(n);
  }

  return (['today', 'yesterday', 'earlier'] as TimeGroupKey[])
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({ key, label: labels[key], items: buckets[key] }));
}

export function formatNotificationTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(iso));
}
