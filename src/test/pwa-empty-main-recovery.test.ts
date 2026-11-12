import { describe, expect, test } from 'vitest';
import { isAppMainVisuallyEmpty } from '@/lib/pwa-empty-main-recovery';

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
