import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useMobileBackLayer } from '@/hooks/use-mobile-back-layer';
import { createMobileBackHistoryState } from '@/lib/mobile-back-layer';

describe('useMobileBackLayer route navigation', () => {
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

  test('does not history.back when layer closes for in-app navigation', () => {
    const closingForNavigationRef = { current: false };

    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => {
        useMobileBackLayer('mobile-nav-drawer', active, vi.fn(), {
          closingForNavigationRef,
        });
      },
      { initialProps: { active: true } },
    );

    expect(window.history.pushState).toHaveBeenCalledWith(
      createMobileBackHistoryState('mobile-nav-drawer'),
      '',
    );
    vi.mocked(window.history.back).mockClear();

    closingForNavigationRef.current = true;
    rerender({ active: false });

    expect(window.history.back).not.toHaveBeenCalled();
    expect(closingForNavigationRef.current).toBe(false);
  });

  test('programmatic history.back from top overlay does not dismiss underlying overlay', () => {
    const dismissNotification = vi.fn();
    const dismissQuick = vi.fn();
    const stack: unknown[] = [{}];

    window.history.pushState = vi.fn((state) => {
      stack.push(state);
      Object.defineProperty(window.history, 'state', {
        configurable: true,
        value: state,
      });
    }) as typeof window.history.pushState;

    window.history.back = vi.fn(() => {
      if (stack.length <= 1) return;
      stack.pop();
      const state = stack[stack.length - 1];
      Object.defineProperty(window.history, 'state', {
        configurable: true,
        value: state,
      });
      window.dispatchEvent(new PopStateEvent('popstate', { state }));
    }) as typeof window.history.back;

    const { rerender: rerenderNotification } = renderHook(
      ({ active }: { active: boolean }) => {
        useMobileBackLayer('notification-panel', active, dismissNotification);
      },
      { initialProps: { active: true } },
    );

    const { rerender: rerenderQuick } = renderHook(
      ({ active }: { active: boolean }) => {
        useMobileBackLayer('quick-action-overlay', active, dismissQuick);
      },
      { initialProps: { active: true } },
    );

    expect(stack).toHaveLength(3);

    rerenderQuick({ active: false });

    expect(window.history.back).toHaveBeenCalledTimes(1);
    expect(dismissQuick).not.toHaveBeenCalled();
    expect(dismissNotification).not.toHaveBeenCalled();

    rerenderNotification({ active: false });
  });

  test('history.back when layer closes via UI dismiss (not navigation)', () => {
    const closingForNavigationRef = { current: false };

    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => {
        useMobileBackLayer('mobile-nav-drawer', active, vi.fn(), {
          closingForNavigationRef,
        });
      },
      { initialProps: { active: true } },
    );

    vi.mocked(window.history.back).mockClear();
    rerender({ active: false });

    expect(window.history.back).toHaveBeenCalledTimes(1);
  });
});
