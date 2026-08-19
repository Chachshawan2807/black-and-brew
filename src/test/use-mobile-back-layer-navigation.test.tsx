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
