import { describe, expect, test } from 'vitest';
import {
  getFabPanelKeyboardAwareStyle,
  getModalBackdropKeyboardAwareStyle,
  getModalContentKeyboardAwareStyle,
  getMobileQuickActionKeyboardSheetBackdropStyle,
  getMobileQuickActionKeyboardSheetPanelStyle,
} from '@/lib/keyboard-aware-panel-style';

const keyboardInsets = {
  bottomInset: 280,
  offsetTop: 12,
  offsetLeft: 24,
  visibleHeight: 420,
  visibleWidth: 342,
  isKeyboardOpen: true,
};

const closedInsets = {
  bottomInset: 0,
  offsetTop: 0,
  offsetLeft: 0,
  visibleHeight: 700,
  visibleWidth: 390,
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

  test('modal backdrop can vertically center inside visible viewport when keyboard is open', () => {
    const backdrop = getModalBackdropKeyboardAwareStyle({
      insets: keyboardInsets,
      verticalAlign: 'center',
    });

    expect(backdrop.alignItems).toBe('center');
    expect(backdrop.top).toBe(12);
    expect(backdrop.height).toBe(420);
  });

  test('modal backdrop shifts into visible viewport when keyboard is open', () => {
    const backdrop = getModalBackdropKeyboardAwareStyle({
      insets: keyboardInsets,
    });
    const content = getModalContentKeyboardAwareStyle({
      insets: keyboardInsets,
    });

    expect(backdrop.alignItems).toBe('flex-start');
    expect(backdrop.top).toBe(12);
    expect(backdrop.bottom).toBe('auto');
    expect(backdrop.left).toBe(24);
    expect(backdrop.right).toBe('auto');
    expect(backdrop.width).toBe(342);
    expect(backdrop.height).toBe(420);
    expect(content.maxHeight).toBe(396);
  });

  test('modal backdrop uses visual viewport horizontal bounds on iOS keyboard pan', () => {
    const backdrop = getModalBackdropKeyboardAwareStyle({
      insets: keyboardInsets,
    });

    expect(backdrop.left).toBe(keyboardInsets.offsetLeft);
    expect(backdrop.width).toBe(keyboardInsets.visibleWidth);
    expect(backdrop.right).toBe('auto');
  });

  test('mobile quick action sheet anchors to the visual viewport', () => {
    const backdrop = getMobileQuickActionKeyboardSheetBackdropStyle(keyboardInsets);
    const panel = getMobileQuickActionKeyboardSheetPanelStyle(keyboardInsets);

    expect(backdrop.position).toBe('fixed');
    expect(backdrop.top).toBe(12);
    expect(backdrop.left).toBe(24);
    expect(backdrop.width).toBe(342);
    expect(backdrop.bottom).toBe('auto');
    expect(backdrop.height).toBe(420);
    expect(panel.maxHeight).toBe(404);
  });
});
