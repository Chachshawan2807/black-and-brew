import { describe, expect, test } from 'vitest';
import {
  computeVisualViewportInsets,
  KEYBOARD_OPEN_THRESHOLD_PX,
  nextLayoutHeightBaseline,
} from '@/lib/visual-viewport-insets';

describe('visual viewport insets', () => {
  test('detects keyboard via bottom inset on iOS overlay resize', () => {
    const insets = computeVisualViewportInsets({
      innerHeight: 800,
      innerWidth: 390,
      layoutHeightBaseline: 800,
      vv: {
        height: 500,
        width: 390,
        offsetTop: 12,
        offsetLeft: 0,
      },
    });

    expect(insets.bottomInset).toBeGreaterThan(KEYBOARD_OPEN_THRESHOLD_PX);
    expect(insets.isKeyboardOpen).toBe(true);
  });

  test('detects keyboard via layout height drop on Android resizes-content', () => {
    const baseline = nextLayoutHeightBaseline(0, 800);
    const insets = computeVisualViewportInsets({
      innerHeight: 480,
      innerWidth: 390,
      layoutHeightBaseline: baseline,
      vv: {
        height: 480,
        width: 390,
        offsetTop: 0,
        offsetLeft: 0,
      },
    });

    expect(insets.bottomInset).toBe(0);
    expect(insets.isKeyboardOpen).toBe(true);
    expect(insets.visibleHeight).toBe(480);
  });

  test('keyboard closed when layout height returns to baseline', () => {
    const baseline = nextLayoutHeightBaseline(0, 800);
    const insets = computeVisualViewportInsets({
      innerHeight: 800,
      innerWidth: 390,
      layoutHeightBaseline: baseline,
      vv: {
        height: 800,
        width: 390,
        offsetTop: 0,
        offsetLeft: 0,
      },
    });

    expect(insets.isKeyboardOpen).toBe(false);
  });
});
