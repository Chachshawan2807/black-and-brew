import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { getAnchoredFloatingPosition } from '@/lib/floating-position';

function mockViewport(width: number, height: number) {
  vi.stubGlobal('window', {
    innerWidth: width,
    innerHeight: height,
    visualViewport: null,
  });
}

describe('getAnchoredFloatingPosition', () => {
  beforeEach(() => {
    mockViewport(400, 800);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('keeps alert fully inside viewport when anchor is near the right edge', () => {
    const width = 280;
    const height = 44;
    const { left, top } = getAnchoredFloatingPosition(390, 200, width, height);

    expect(left).toBeGreaterThanOrEqual(12);
    expect(left + width).toBeLessThanOrEqual(400 - 12);
    expect(top).toBeGreaterThanOrEqual(12);
    expect(top + height).toBeLessThanOrEqual(800 - 12);
  });

  test('keeps alert fully inside viewport when anchor is near the left edge', () => {
    const width = 280;
    const height = 44;
    const { left } = getAnchoredFloatingPosition(10, 200, width, height);

    expect(left).toBeGreaterThanOrEqual(12);
    expect(left + width).toBeLessThanOrEqual(400 - 12);
  });

  test('centers horizontally when there is enough space', () => {
    const width = 200;
    const height = 44;
    const { left } = getAnchoredFloatingPosition(200, 300, width, height);

    expect(left).toBe(100);
  });

  test('places alert below anchor when there is not enough space above', () => {
    const width = 200;
    const height = 44;
    const anchorY = 20;
    const { top } = getAnchoredFloatingPosition(200, anchorY, width, height);

    expect(top).toBeGreaterThan(anchorY);
  });
});
