import { describe, expect, test } from 'vitest';
import { shouldIncludeInTrackingSync } from '@/lib/bean-orders/sync-tracking';

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
