import { describe, expect, test } from 'vitest';
import {
  getFabPanelKeyboardAwareStyle,
  getModalBackdropKeyboardAwareStyle,
  getModalContentKeyboardAwareStyle,
} from '@/lib/keyboard-aware-panel-style';

const keyboardInsets = {
  bottomInset: 280,
  offsetTop: 0,
  visibleHeight: 420,
  isKeyboardOpen: true,
};

const closedInsets = {
  bottomInset: 0,
  offsetTop: 0,
  visibleHeight: 700,
  isKeyboardOpen: false,
};

describe('keyboard-aware panel styles', () => {
  test('FAB panel anchors above keyboard when keyboard is open', () => {
    const style = getFabPanelKeyboardAwareStyle({
      insets: keyboardInsets,
    });

    expect(style.bottom).toBe(288);
    expect(style.top).toBeUndefined();
    expect(style.maxHeight).toBe(404);
    expect(style.maxHeight).toBeLessThanOrEqual(
      keyboardInsets.visibleHeight - 8 - 8,
    );
  });

  test('FAB panel keeps default max-height when keyboard is closed', () => {
    const style = getFabPanelKeyboardAwareStyle({
      insets: closedInsets,
    });

    expect(style.bottom).toBeUndefined();
    expect(style.top).toBeUndefined();
    expect(style.maxHeight).toBe('min(75vh, calc(100dvh - 12rem))');
  });

  test('modal backdrop shifts into visible viewport when keyboard is open', () => {
    const backdrop = getModalBackdropKeyboardAwareStyle({
      insets: keyboardInsets,
    });
    const content = getModalContentKeyboardAwareStyle({
      insets: keyboardInsets,
    });

    expect(backdrop.alignItems).toBe('flex-start');
    expect(backdrop.height).toBe(420);
    expect(content.maxHeight).toBe(396);
  });
});
