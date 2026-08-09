import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { shouldIncludeInTrackingSync } from '@/lib/bean-orders/sync-tracking';

const beanOrdersListPagePath = resolve(
  __dirname,
  '../app/[locale]/bean-orders/page.tsx',
);

describe('shouldIncludeInTrackingSync', () => {
  test('includes null tracking_status (cron must not skip these rows)', () => {
    expect(shouldIncludeInTrackingSync(null)).toBe(true);
  });

  test('includes in_transit and pending statuses', () => {
    expect(shouldIncludeInTrackingSync('in_transit')).toBe(true);
    expect(shouldIncludeInTrackingSync('pending')).toBe(true);
  });

  test('excludes delivered', () => {
    expect(shouldIncludeInTrackingSync('delivered')).toBe(false);
    expect(shouldIncludeInTrackingSync('Delivered')).toBe(false);
  });
});

describe('bean orders list page tracking refresh', () => {
  test('syncs stale shipments before fetchBeanOrders on page load', () => {
    const source = readFileSync(beanOrdersListPagePath, 'utf-8');
    expect(source).toContain('syncStaleBeanOrderTrackingStatuses');
    expect(source).toMatch(/syncStaleBeanOrderTrackingStatuses[\s\S]*fetchBeanOrders/);
  });
});
