import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  getScheduleShiftPickerMaxHeight,
  getScheduleShiftPickerPosition,
} from '@/lib/schedule/shift-picker-position';
import { VIEWPORT_EDGE_GAP } from '@/lib/floating-position';

function mockViewport(width: number, height: number) {
  vi.stubGlobal('window', {
    innerWidth: width,
    innerHeight: height,
    visualViewport: null,
  });
}

describe('getScheduleShiftPickerPosition', () => {
  beforeEach(() => {
    mockViewport(390, 844);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('opens below anchor when there is room for the full menu', () => {
    const menuWidth = 192;
    const menuHeight = 320;
    const anchorX = 120;
    const anchorY = 200;

    const { left, top } = getScheduleShiftPickerPosition(
      anchorX,
      anchorY,
      menuWidth,
      menuHeight,
    );

    expect(top).toBe(anchorY + 12);
    expect(left).toBe(anchorX);
    expect(top + menuHeight).toBeLessThanOrEqual(844 - VIEWPORT_EDGE_GAP);
  });

  test('slides upward when anchor is near the bottom so the menu stays inside the viewport', () => {
    const menuWidth = 192;
    const menuHeight = 360;
    const anchorY = 800;

    const { top } = getScheduleShiftPickerPosition(100, anchorY, menuWidth, menuHeight);

    expect(top).toBeLessThan(anchorY + 12);
    expect(top + menuHeight).toBeLessThanOrEqual(844 - VIEWPORT_EDGE_GAP);
    expect(top).toBeGreaterThanOrEqual(VIEWPORT_EDGE_GAP);
  });

  test('keeps horizontal position inside the viewport', () => {
    const menuWidth = 192;
    const menuHeight = 280;
    const { left } = getScheduleShiftPickerPosition(380, 300, menuWidth, menuHeight);

    expect(left).toBeGreaterThanOrEqual(VIEWPORT_EDGE_GAP);
    expect(left + menuWidth).toBeLessThanOrEqual(390 - VIEWPORT_EDGE_GAP);
  });

  test('max height spans from menu top to the bottom of the viewport', () => {
    const menuTop = 120;
    const maxHeight = getScheduleShiftPickerMaxHeight(menuTop);

    expect(maxHeight).toBe(844 - VIEWPORT_EDGE_GAP - menuTop);
  });
});