import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  isAppMainVisuallyEmpty,
  subscribePwaForegroundResume,
} from '@/lib/pwa-empty-main-recovery';

describe('pwa empty main recovery', () => {
  test('isAppMainVisuallyEmpty returns true for empty main', () => {
    const main = document.createElement('main');
    main.id = 'app-main';
    expect(isAppMainVisuallyEmpty(main)).toBe(true);
  });

  test('isAppMainVisuallyEmpty returns false when interactive content exists', () => {
    const main = document.createElement('main');
    const button = document.createElement('button');
    button.textContent = 'บันทึก';
    main.appendChild(button);
    expect(isAppMainVisuallyEmpty(main)).toBe(false);
  });

  test('isAppMainVisuallyEmpty returns false for loading shimmer', () => {
    const main = document.createElement('main');
    const shimmer = document.createElement('div');
    shimmer.className = 'bb-shimmer';
    main.appendChild(shimmer);
    expect(isAppMainVisuallyEmpty(main)).toBe(false);
  });
});

describe('subscribePwaForegroundResume', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('calls onResume on persisted pageshow', () => {
    const onResume = vi.fn();
    const pageshowHandlers: Array<(event: PageTransitionEvent) => void> = [];
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      if (type === 'pageshow' && typeof listener === 'function') {
        pageshowHandlers.push(listener as (event: PageTransitionEvent) => void);
      }
    });
    vi.spyOn(document, 'addEventListener').mockImplementation(() => {});

    subscribePwaForegroundResume(onResume);
    pageshowHandlers[0]?.({ persisted: true } as PageTransitionEvent);

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  test('calls onResume on visibilitychange when document is visible', () => {
    const onResume = vi.fn();
    const visibilityHandlers: Array<() => void> = [];
    vi.spyOn(window, 'addEventListener').mockImplementation(() => {});
    vi.spyOn(document, 'addEventListener').mockImplementation((type, listener) => {
      if (type === 'visibilitychange' && typeof listener === 'function') {
        visibilityHandlers.push(listener as () => void);
      }
    });

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    subscribePwaForegroundResume(onResume);
    visibilityHandlers[0]?.();

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  test('unsubscribe removes listeners', () => {
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    vi.spyOn(window, 'addEventListener').mockImplementation(() => {});
    vi.spyOn(document, 'addEventListener').mockImplementation(() => {});

    const unsubscribe = subscribePwaForegroundResume(() => {});
    unsubscribe();

    expect(removeWindow).toHaveBeenCalledWith('pageshow', expect.any(Function));
    expect(removeDocument).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
  });
});
