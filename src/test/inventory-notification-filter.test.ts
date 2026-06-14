import { describe, expect, test } from 'vitest';
import { isSuppressedInventoryNotification } from '@/lib/inventory-notification-filter';

describe('isSuppressedInventoryNotification', () => {
  test('allows inventory count context (stock-taking)', () => {
    expect(
      isSuppressedInventoryNotification({ notificationContext: 'inventory_count' })
    ).toBe(false);
  });

  test('suppresses explicit flag only', () => {
    expect(isSuppressedInventoryNotification({ suppressNotification: true })).toBe(true);
  });

  test('allows normal inventory changes', () => {
    expect(
      isSuppressedInventoryNotification({ notificationContext: 'inventory', operation: 'set_stock' })
    ).toBe(false);
  });
});
