import { describe, expect, test } from 'vitest';
import { isSuppressedInventoryNotification } from '@/lib/inventory-notification-filter';

describe('isSuppressedInventoryNotification', () => {
  test('suppresses inventory count context', () => {
    expect(
      isSuppressedInventoryNotification({ notificationContext: 'inventory_count' })
    ).toBe(true);
  });

  test('suppresses explicit flag', () => {
    expect(isSuppressedInventoryNotification({ suppressNotification: true })).toBe(true);
  });

  test('allows normal inventory changes', () => {
    expect(
      isSuppressedInventoryNotification({ notificationContext: 'inventory', operation: 'set_stock' })
    ).toBe(false);
  });
});
