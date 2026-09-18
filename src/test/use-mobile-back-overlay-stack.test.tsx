import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useMobileBackOverlayStack } from '@/hooks/use-mobile-back-overlay-stack';
import { createMobileBackHistoryState } from '@/lib/mobile-back-layer';

describe('useMobileBackOverlayStack', () => {
  const originalPushState = window.history.pushState;
  const originalBack = window.history.back;

  beforeEach(() => {
    window.history.pushState = vi.fn((state) => {
      Object.defineProperty(window.history, 'state', {
        configurable: true,
        value: state,
      });
    }) as typeof window.history.pushState;
    window.history.back = vi.fn() as typeof window.history.back;
  });

  afterEach(() => {
    window.history.pushState = originalPushState;
    window.history.back = originalBack;
    vi.restoreAllMocks();
  });

  test('dismisses only the first active layer in stack order', () => {
    const dismissTop = vi.fn();
    const dismissBottom = vi.fn();

    renderHook(() =>
      useMobileBackOverlayStack('inventory-overlay', [
        { active: true, dismiss: dismissTop },
        { active: true, dismiss: dismissBottom },
      ]),
    );

    window.dispatchEvent(
      new PopStateEvent('popstate', {
        state: createMobileBackHistoryState('notification-panel'),
      }),
    );

    expect(dismissTop).toHaveBeenCalledTimes(1);
    expect(dismissBottom).not.toHaveBeenCalled();
  });
});
