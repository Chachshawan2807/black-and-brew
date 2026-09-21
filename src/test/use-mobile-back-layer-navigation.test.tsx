import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useMobileBackLayer } from '@/hooks/use-mobile-back-layer';
import {
  createMobileBackHistoryState,
  resetMobileBackLayerRuntimeForTests,
} from '@/lib/mobile-back-layer';

function mockCoarsePointer(matches: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('useMobileBackLayer route navigation', () => {
  const originalPushState = window.history.pushState;
  const originalBack = window.history.back;

  beforeEach(() => {
    resetMobileBackLayerRuntimeForTests();
    mockCoarsePointer(true);
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

  test('does not history.back when the layer remounts while still active', async () => {
    const dismiss = vi.fn();
    const { unmount } = renderHook(() => {
      useMobileBackLayer('home-overlay', true, dismiss);
    });

    expect(window.history.pushState).toHaveBeenCalledTimes(1);
    vi.mocked(window.history.back).mockClear();

    unmount();
    renderHook(() => {
      useMobileBackLayer('home-overlay', true, dismiss);
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(window.history.back).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
    expect(window.history.pushState).toHaveBeenCalledTimes(1);
  });

  test('edge swipe popstate still dismisses after remount while active', async () => {
    const dismiss = vi.fn();
    const { unmount } = renderHook(() => {
      useMobileBackLayer('home-overlay', true, dismiss);
    });

    unmount();
    renderHook(() => {
      useMobileBackLayer('home-overlay', true, dismiss);
    });
    await Promise.resolve();

    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));

    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  test('does not history.back after a true unmount while the overlay was still active', async () => {
    const { unmount } = renderHook(() => {
      useMobileBackLayer('home-overlay', true, vi.fn());
    });

    vi.mocked(window.history.back).mockClear();
    unmount();
    await Promise.resolve();
    await Promise.resolve();

    expect(window.history.back).not.toHaveBeenCalled();
  });

  test('does not push or pop history on fine-pointer desktop', async () => {
    mockCoarsePointer(false);
    const dismiss = vi.fn();

    const { rerender, unmount } = renderHook(
      ({ active }: { active: boolean }) => {
        useMobileBackLayer('home-overlay', active, dismiss);
      },
      { initialProps: { active: true } },
    );

    expect(window.history.pushState).not.toHaveBeenCalled();

    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    expect(dismiss).not.toHaveBeenCalled();

    rerender({ active: false });
    expect(window.history.back).not.toHaveBeenCalled();

    rerender({ active: true });
    unmount();
    await Promise.resolve();
    expect(window.history.back).not.toHaveBeenCalled();
  });
});
