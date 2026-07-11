import { describe, expect, test } from 'vitest';
import type { InventoryNotification } from '@/lib/notification-types';
import { MAX_STORED_NOTIFICATIONS } from '@/lib/notification-types';
import { prependToNotificationList } from '@/lib/notification-sync';

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

describe('prependToNotificationList counter hints', () => {
  test('flags brand-new notifications for unread counter increment', () => {
    const existing = [sampleNotification({ logId: 'log-2', id: 'log-2' })];
    const incoming = sampleNotification({ logId: 'log-1' });

    const result = prependToNotificationList(existing, incoming);

    expect(result.isNewNotification).toBe(true);
    expect(result.unreadCount).toBe(2);
  });

  test('does not flag duplicate logId replacements as new', () => {
    const existing = [sampleNotification({ summary: 'old' })];
    const incoming = sampleNotification({ summary: 'new' });

    const result = prependToNotificationList(existing, incoming);

    expect(result.isNewNotification).toBe(false);
    expect(result.unreadCount).toBe(1);
  });

  test('trimming stored list keeps unread count at list ceiling', () => {
    const existing = Array.from({ length: MAX_STORED_NOTIFICATIONS }, (_, index) =>
      sampleNotification({
        logId: `log-${index}`,
        id: `log-${index}`,
        occurredAt: `2026-06-16T10:${String(index).padStart(2, '0')}:00.000Z`,
      }),
    );
    const incoming = sampleNotification({
      logId: 'log-new',
      id: 'log-new',
      occurredAt: '2026-06-16T12:00:00.000Z',
    });

    const result = prependToNotificationList(existing, incoming);

    expect(result.list).toHaveLength(MAX_STORED_NOTIFICATIONS);
    expect(result.unreadCount).toBe(MAX_STORED_NOTIFICATIONS);
    expect(result.isNewNotification).toBe(true);
  });
});
