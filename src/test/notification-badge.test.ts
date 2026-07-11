import { describe, expect, test } from 'vitest';
import {
  formatInAppBadgeLabel,
  getInAppBadgeClassName,
  IN_APP_BADGE_OVERFLOW,
} from '@/lib/notification-badge';

describe('notification-badge', () => {
  test('formatInAppBadgeLabel shows exact count without 99+ cap', () => {
    expect(formatInAppBadgeLabel(1)).toBe('1');
    expect(formatInAppBadgeLabel(50)).toBe('50');
    expect(formatInAppBadgeLabel(150)).toBe('150');
    expect(formatInAppBadgeLabel(999)).toBe('999');
  });

  test('formatInAppBadgeLabel uses overflow suffix only at extreme counts', () => {
    expect(formatInAppBadgeLabel(IN_APP_BADGE_OVERFLOW)).toBe(String(IN_APP_BADGE_OVERFLOW));
    expect(formatInAppBadgeLabel(IN_APP_BADGE_OVERFLOW + 1)).toBe(`${IN_APP_BADGE_OVERFLOW}+`);
    expect(formatInAppBadgeLabel(0)).toBe('');
  });

  test('getInAppBadgeClassName scales down for wider counts', () => {
    expect(getInAppBadgeClassName(5)).toContain('text-[10px]');
    expect(getInAppBadgeClassName(50)).toContain('text-[9px]');
    expect(getInAppBadgeClassName(500)).toContain('text-[9px]');
    expect(getInAppBadgeClassName(1500)).toContain('text-[8px]');
  });
});
