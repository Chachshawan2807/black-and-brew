import { describe, expect, test } from 'vitest';
import type { InventoryNotification } from '@/lib/notification-types';
import {
  mergeNotificationLists,
  prependToNotificationList,
  replaceNotificationByDedupeKey,
  removeNotificationByDedupeKey,
} from '@/lib/notification-sync';

function sampleNotification(
  overrides: Partial<InventoryNotification> = {},
): InventoryNotification {
  return {
    id: 'log-1',
    logId: 'log-1',
    action: 'UPDATE',
    entityId: 'item-1',
    entityLabel: 'กาแฟ',
    actorLabel: 'ผู้ใช้งาน',
    occurredAt: '2026-06-16T10:00:00.000Z',
    title: 'รับเข้า: กาแฟ',
    summary: 'รับ 2',
    fieldSummary: 'stock',
    priority: 'normal',
    read: false,
    batchedCount: 1,
    metadata: {},
    ...overrides,
  };
}

describe('notification-sync', () => {
  test('prependToNotificationList dedupes by logId and counts unread', () => {
    const existing = [sampleNotification({ logId: 'log-2', id: 'log-2' })];
    const incoming = sampleNotification({ logId: 'log-1' });

    const { list, unreadCount } = prependToNotificationList(existing, incoming);

    expect(list).toHaveLength(2);
    expect(list[0].logId).toBe('log-1');
    expect(unreadCount).toBe(2);
  });

  test('prependToNotificationList replaces duplicate logId', () => {
    const existing = [sampleNotification({ summary: 'old' })];
    const incoming = sampleNotification({ summary: 'new' });

    const { list, unreadCount } = prependToNotificationList(existing, incoming);

    expect(list).toHaveLength(1);
    expect(list[0].summary).toBe('new');
    expect(unreadCount).toBe(1);
  });

  test('mergeNotificationLists keeps unread when either copy is unread', () => {
    const local = [sampleNotification({ read: true })];
    const remote = [sampleNotification({ read: false, summary: 'from push' })];

    const merged = mergeNotificationLists(local, remote);

    expect(merged).toHaveLength(1);
    expect(merged[0].summary).toBe('from push');
    expect(merged[0].read).toBe(false);
  });

  test('replaceNotificationByDedupeKey preserves read state when digest updates', () => {
    const existing = [
      sampleNotification({
        logId: 'bb-insight-daily_digest-2026-08-11',
        id: 'bb-insight-daily_digest-2026-08-11',
        read: true,
        summary: 'ออเดอร์เมล็ดค้าง: ค้างชำระเงิน 2 รายการ',
        metadata: { kind: 'proactive_insight' },
      }),
    ];
    const incoming = sampleNotification({
      logId: 'bb-insight-daily_digest-2026-08-11',
      id: 'bb-insight-daily_digest-2026-08-11',
      read: false,
      summary: 'ออเดอร์เมล็ดค้าง: ค้างชำระเงิน 1 รายการ',
      metadata: { kind: 'proactive_insight' },
    });

    const { list, replaced } = replaceNotificationByDedupeKey(existing, incoming);

    expect(replaced).toBe(true);
    expect(list).toHaveLength(1);
    expect(list[0].summary).toBe('ออเดอร์เมล็ดค้าง: ค้างชำระเงิน 1 รายการ');
    expect(list[0].read).toBe(true);
  });

  test('removeNotificationByDedupeKey drops cleared digest notifications', () => {
    const existing = [
      sampleNotification({
        logId: 'bb-insight-daily_digest-2026-08-11',
        id: 'bb-insight-daily_digest-2026-08-11',
      }),
      sampleNotification({ logId: 'log-2', id: 'log-2' }),
    ];

    const { list, removed } = removeNotificationByDedupeKey(
      existing,
      'bb-insight-daily_digest-2026-08-11',
    );

    expect(removed).toBe(true);
    expect(list).toHaveLength(1);
    expect(list[0].logId).toBe('log-2');
  });

  test('mergeNotificationLists sorts by occurredAt descending', () => {
    const a = [sampleNotification({ logId: 'a', occurredAt: '2026-06-16T09:00:00.000Z' })];
    const b = [
      sampleNotification({
        logId: 'b',
        id: 'b',
        occurredAt: '2026-06-16T11:00:00.000Z',
      }),
    ];

    const merged = mergeNotificationLists(a, b);

    expect(merged[0].logId).toBe('b');
    expect(merged[1].logId).toBe('a');
  });
});
