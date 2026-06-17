import { describe, expect, test, vi } from 'vitest';
import {
  clampAppBadgeCount,
  canUseAppBadgeApi,
  isInstalledPwa,
} from '@/lib/pwa-app-badge';

describe('pwa-app-badge', () => {
  test('clampAppBadgeCount bounds to 0–99', () => {
    expect(clampAppBadgeCount(-3)).toBe(0);
    expect(clampAppBadgeCount(0)).toBe(0);
    expect(clampAppBadgeCount(5)).toBe(5);
    expect(clampAppBadgeCount(99)).toBe(99);
    expect(clampAppBadgeCount(150)).toBe(99);
    expect(clampAppBadgeCount(3.7)).toBe(3);
  });

  test('canUseAppBadgeApi detects setAppBadge support', () => {
    const original = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { setAppBadge: async () => {}, clearAppBadge: async () => {} },
      configurable: true,
    });
    expect(canUseAppBadgeApi()).toBe(true);
    Object.defineProperty(globalThis, 'navigator', {
      value: original,
      configurable: true,
    });
  });

  test('isInstalledPwa detects standalone display mode', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    Object.defineProperty(globalThis, 'matchMedia', { value: matchMedia, configurable: true });
    expect(isInstalledPwa()).toBe(true);
  });
});
